import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseFeature } from '@aof/work/feature-parse';
import { parseDigestTemplate, renderDigestDocument, digestFindings } from '@aof/work/digest';
import { validateWork } from '@aof/work/validation';
import { WORK_ITEM_SCHEMA_VERSION } from '@aof/work/records';

const template = `---
doc: digest
milestone: NN
slug: <slug>
title: "<title>"
status: not-started
source: "<source>" # OMIT
schema: <schema-version>
aofVersion: <aof-version>
---
# NN — <Milestone Title>

<!-- supplied template -->

## Intent
## Decisions
`;
const contract = parseDigestTemplate(template);
async function fixture(run) {
  const parent = await realpath(os.tmpdir());
  const root = await mkdtemp(path.join(parent, 'aof-validation-package-'));
  try { await run(root); }
  finally {
    assert.equal(path.dirname(await realpath(root)), parent);
    await rm(root, { recursive: true, force: true });
  }
}

test('digest rendering and validation use only the supplied contract and version', () => {
  const text = renderDigestDocument({ milestoneRef: '07', values: { title: 'A "quoted" title', slug: 'sample' }, sections: { Decisions: 'Chosen', Intent: 'Goal' } }, { contract, schemaVersion: 5, aofVersion: 'fixture-version' });
  assert.ok(Object.isFrozen(contract) && Object.isFrozen(contract.keys[0]));
  assert.match(text, /schema: 5\naofVersion: fixture-version/);
  assert.ok(!text.includes('source:'));
  assert.ok(text.indexOf('## Intent') < text.indexOf('## Decisions'));
  assert.match(text, /title: "A \\"quoted\\" title"/);
  const meta = Object.fromEntries(contract.requiredKeys.map(key => [key, 'value']));
  assert.deepEqual(digestFindings(meta, text, contract), []);
  assert.equal(digestFindings({ ...meta, extra: 'x' }, text + '\n## Intent\n## Unknown', contract).length, 3);
});

test('validation requests the digest contract lazily and fails if it is missing', () => fixture(async root => {
  assert.deepEqual(await validateWork(root, {}, undefined, { getDigestContract: () => { throw new Error('unused'); } }), []);
  const dir = path.join(root, '07_milestone_sample');
  await mkdir(dir);
  const input = { milestoneRef: '07', values: { milestone: '07', slug: 'sample', title: 'Sample' }, sections: { Intent: 'Goal' } };
  await writeFile(path.join(dir, 'AOF.md'), renderDigestDocument(input, { contract, schemaVersion: WORK_ITEM_SCHEMA_VERSION, aofVersion: 'fixture-version' }));
  let calls = 0;
  assert.deepEqual(await validateWork(root, {}, undefined, { getDigestContract: () => { calls++; return contract; } }), []);
  assert.equal(calls, 1);
  await assert.rejects(validateWork(root, {}), /requires getDigestContract/);
}));

test('validation enforces feature vocabulary only while the owning story is open', () => fixture(async root => {
  const story = path.join(root, '07_story_sample');
  await mkdir(path.join(story, 'tasks'), { recursive: true });
  const record = status => `---\ntype: story\nnumber: 07\nslug: sample\nstatus: ${status}\ncreated: 2026-09-28\nupdated: 2026-09-28\nschema: ${WORK_ITEM_SCHEMA_VERSION}\n---\n`;
  await writeFile(path.join(story, 'STORY.md'), record('not-started'));
  await writeFile(path.join(story, 'tasks/00.feature'), '@unknown\nFeature: Example\n  @executable\n  Scenario: Works\n    Given a fixture\n');
  assert.ok((await validateWork(root, {})).some(row => row.problem.includes('unknown tag')));
  await writeFile(path.join(story, 'STORY.md'), record('done'));
  assert.deepEqual(await validateWork(root, {}), []);
}));

test('the standalone parser preserves outlines, examples and partial malformed input', () => {
  const parsed = parseFeature('@executable\nFeature: Example\n  Scenario Outline: Works\n    Given <value>\n    Examples:\n      | value |\n      | one |\n');
  assert.equal(parsed.scenarios[0].outline, true);
  assert.equal(parsed.scenarios[0].examples[0].rows, 1);
  const malformed = parseFeature('Feature: Example\n  Scenario: Still visible\n    Given a fixture\n    free text\n');
  assert.equal(malformed.scenarios.length, 1);
  assert.ok(malformed.structural.length > 0);
});
