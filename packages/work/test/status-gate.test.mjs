import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, writeFile, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createItemStatusCommand } from '@aof/work/commands/item-status';
import { createRegressionGateCommand } from '@aof/work/commands/regression-gate';
import { appendRegressionRow, parseRegressionRows, regressionRecordPath } from '@aof/work/regression-record';

async function fixture(run) {
  const parent = await realpath(os.tmpdir()), root = await mkdtemp(path.join(parent, 'aof-status-gate-'));
  try { await run(root); } finally { assert.equal(path.dirname(await realpath(root)), parent); await rm(root, { recursive: true, force: true }); }
}
const commit = '0123456789abcdef0123456789abcdef01234567';
const instant = '2026-09-01T10:00:00Z';

test('regression gate refuses a dirty tree before launching tests or writing evidence', () => fixture(async root => {
  const item = { ref: '01', dir: root };
  const { runRegressionGate } = createRegressionGateCommand({ requireLocalCheckout: () => {}, headCommit: assert.fail, runTest: assert.fail, resolveTestGate: assert.fail });
  await assert.rejects(runRegressionGate({ ref: '01' }, {
    projectRoot: root, resolve: async () => item, git: async () => ({ status: 0, stdout: '?? src/new.mjs\n' }), write: assert.fail,
  }), { code: 'regression-gate-dirty-tree' });
}));

test('regression gate records the configured whole-tree runner result through its own document', () => fixture(async root => {
  const item = { ref: '01', dir: root }, calls = [];
  const { regressionGateCommand } = createRegressionGateCommand({
    resolveItemExact: async () => item, requireLocalCheckout: () => {},
    execFile: (program, args, options, callback) => {
      assert.equal(program, 'git'); assert.deepEqual(args, ['status', '--porcelain']);
      assert.equal(options.cwd, root); assert.equal(options.timeout, 30000); callback(null, '', '');
    },
    headCommit: async () => commit,
    // 144: the gate program is the toolchain module's; none is declared here, so work.test runs unchanged.
    resolveTestGate: () => ({ ok: true, gate: null }), gateToolchain: (toolchain) => toolchain,
    resolveTestToolchain: assert.fail, launchRunner: assert.fail,
    runTest: async (input, options) => { calls.push(input); assert.equal(options.projectRoot, root); return { scope: 'all', widened: [], exit: 0, report: { failures: [] } }; },
  });
  const result = await regressionGateCommand.run({ ref: '01', now: instant }, { workspace: { projectRoot: root, config: {} } });
  assert.deepEqual(calls, [{ scope: 'all' }]); assert.equal(result.satisfiesDoor, true);
  const rows = parseRegressionRows(await readFile(regressionRecordPath(root), 'utf8'));
  assert.equal(rows.length, 1); assert.equal(rows[0].commit, commit); assert.equal(rows[0].result, 'green');
}));

test('milestone acceptance requires gate evidence and notifies only after its transition', () => fixture(async root => {
  const item = { ref: '01', dir: root, type: 'milestone', status: 'in-review', title: 'Fixture' }, calls = [];
  const { itemStatusCommand } = createItemStatusCommand({
    resolveItemExact: async () => item, requireLocalCheckout: () => {}, doctorWork: async () => [],
    transitionItemStatus: async (_item, input) => { calls.push('transition'); return { record: { ref: item.ref, status: input.toStatus }, effects: [] }; },
    buildNotifyEnvelope: event => { calls.push(event); return { event }; },
    notify: async () => calls.push('notify'), threadPropagationWarnings: result => result,
  });
  const ctx = { workspace: { workDir: root, projectRoot: root, config: {} } };
  await assert.rejects(itemStatusCommand.run({ ref: '01', status: 'done' }, ctx), { code: 'regression-gate-missing' });
  assert.deepEqual(calls, []);
  await writeFile(regressionRecordPath(root), appendRegressionRow(null, { commit, instant, scope: 'all', result: 'green', detail: null }));
  const result = await itemStatusCommand.run({ ref: '01', status: 'done' }, ctx);
  assert.equal(result.moved, true); assert.equal(result.regressionGate.commit, commit);
  assert.deepEqual(calls, ['transition', 'milestone-accepted', 'notify']);
}));
