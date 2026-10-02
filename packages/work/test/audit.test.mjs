import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createAuditCensus } from '../src/audit/census.mjs';
import { createAuditEvidence } from '../src/audit/evidence.mjs';
import { createAuditPromptLayer } from '../src/audit/prompt-layer.mjs';
import { createAuditDeclaredBounds } from '../src/audit/declared-bounds.mjs';
import { createAuditSeamLiveness } from '../src/audit/seam-liveness.mjs';

async function scratch(run) {
  const parent = await realpath(os.tmpdir());
  const root = await mkdtemp(path.join(parent, 'aof-audit-package-'));
  try { await run(root); }
  finally { assert.equal(path.dirname(await realpath(root)), parent); await rm(root, { recursive: true, force: true }); }
}

test('census and evidence use the supplied installed program locator, execution and bounds', async () => {
  const calls = [];
  const programs = { toolkitProgram: rel => { calls.push(['program', rel]); return path.join('installed toolkit', rel); }, isToolkitRoot: () => false };
  const execution = { DEFAULT_DEADLINE_MS: 321, runBounded: async request => {
    calls.push(['spawn', request]);
    return { outcome: 'exited', exitCode: 0, stdout: JSON.stringify({ ok: true, names: ['external suite'] }), stderr: '' };
  }, attemptedCommand: () => 'supplied invocation' };
  const census = createAuditCensus({ ...programs, ...execution });
  const evidence = createAuditEvidence({ ...programs, ...execution });
  assert.deepEqual(calls, [], 'composition does not locate programs or execute children');
  const subject = path.resolve('subject');
  assert.equal((await census.assembledSuite({ repoRoot: subject, execPath: 'test-node' })).ok, true);
  assert.deepEqual(calls[1][1], { command: 'test-node', args: [path.join('installed toolkit', census.PROBE_PROGRAM), path.join(subject, 'scripts', 'test.mjs')], cwd: subject, deadlineMs: 321 });
  const result = await evidence.driveControl({ repoRoot: subject, control: 'test/control.mjs', spawn: async request => {
    assert.equal(request.args[0], path.join('installed toolkit', evidence.DRIVE_PROGRAM));
    assert.equal(request.args[1], path.join(subject, 'test', 'control.mjs'));
    return { outcome: 'not-started', error: 'injected refusal' };
  } });
  assert.equal(result.attempted, 'supplied invocation');
  assert.equal(result.detail, 'injected refusal');
});

test('prompt audit discovers supplied runtime vocabulary and leaves prompt bytes unchanged', () => scratch(async root => {
  const api = createAuditPromptLayer({ RUNTIMES: { custom: { id: 'custom', localRoot: '.custom-runtime' } }, RESOURCE_KINDS: { agent: { id: 'agent', plural: 'personas' } } });
  const directory = path.join(root, '.custom-runtime', 'personas');
  await mkdir(directory, { recursive: true });
  const content = 'A shared instruction describes the expected project behavior in enough detail to exceed the declared sentence floor, and its exact wording is intentionally repeated across both documents.\n';
  for (const file of ['one.md', 'two.md']) await writeFile(path.join(directory, file), content);
  const report = await api.runPromptLayer({ root });
  assert.ok(report.findings.some(finding => finding.code === 'audit-instruction-duplicated'));
  assert.ok(report.reads.every(read => read.count === 2));
  for (const file of ['one.md', 'two.md']) assert.equal(await readFile(path.join(directory, file), 'utf8'), content);
}));

test('declared bounds use the supplied configuration resolver', () => {
  const seen = [];
  const key = 'work.loop.progressMaxResets';
  const api = createAuditDeclaredBounds({ HARNESS_REFERENCE_ROWS: [], parseCheckedDate: () => null, LOOP_BOUND_CONFIG_KEYS: [key], resolvesLoopBoundConfigKey: value => value === key, LOOP_BOUND_CONFIG_RESOLVERS: { [key]: workspace => { seen.push(workspace); return 17; } } });
  assert.deepEqual(seen, []);
  const workspace = { injected: true };
  assert.deepEqual(api.declaredBoundValues(workspace), { 'retry attempt ceiling (attempts)': 17 });
  assert.deepEqual(seen, [workspace]);
});

test('seam audit uses supplied graph reads and reports unavailable evidence without building it', () => scratch(async root => {
  const calls = [];
  const api = createAuditSeamLiveness({ TEST_ROOTS: ['spec'], graphJsonPath: value => { calls.push(value); return 'supplied.graph'; }, readGraph: file => { calls.push(file); throw Object.assign(new Error('absent'), { code: 'ENOENT' }); }, normalizeGraph: () => { throw new Error('no graph to normalize'); }, graphArtifactBuiltAt: () => { throw new Error('no artifact to inspect'); } });
  assert.deepEqual(calls, []);
  await mkdir(path.join(root, 'src'));
  await writeFile(path.join(root, 'src', 'seam.mjs'), 'export function seam() {}\n');
  const report = await api.runSeamLiveness({ root });
  assert.deepEqual(calls, [root, 'supplied.graph']);
  assert.ok(report.limits.some(limit => /no code graph was available/.test(limit.consequence)));
}));
