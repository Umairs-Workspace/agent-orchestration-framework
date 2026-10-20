import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createEffectsDispatcher } from '@aof/effects/dispatch';
import { createEffectsOutbox } from '@aof/effects/outbox';
import { createEffectsJournal } from '@aof/effects/journal';
import { createReactorRegistry } from '@aof/effects/registry';
import { DatabaseSync } from 'node:sqlite';

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

// 164/00 task 03/00 (164/ADR-006) — an owed sync retries until it lands, with backoff. These run the
// REAL journal (in-memory SQLite) under the dispatcher, with an injected clock.

async function retryHarness({ retry = 'until-done', failures, failedAt, succeeds = true }) {
  let next = 0, calls = 0;
  const storage = createEffectsJournal({ mintEventId: () => `event-${++next}`, reportDegrade() {} });
  const journal = storage.initializeJournal({ db: new DatabaseSync(':memory:'), databasePath: ':memory:' });
  const reactor = { key: 'publish-projection', locus: 'local', apply: async () => { calls += 1; if (!succeeds) throw new Error('database is locked'); return { published: true }; }, ...(retry ? { retry } : {}) };
  const effects = { 'workspace.changed': [reactor] };
  storage.appendEvent(journal, { eventId: 'mark', name: 'workspace.changed', payload: { workspaceId: 'aof' }, now: '2026-10-19T08:00:00.000Z' }, [reactor]);
  for (let attempt = 0; attempt < failures; attempt += 1) storage.markStep(journal, 'mark', 'publish-projection', { status: 'failed', error: 'database is locked', now: failedAt });
  const dispatcher = createEffectsDispatcher({ effects, loci: ['local'], pendingSteps: storage.pendingSteps, failedStepsPastCeiling: storage.failedStepsPastCeiling, markStep: storage.markStep, reportDegrade() {} });
  return { journal, storage, dispatcher, calls: () => calls };
}
const after = (iso, ms) => new Date(Date.parse(iso) + ms).toISOString();
const FAILED_AT = '2026-10-19T10:00:00.000Z';

test('164/03 E1: a publish that failed five times is retried once its backoff has elapsed, and lands', async () => {
  const h = await retryHarness({ failures: 5, failedAt: FAILED_AT });
  try {
    await h.dispatcher.drainEffects({ journal: h.journal, now: after(FAILED_AT, 16 * 60_000) });
    assert.equal(h.calls(), 1, 'attempted past the ceiling');
    assert.equal(h.storage.readStep(h.journal, 'mark', 'publish-projection').status, 'done');
  } finally { h.journal.close(); }
});

for (const [attempts, agoMs, attempted] of [[3, 2_000, false], [3, 3 * 60_000, true], [9, 10 * 60_000, false], [9, 16 * 60_000, true]]) {
  test(`164/03 E2: a failed publish after ${attempts} attempts, ${agoMs / 1000}s ago, is ${attempted ? 'attempted again' : 'not attempted'}`, async () => {
    const h = await retryHarness({ failures: attempts, failedAt: FAILED_AT, succeeds: false });
    try {
      const outcomes = await h.dispatcher.drainEffects({ journal: h.journal, now: after(FAILED_AT, agoMs) });
      assert.equal(h.calls(), attempted ? 1 : 0);
      assert.equal(outcomes.length, attempted ? 1 : 0, 'a step still in its backoff is neither run nor counted');
      const steps = h.storage.readEventSteps(h.journal, 'mark');
      assert.equal(steps[0].attempts, attempts + (attempted ? 1 : 0));
    } finally { h.journal.close(); }
  });
}

test('164/03 E3: a reactor that does not declare retry-until-done keeps the ceiling', async () => {
  const h = await retryHarness({ retry: null, failures: 5, failedAt: FAILED_AT });
  try {
    await h.dispatcher.drainEffects({ journal: h.journal, now: after(FAILED_AT, 24 * 60 * 60_000) });
    assert.equal(h.calls(), 0, 'not attempted again, however long ago it failed');
    assert.equal(h.storage.readStep(h.journal, 'mark', 'publish-projection').status, 'failed');
  } finally { h.journal.close(); }
});

test('164/03: an unknown retry declaration is refused when the reactor table is built, naming the reactor and the value', () => {
  const forever = { key: 'publish-projection', locus: 'local', apply: async () => {}, retry: 'forever' };
  assert.throws(
    () => createReactorRegistry([{ name: 'mesh', events: { 'workspace.changed': [forever] } }], { reportDegrade() {} }),
    (error) => /workspace\.changed\/publish-projection/.test(error.message) && /"forever"/.test(error.message),
  );
});

test('164/03: an explicit retry (backoff: false) pays a failed until-done step at once; an automatic pass waits it out', async () => {
  const h = await retryHarness({ failures: 1, failedAt: FAILED_AT });
  try {
    await h.dispatcher.drainEffects({ journal: h.journal, now: after(FAILED_AT, 1_000) });
    assert.equal(h.calls(), 0, 'the automatic pass waits out the backoff');
    await h.dispatcher.drainEffects({ journal: h.journal, now: after(FAILED_AT, 1_000), backoff: false });
    assert.equal(h.calls(), 1, 'the operator\'s explicit retry runs it now');
    assert.equal(h.storage.readStep(h.journal, 'mark', 'publish-projection').status, 'done');
  } finally { h.journal.close(); }
});
