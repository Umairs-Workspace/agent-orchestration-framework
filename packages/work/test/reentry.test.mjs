import assert from 'node:assert/strict';
import test from 'node:test';
import { createPhaseDoorCommands } from '@aof/work/commands/continue';
import { createReentryCommands } from '@aof/work/commands/resume';

test('phase doors use autonomous for milestone continue and leave verify status alone', async () => {
  const item = { ref: '01', dir: '/fixture', type: 'milestone' }, moved = [];
  const { continueCommand, refineDoorCommand, verifyDoorCommand } = createPhaseDoorCommands({
    resolveItemExact: async () => item, resolveItem: async () => item,
    readExecutionOverlay: async () => ({}), executionScopeRef: ref => ref, resolveScopedExecution: () => null,
    assignWork: assert.fail,
    transitionItemStatus: async (_item, input) => { moved.push(input); return { record: { status: 'in-progress', from: 'not-started' } }; },
  });
  const ctx = { workspace: { config: {} } };
  assert.equal((await continueCommand.run({ ref: '01' }, ctx)).command, '/aof:autonomous 01');
  assert.equal((await refineDoorCommand.run({ ref: '01' }, ctx)).command, '/aof:refine 01');
  assert.equal((await verifyDoorCommand.run({ ref: '01' }, ctx)).command, '/aof:verify 01');
  assert.equal(moved.length, 2);
  assert.ok(moved.every(input => input.toStatus === 'in-progress'));
});

test('resume reclaims a stranded run before delegating the retry with the configured bound', async () => {
  const item = { ref: '01', dir: '/fixture' }, calls = [], lock = {};
  const { resumeCommand } = createReentryCommands({
    resolveItemExact: async () => item, requireLocalCheckout: () => {}, lockContextFor: () => lock, meshNodeIdOf: () => null,
    transitionStaleRunsReclaimed: async (items, _input, options) => { assert.deepEqual(items, [item]); assert.equal(options.lock, lock); calls.push('reclaim'); return [{ record: { runId: 'prior' } }]; },
    transitionRunStart: async (_item, input, options) => { calls.push('retry'); assert.equal(input.mode, 'retry'); assert.equal(input.maxAttempts, 5); assert.equal(input.force, true); assert.equal(options.lock, lock); return { record: { runId: 'retry', state: 'running' } }; },
  });
  const result = await resumeCommand.run({ ref: '01', force: true, now: '2026-09-01T10:00:00Z' }, { workspace: { config: { work: { autonomous: { maxAttempts: 5 } } } } });
  assert.deepEqual(calls, ['reclaim', 'retry']); assert.deepEqual(result.reclaimed, ['prior']); assert.equal(result.resumed, true);
});

test('worker answers load the command registry lazily and do not notify on refused delivery', async () => {
  const calls = [], execution = { sessionId: 'worker-session', runId: 'worker-run', updatedAt: '2026-09-01T09:00:00Z', ask: { phase: 'continue', askedAt: '2026-09-01T09:00:00Z' } };
  const { answerCommand } = createReentryCommands({
    resolveItemExact: async () => ({ ref: '01' }), meshNodeIdOf: () => 'control', askEnvFor: () => ({}), loopAsksDir: () => '/fixture', resolveWorkspaceId: () => 'workspace',
    answerAsk: async () => null, readExecutionOverlay: async () => ({}), resolveScopedExecution: () => ({ execution }), awaitsAnswer: () => true,
    loadCommandCore: async () => { calls.push('load'); return { invoke: async (id, input) => { assert.equal(id, 'mesh:terminal-resume'); assert.equal(input.session, 'worker-session'); assert.equal(input.answer.text, 'answer'); calls.push('invoke'); return { confirmed: true, confirmedRunId: 'worker-run' }; } }; },
    buildNotifyEnvelope: () => ({}), notify: async () => calls.push('notify'),
  });
  assert.deepEqual(calls, []);
  const result = await answerCommand.run({ ref: '01', text: 'answer', now: '2026-09-01T10:00:00Z' }, { workspace: { config: {} } });
  assert.equal(result.delivery, 'mesh'); assert.equal(result.state, 'resumed');
  assert.deepEqual(calls, ['load', 'invoke', 'notify']);
  await assert.rejects(answerCommand.run({ ref: '01', text: 'answer' }, {
    workspace: { config: {} }, invokeRegistered: async () => ({ refused: true }),
  }), { code: 'terminal-resume-not-started' });
  assert.deepEqual(calls, ['load', 'invoke', 'notify']);
});
