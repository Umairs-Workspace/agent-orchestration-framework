import assert from 'node:assert/strict';
import test from 'node:test';
import { createItemTransitions } from '@aof/work/item-transitions';
import { createStreamTransitions } from '@aof/work/stream-transitions';

test('item transitions write the fact before owing effects and close the journal when draining fails', async () => {
  const calls = [], failure = new Error('drain failed');
  const api = createItemTransitions({
    setItemStatus: async () => { calls.push('fact'); return { ref: '142', from: 'not-started', status: 'in-progress' }; },
    applicableReactors: async (name, payload) => { calls.push('reactors'); assert.equal(name, 'item-status.changed'); assert.equal(payload.from, 'not-started'); return ['publish']; },
    reachableLoci: () => ['checkout'],
    openEffectsJournal: async () => { calls.push('open'); return { close: () => calls.push('close') }; },
    appendEvent: () => { calls.push('append'); return { eventId: 'event' }; },
    drainEffects: async ({ eventId }) => { calls.push('drain'); assert.equal(eventId, 'event'); throw failure; },
  });
  assert.deepEqual(calls, []);
  await assert.rejects(api.transitionItemStatus({ ref: '142', dir: '/fixture' }, { toStatus: 'in-progress' }), error => error === failure);
  assert.deepEqual(calls, ['fact', 'reactors', 'open', 'append', 'drain', 'close']);
});

test('refused item facts owe no effects; an unavailable journal preserves the fact and runs the ephemeral cascade', async () => {
  const refusal = new Error('invalid status'), calls = [];
  const refused = createItemTransitions({ setItemStatus: async () => { throw refusal; }, applicableReactors: () => assert.fail('no event for a refused fact') });
  await assert.rejects(refused.transitionItemStatus({}, {}), error => error === refusal);
  const record = { ref: '142', from: 'in-progress', status: 'done' };
  const api = createItemTransitions({
    setItemStatus: async () => record,
    applicableReactors: async () => ['publish'], reachableLoci: () => ['local'],
    openEffectsJournal: async () => { throw new Error('unavailable'); },
    reportDegrade: code => calls.push(code),
    runEffectsEphemeral: async (name, payload, options) => { calls.push(name); assert.equal(payload.status, 'done'); assert.deepEqual(options.loci, ['local']); return ['paid']; },
  });
  assert.deepEqual(await api.transitionItemStatus({ dir: '/fixture' }, { toStatus: 'done' }), { record, eventId: null, effects: ['paid'] });
  assert.deepEqual(calls, ['effects-journal-open', 'item-status.changed']);
});

test('stream insertion checks every touched lock and a no-op remap owes no event', async () => {
  const calls = [], refs = ['142', '143'];
  const api = createStreamTransitions({
    lockContextFor: () => ({ workspaceId: 'workspace' }),
    guardItemLock: async (actual, { lock }) => { assert.strictEqual(actual, refs); assert.equal(lock.workspaceId, 'workspace'); calls.push('lock'); },
    openEffectsJournal: () => assert.fail('a no-op owes no event'),
  });
  const workspace = { workDir: '/fixture', workItemStore: {
    async mutate(request) {
      assert.equal(request.operation, 'reindex');
      assert.equal(request.input.at, 144);
      if (request.stage === 'plan') { calls.push('plan'); return { touched: refs }; }
      calls.push('reindex'); return { remap: [], shifted: 0 };
    },
  } };
  assert.deepEqual(await api.transitionStreamReindexed(workspace, { at: 144 }), { remap: [], shifted: 0, eventId: null, effects: [] });
  assert.deepEqual(calls, ['plan', 'lock', 'reindex']);
});


test('208/03 a refused placement lock never reaches the selected apply operation or event journal', async () => {
  for (const [method, input] of [['transitionStreamReindexed', { at: 12, space: 'top-level' }], ['transitionStreamArchived', { names: ['19_chore_receipt'] }], ['transitionStreamRenumbered', { ref: '10', to: '22' }]]) {
    const requests = [], refusal = new Error('held');
    const workspace = { workItemStore: { async mutate(request) {
      requests.push(request);
      assert.equal(request.stage, 'plan', 'the refused lock prevents every write');
      return { touched: ['10'], handle: {}, description: {} };
    } } };
    const api = createStreamTransitions({ lockContextFor: () => ({}), guardItemLock: async () => { throw refusal; }, openEffectsJournal: () => assert.fail('refused moves owe no event') });
    await assert.rejects(api[method](workspace, input), error => error === refusal);
    assert.equal(requests.length, 1);
  }
});

test('208/03 a renumber preview is the selected store plan and never applies or locks', async () => {
  const description = { ref: '10', to: '22', changes: ['opaque move'] }, requests = [];
  const workspace = { workItemStore: { async mutate(request) { requests.push(request); return { description }; } } };
  const api = createStreamTransitions({ guardItemLock: () => assert.fail('preview does not lock'), openEffectsJournal: () => assert.fail('preview owes no event') });
  assert.deepEqual(await api.transitionStreamRenumbered(workspace, { ref: '10', to: '22', dryRun: true }), { ...description, moved: false, dryRun: true, effects: [] });
  assert.deepEqual(requests.map(({operation, stage}) => [operation, stage]), [['renumber', 'plan']]);
});
