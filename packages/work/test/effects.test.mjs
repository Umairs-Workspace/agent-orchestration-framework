import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createWorkEffects } from '@aof/work/effects';

test('registration is inert and status advancement stays bounded', async () => {
  let loaded = 0; const writes = [];
  const contribution = createWorkEffects(async () => { loaded++; return {
    typeHasRecordDoc: type => type === 'story',
    setItemStatus: async (...args) => writes.push(args),
  }; });
  assert.equal(loaded, 0);
  const apply = contribution.events['run.started'][0].apply;
  await apply({ payload: { ref: '1/1', itemDir: '/repo/story', itemType: 'story' } });
  assert.deepEqual(writes[0], [{ ref: '1/1', dir: '/repo/story', type: 'story' }, 'in-progress', { expectFrom: ['not-started', 'blocked'] }]);
  assert.equal((await apply({ payload: { itemDir: '/task', itemType: 'task' } })).reason, 'type-has-no-record-doc');
  assert.equal(writes.length, 1);
});

test('rollback preserves document faults while treating only its idempotent refusal as skipped', async () => {
  let failure = Object.assign(new Error('not applicable'), { code: 'rollback-not-applicable' });
  const contribution = createWorkEffects(async () => ({ typeHasRecordDoc: () => true, rollbackItemStatus: async () => { throw failure; } }));
  const apply = contribution.events['run.completed'][0].apply;
  assert.equal((await apply({ payload: { outcome: 'failed' } })).reason, 'rollback-not-applicable');
  failure = Object.assign(new Error('broken document'), { code: 'record-doc-unusable' });
  await assert.rejects(apply({ payload: { outcome: 'failed' } }), error => error === failure);
});

test('reindex matches current items by new ref and skips disappeared items', async () => {
  const rewritten = [];
  const contribution = createWorkEffects(async () => ({
    loadWorkspace: async () => ({ workDir: '/work' }), listItems: async () => [{ ref: '2', dir: '/work/2' }],
    rewriteRunItemRef: async (item, remap) => { rewritten.push({ item, remap }); return { rewritten: 1 }; },
  }));
  const result = await contribution.events['stream.reindexed'][0].apply({ payload: { workspaceRoot: '/repo', remap: [{ from: '1', to: '2' }, { from: '2', to: '3' }] } });
  assert.equal(result.rewritten, 1);
  assert.deepEqual(rewritten[0].remap, { from: '1', to: '2' });
});

test('harness evidence keeps the ruling identity and never silently skips a malformed root', async () => {
  const calls = [], failure = new Error('missing root');
  const contribution = createWorkEffects(async () => ({ appendRuling: async (...args) => { calls.push(args); throw failure; } }));
  await assert.rejects(contribution.events['harness.ruled'][0].apply({ eventId: 'event', payload: { rulingId: 'ruling', ruling: {} } }), error => error === failure);
  assert.deepEqual(calls, [[undefined, { rulingId: 'ruling', ruling: {} }]]);
});
