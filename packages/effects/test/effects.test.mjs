import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createEffectsDispatcher } from '@aof/effects/dispatch';
import { createEffectsOutbox } from '@aof/effects/outbox';

// A port double, not another journal implementation. SQLite durability is exercised
// by the root effects-ledger and mesh-outbox integration suites.
function ports(steps = []) {
  const queries = [], writes = [], diagnostics = [];
  return {
    queries, writes, diagnostics,
    pendingSteps(journal, options) { queries.push({ journal, options }); return steps; },
    markStep(...args) { writes.push(args); },
    reportDegrade(...args) { diagnostics.push(args); },
    readStep: () => ({ status: 'pending' }),
    loci: ['local'],
    isRemoteStep: (step, loci) => !loci.includes(step.locus),
  };
}
const step = (key, locus = 'local') => ({ eventId: 'event-1', name: 'changed', key, locus, payload: { value: 4 } });

test('factories require their collaborators and perform no storage or delivery at construction', () => {
  assert.throws(() => createEffectsDispatcher(), /requires pendingSteps/);
  assert.throws(() => createEffectsOutbox(), /requires pendingSteps/);
  const io = ports();
  createEffectsDispatcher({ ...io, effects: {} });
  createEffectsOutbox(io);
  assert.deepEqual([io.queries, io.writes, io.diagnostics], [[], [], []]);
});

test('a crash recovery sweep asks storage for reachable steps with the retry ceiling and limit', async () => {
  const io = ports(), journal = {};
  const dispatcher = createEffectsDispatcher({ ...io, effects: {} });
  await dispatcher.drainEffects({ journal, limit: 7, maxAttempts: 3 });
  assert.deepEqual(io.queries, [{ journal, options: { eventId: null, maxAttempts: 3, limit: 7, loci: ['local'] } }]);
  await dispatcher.drainEffects({ journal, eventId: 'event-1' });
  assert.deepEqual(io.queries[1].options, { eventId: 'event-1', maxAttempts: 5, limit: 100 });
});

test('a reactor failure remains retryable and cannot strand sibling consequences', async () => {
  const io = ports([step('broken'), step('ok'), step('remote', 'elsewhere')]);
  const detail = { warning: 'projection unavailable' }, ctx = {}, journal = {};
  const dispatcher = createEffectsDispatcher({ ...io, effects: { changed: [
    { key: 'broken', locus: 'local', apply: async () => { throw Object.assign(new Error('offline'), { effectDetail: detail }); } },
    { key: 'ok', locus: 'local', apply: async (event, receivedCtx) => {
      assert.equal(receivedCtx, ctx);
      assert.deepEqual(event, { eventId: 'event-1', name: 'changed', payload: { value: 4 } });
      return { saved: true };
    } },
  ] } });
  const result = await dispatcher.drainEffects({ journal, eventId: 'event-1', ctx, now: 'fixed-time' });
  assert.deepEqual(result.map(row => row.status), ['failed', 'done', 'deferred']);
  assert.equal(result[0].detail, detail);
  assert.deepEqual(result[1].detail, { saved: true });
  assert.deepEqual(io.writes.map(args => args.slice(1)), [
    ['event-1', 'broken', { status: 'failed', error: 'offline', now: 'fixed-time' }],
    ['event-1', 'ok', { status: 'done', now: 'fixed-time' }],
  ]);
  assert.equal(io.diagnostics[0][0], 'effect-failed');
});

test('a missing reactor becomes a visible terminal step', async () => {
  const io = ports([step('removed')]);
  const result = await createEffectsDispatcher({ ...io, effects: {} }).drainEffects({ journal: {} });
  assert.equal(result[0].status, 'skipped');
  assert.equal(result[0].error, 'unknown-reactor');
  assert.equal(io.writes[0][3].status, 'skipped');
  assert.equal(io.diagnostics[0][0], 'effect-unknown-reactor');
});

