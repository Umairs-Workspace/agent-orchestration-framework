import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile, readFile, rm, realpath } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { compilePhaseBrief, PHASE_BRIEF_MAX_CHARS } from '@aof/work/phase-brief';
import { compileBriefForItem } from '@aof/work/phase-brief-read';
import { createStoryContractDeriver } from '@aof/work/story-contract-derive';
import { mapToken } from '@aof/work/examples/map';
import { createExampleAnswers } from '@aof/work/examples/answers';
import { partitionReadySetByDeclaredFiles } from '@aof/work/ready-wave';
import { createMigrateFolderCommand } from '@aof/work/commands/migrate-folder';
import { createDiagramFileCommand } from '@aof/work/commands/diagram/file';
import { createWorkContribution } from '@aof/work/commands';
import { createCommandRegistry } from '@aof/contracts/commands';

async function fixture(t) {
  const parent = await realpath(os.tmpdir());
  const root = await mkdtemp(path.join(parent, 'aof-work-domain-'));
  t.after(async () => { assert.equal(path.dirname(await realpath(root)), parent); await rm(root, { recursive: true, force: true }); });
  return root;
}

test('brief reads use supplied item paths and the compiler remains bounded', async t => {
  const root = await fixture(t);
  const story = path.join(root, 'stories', '00_story_fixture');
  await mkdir(path.join(story, 'tasks'), { recursive: true });
  await writeFile(path.join(root, 'SPEC.md'), '# Fixture\n\n## Objective\n\nPreserve the contract.\n');
  await writeFile(path.join(story, 'STORY.md'), '# Story\n\n## User story\n\nRead the supplied stream.\n');
  const brief = await compileBriefForItem({ itemRef: '01/00', phase: 'continue', itemType: 'story', itemDir: story, milestoneDir: root });
  assert.ok(brief);
  assert.match(JSON.stringify(brief), /01\/00/);
  assert.match(JSON.stringify(brief), /Read the supplied stream/);
  assert.throws(() => compilePhaseBrief({}), /no item ref/);
  assert.ok(brief.text.length <= PHASE_BRIEF_MAX_CHARS);
  const bounded = compilePhaseBrief({ itemRef: "01/00", phase: "continue", story: "x".repeat(PHASE_BRIEF_MAX_CHARS * 2) });
  assert.ok(bounded.text.length <= PHASE_BRIEF_MAX_CHARS);
});

test('contract proposals use the supplied knowledge services without guessing unknown coupling', () => {
  let impacts = 0;
  const services = {
    graphJsonPath: root => path.join(root, 'graph.json'),
    graphArtifactBuiltAt: () => '2026-09-29',
    readGraph: () => ({ fixture: true }), normalizeGraph: value => value,
    computeImpact: () => { impacts++; return [{ file: 'src/a.mjs', present: false }]; },
  };
  const { deriveStoryContract } = createStoryContractDeriver(services);
  assert.equal(impacts, 0);
  const proposal = deriveStoryContract({ subjects: ['src/a.mjs'], allSuites: ['test/a.test.mjs'] });
  assert.equal(impacts, 1);
  assert.equal(proposal.complete, false);
  assert.deepEqual(proposal.unknownCoupling, ['src/a.mjs']);
  assert.ok(proposal.files.some(entry => entry.path === 'test/a.test.mjs'));
});

test('example answer collection filters settled run evidence to the requested story', async () => {
  const record = { token: mapToken('01/00', 'Q1'), question: 'question', answer: 'yes', toolUseId: 'tool', at: '2026-09-29' };
  const reader = createExampleAnswers({
    HUMAN_INPUT_TOOL_NAMES: ['AskUserQuestion'], reportDegrade() {},
    readRuns: async () => [{ state: 'done', brief: { answers: [record, record] } }],
    isRunning: () => false, readTranscriptTree: async () => null, claudeProjectsDir: () => null,
  });
  assert.deepEqual(reader.readAnswers('not JSON'), []);
  assert.equal(await reader.readSessionAnswers(null, 'session'), null);
  // An invalid or unrelated map token is never attributed to the current story.
  assert.deepEqual(await reader.collectAnswers({ ref: '02/00', dir: '/fixture/story' }), []);
  assert.deepEqual(await reader.collectAnswers({ ref: '01/00', dir: '/fixture/story' }), [record]);
});

test('ready waves keep a missing write contract alone', async () => {
  const candidates = [{ ref: '01/00', type: 'story', path: '/fixture/00' }, { ref: '01/01', type: 'story', path: '/fixture/01' }];
  const result = await partitionReadySetByDeclaredFiles(candidates, { projectRoot: '/fixture', readText: async () => { throw Error('missing'); } });
  assert.deepEqual(result.wave, [candidates[0]]);
  assert.deepEqual(result.heldSet, [candidates[1]]);
});

test('migration contributes through work, preserves its source and uses the supplied product version', async t => {
  const root = await fixture(t);
  const source = path.join(root, 'source');
  await mkdir(source);
  const original = '# Source remains intact\n';
  await writeFile(path.join(source, 'SPEC.md'), original);
  const { migrateFolderCommand } = createMigrateFolderCommand({
    resolveImportSource: () => ({ sourceDir: source }),
    recoverMilestone: async () => ({ intent: { objective: 'Recovered objective' }, meta: { title: 'Fixture', slug: 'fixture' }, decisions: [], outcomes: [] }),
    listRecoverableMilestones: async () => [], slugifySource: () => 'fixture',
    packageVersionString: () => 'fixture-version',
  });
  const registry = createCommandRegistry([createWorkContribution([migrateFolderCommand])]);
  const result = await registry.invoke('migrate:folder', { folder: source, migratedAt: '2026-09-29' }, { workspace: { workDir: path.join(root, 'work') } });
  assert.equal(result.migrated, true);
  assert.equal(result.status, 'not-started');
  assert.equal(await readFile(path.join(source, 'SPEC.md'), 'utf8'), original);
  assert.match(await readFile(path.join(result.dir, 'SPEC.md'), 'utf8'), /aofVersion: fixture-version/);
});

test('diagram file commands retain remote absence and validation via shared invocation', async () => {
  const { diagramFileCommand } = createDiagramFileCommand({ resolveItemExact: async () => ({ ref: '01', reportedBy: 'peer' }) });
  const registry = createCommandRegistry([createWorkContribution([diagramFileCommand])]);
  const result = await registry.invoke('diagram:file', { ref: '01', file: 'ADR-001-fixture.svg' }, {});
  assert.equal(result.present, false);
  assert.equal(result.onThisNode, false);
  assert.equal(result.reportedBy, 'peer');
  await assert.rejects(registry.invoke('diagram:file', { ref: '01', file: '../secret.svg' }, {}), error => error.code === 'diagram-file-invalid');
});
