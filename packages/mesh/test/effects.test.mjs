import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMeshEffects } from '@aof/mesh/effects';

test('projection preserves operator scope and retryable propagation evidence', async () => {
  let loaded = 0; const calls = [], warning = { code: 'offline', message: 'control unavailable' };
  const contribution = createMeshEffects(async () => { loaded++; return {
    loadWorkspace: async () => ({ workDir: '/work' }),
    publishGlobalWorkSnapshot: async (_workspace, options) => { calls.push(options); return { warning }; },
    listItems: async () => [{ ref: '3/1', parent: '3', archived: true }, { ref: '4/1', parent: '4', archived: true }],
    isLiveStreamRow: item => !item.archived,
  }; });
  assert.equal(loaded, 0);
  await assert.rejects(contribution.events['stream.archived'][0].apply({ payload: { workspaceRoot: '/repo', archived: [{ ref: '3' }] } }), error => error.code === 'offline' && error.effectDetail.warning === warning);
  assert.deepEqual(calls[0].operatorRefs, ['3', '3/1']);
});

test('park settlement forwards holder evidence and announces only the edge into waiting', async () => {
  const store = {}, transitions = [], announcements = [];
  let waiting = false;
  const contribution = createMeshEffects(async () => ({
    readAssignment: () => ({ state: 'running', code: waiting ? 'needs-input' : null }),
    transitionAssignmentState: async (...args) => { transitions.push(args); waiting = true; return { applied: true }; },
    announceWorkerAsk: async (...args) => announcements.push(args),
  }));
  const apply = contribution.events['assignment.reported'][0].apply;
  const event = { payload: { assignmentId: 'a', state: 'running', code: 'needs-input', ask: { question: 'Choose?' } } };
  assert.deepEqual(await apply(event, { store, byNode: 'worker' }), { settled: true, state: 'running' });
  await apply(event, { store, byNode: 'worker' });
  assert.equal(transitions[0][3].byNode, 'worker');
  assert.equal(announcements.length, 1);
});

test('borrowed stores remain open and owned stores close after branch recording', async () => {
  let closed = 0; const store = { close() { closed++; } }, writes = [];
  const contribution = createMeshEffects(async () => ({ openGlobalWorkProjectionStore: async () => store, setItemBranch: (...args) => writes.push(args) }));
  const apply = contribution.events['assignment.settled'][0].apply;
  const event = { payload: { state: 'done', branch: 'feature', workspaceId: 'w', itemRef: '1' } };
  await apply(event, { store }); assert.equal(closed, 0);
  await apply(event); assert.equal(closed, 1); assert.equal(writes.length, 2);
});