test('ephemeral execution respects the supplied applicable reactors without touching storage', async () => {
  const io = ports(), seen = [];
  const dispatcher = createEffectsDispatcher({ ...io, effects: { changed: [{ key: 'excluded', apply: () => assert.fail('not applicable') }] } });
  const result = await dispatcher.runEffectsEphemeral('changed', { value: 4 }, { reactors: [
    { key: 'selected', locus: 'local', apply: async event => { seen.push(event); return 'saved'; } },
    { key: 'remote', locus: 'elsewhere', apply: () => assert.fail('not reachable') },
  ] });
  assert.deepEqual(result.map(row => row.status), ['done', 'deferred']);
  assert.deepEqual(seen, [{ eventId: null, name: 'changed', payload: { value: 4 } }]);
  assert.deepEqual([io.queries, io.writes], [[], []]);
});

test('separate compositions never share a reactor table', async () => {
  const io = ports([step('save')]);
  const make = value => createEffectsDispatcher({ ...io, effects: { changed: [{ key: 'save', apply: async () => value }] } });
  const first = make('first'), second = make('second');
  assert.equal((await second.drainEffects({ journal: {} }))[0].detail, 'second');
  assert.equal((await first.drainEffects({ journal: {} }))[0].detail, 'first');
});

test('delivery repeats until acknowledged and transport failures consume no attempts', async () => {
  const io = ports([step('ship', 'remote')]), outbox = createEffectsOutbox(io), journal = {};
  const failed = await outbox.drainOutbox({ journal, send: async () => { throw new Error('offline'); } });
  assert.equal(failed[0].status, 'unsent');
  assert.equal(io.diagnostics[0][0], 'effect-outbox-send');
  const sent = [];
  const send = async frame => { sent.push(frame); return { sent: true }; };
  await outbox.drainOutbox({ journal, send, now: 'fixed-time' });
  await outbox.drainOutbox({ journal, send, now: 'fixed-time' });
  assert.deepEqual(sent, Array(2).fill({ eventId: 'event-1', reactorKey: 'ship', locus: 'remote', name: 'changed', payload: { value: 4 }, at: 'fixed-time' }));
  assert.deepEqual(io.writes, []);
});

test('outbox eligibility is supplied by its owner rather than hardcoded to an integration', () => {
  const io = ports([step('local'), step('ship', 'remote'), step('sync', 'integration:example')]);
  const allRemote = createEffectsOutbox(io);
  const restricted = createEffectsOutbox({ ...io, isRemoteStep: candidate => candidate.key === 'ship' });
  assert.deepEqual(allRemote.remoteSteps({}).map(row => row.key), ['ship', 'sync']);
  assert.deepEqual(restricted.remoteSteps({}).map(row => row.key), ['ship']);
});

test('acknowledgements distinguish success, terminal refusal, retryable outage and failed execution', () => {
  const io = ports(), outbox = createEffectsOutbox(io), journal = {};
  const ack = { eventId: 'event-1', reactorKey: 'ship' };
  assert.deepEqual(outbox.applyEffectAck(journal, { ...ack, retryable: true }), { applied: true, status: 'pending', retryable: true });
  assert.deepEqual(io.writes, []);
  outbox.applyEffectAck(journal, { ...ack, ok: true });
  outbox.applyEffectAck(journal, { ...ack, code: 'unknown-assignment' });
  outbox.applyEffectAck(journal, { ...ack, error: 'reactor failed' });
  assert.deepEqual(io.writes.map(args => args[3].status), ['done', 'skipped', 'failed']);
});

test('invalid, unknown and duplicate acknowledgements never write a journal row', () => {
  const io = ports(), journal = {}, ack = { eventId: 'event-1', reactorKey: 'ship', ok: true };
  assert.equal(createEffectsOutbox(io).applyEffectAck(journal, {}).code, 'effect-ack-invalid');
  assert.equal(createEffectsOutbox({ ...io, readStep: () => undefined }).applyEffectAck(journal, ack).code, 'effect-ack-unknown-step');
  for (const status of ['done', 'skipped']) {
    assert.equal(createEffectsOutbox({ ...io, readStep: () => ({ status }) }).applyEffectAck(journal, ack).code, 'effect-ack-already-settled');
  }
  assert.deepEqual(io.writes, []);
});
