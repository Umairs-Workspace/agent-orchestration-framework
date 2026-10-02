import assert from 'node:assert/strict';
import test from 'node:test';
import { createRunStartCommand } from '@aof/work/commands/run-start';
import { createRunCompleteCommand } from '@aof/work/commands/run-complete';
import { createRunRetryCommand } from '@aof/work/commands/run-retry';
import { createRunStatusCommand } from '@aof/work/commands/run-status';

test('run start resolves exactly and echoes a driven run before reclaim or mint', async () => {
  const item = { ref: '01', dir: '/fixture' }, record = { runId: 'driven', state: 'running' };
  const calls = [];
  const { runStartCommand } = createRunStartCommand({
    resolveItemExact: async (_ctx, ref) => { calls.push(['resolve', ref]); return item; },
    requireLocalCheckout: (value, ref) => { assert.equal(value, item); calls.push(['local', ref]); },
    resolveDrivenRun: async (_ctx, value) => { assert.equal(value, item); return { record }; },
    transitionRunStart: assert.fail, transitionStaleRunsReclaimed: assert.fail,
    listItemsCacheFirst: assert.fail,
  });
  assert.deepEqual(await runStartCommand.run({ ref: ' 01 ' }, {}), { ...record, driven: true });
  assert.deepEqual(calls, [['resolve', '01'], ['local', '01']]);
});

test('run complete validates before resolution and delegates one terminal transition', async () => {
  const item = { ref: '01', dir: '/fixture' }, workspace = { config: {} }, calls = [];
  const { runCompleteCommand } = createRunCompleteCommand({
    resolveItemExact: async () => { calls.push('resolve'); return item; },
    requireLocalCheckout: () => calls.push('local'), resolveDrivenRun: async () => null,
    transitionRunComplete: async (target, input, options) => {
      assert.equal(target, item); assert.equal(options.workspace, workspace);
      assert.equal(input.outcome, 'done'); calls.push('transition');
      return { record: { runId: 'fixture', state: 'done' }, effects: [], eventId: 'event' };
    },
    threadPropagationWarnings: (result, effects) => { assert.deepEqual(effects, []); return result; },
  });
  await assert.rejects(runCompleteCommand.run({ ref: '01', outcome: 'invalid' }, { workspace }), { code: 'invalid-outcome' });
  assert.deepEqual(calls, []);
  const result = await runCompleteCommand.run({ ref: '01', outcome: 'done' }, { workspace });
  assert.deepEqual(calls, ['resolve', 'local', 'transition']);
  assert.deepEqual(result, { runId: 'fixture', state: 'done', effects: [], eventId: 'event' });
});

test('run retry passes the resolved ceiling, node and lock without adding publish context', async () => {
  const item = { ref: '01', dir: '/fixture' }, lock = { identity: 'fixture' }, calls = [];
  const { runRetryCommand, resolveAttemptCeiling } = createRunRetryCommand({
    resolveItemExact: async () => item, requireLocalCheckout: () => {},
    meshNodeIdOf: () => 'node-fixture', lockContextFor: () => lock,
    transitionRunStart: async (target, input, options) => {
      assert.equal(target, item); assert.equal(options.lock, lock);
      assert.ok(!Object.hasOwn(options, 'workspace')); calls.push(input); return { record: input };
    },
  });
  assert.equal(resolveAttemptCeiling({}), 3);
  const ctx = { workspace: { config: { work: { autonomous: { maxAttempts: 5 } } } } };
  await runRetryCommand.run({ ref: '01', runId: 'prior' }, ctx);
  await runRetryCommand.run({ ref: '01', maxAttempts: 2, force: true }, ctx);
  assert.equal(calls[0].maxAttempts, 5); assert.equal(calls[0].node, 'node-fixture');
  assert.equal(calls[0].mode, 'retry'); assert.equal(calls[0].runId, 'prior');
  assert.equal(calls[1].maxAttempts, 2); assert.equal(calls[1].force, true);
});

test('run status reads a remote execution scope without touching local run storage', async () => {
  const refs = [], runs = [{ runId: 'remote', state: 'running' }];
  const { runStatusCommand } = createRunStatusCommand({
    resolveItem: async () => ({ ref: '01/02', dir: null }), readRuns: assert.fail,
    executionScopeRef: () => '01', readWorkerRuns: async (_workspace, ref) => {
      refs.push(ref); return ref === '01' ? { runs, reportedBy: 'worker' } : null;
    },
  });
  const result = await runStatusCommand.run({ ref: '01/02' }, { workspace: {} });
  assert.deepEqual(refs, ['01/02', '01']);
  assert.deepEqual(result, { ref: '01/02', runs, fromWorker: true, answeredFrom: 'cache', reportedBy: 'worker' });
  assert.equal(runStatusCommand.cli.json(result), result);
});
