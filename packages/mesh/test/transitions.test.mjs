import assert from 'node:assert/strict';
import test from 'node:test';
import { createAssignmentTransitions, ASSIGNMENT_NOT_HOLDER } from '@aof/mesh/assignment-transitions';

test('assignment admission refuses a foreign holder before changing a fact or opening the journal', async () => {
  const api = createAssignmentTransitions({ openEffectsJournal: () => assert.fail('a refusal owes no event') });
  const store = { db: { prepare: sql => { assert.ok(sql.startsWith('SELECT')); return { get: () => ({ target_node_id: 'owner', state: 'running', workspace_id: 'workspace' }) }; } } };
  const result = await api.transitionAssignmentState(store, 'assignment', 'done', { byNode: 'foreign' });
  assert.equal(result.applied, false);
  assert.equal(result.code, ASSIGNMENT_NOT_HOLDER);
});

test('a durable assignment report drains only its own event and always closes the journal', async () => {
  const calls = [], send = () => {};
  const api = createAssignmentTransitions({
    applicableReactors: async () => ['apply'], LOCAL_LOCI: ['local'],
    openEffectsJournal: async () => ({ close: () => calls.push('close') }),
    appendEvent: (_journal, event) => { calls.push(event.name); assert.equal(event.payload.assignmentId, 'assignment'); return { eventId: 'own-event' }; },
    drainOutbox: async options => { assert.equal(options.eventId, 'own-event'); assert.strictEqual(options.send, send); calls.push('drain'); return ['delivered']; },
  });
  assert.deepEqual(await api.reportAssignmentSettled({ assignmentId: 'assignment', state: 'done' }, { sendEffectStep: send }), { eventId: 'own-event', durable: true, delivered: ['delivered'] });
  assert.deepEqual(calls, ['assignment.reported', 'drain', 'close']);
});
