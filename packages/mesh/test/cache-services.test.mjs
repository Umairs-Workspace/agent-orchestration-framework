import assert from 'node:assert/strict';
import test from 'node:test';
import { createCacheReader } from '@aof/mesh/cache-read';
import { createExecutionOverlay } from '@aof/mesh/execution-overlay';
import { createResyncCommand } from '@aof/mesh/commands/resync';
import { createResyncContribution } from '@aof/mesh/commands';
import { createCommandRegistry } from '@aof/contracts/commands';
import { cacheFreshness, toWireProvenance } from '@aof/contracts/cache-provenance';
import { resolveCacheStalenessSeconds } from '@aof/mesh/cache-policy';

test('cache reader borrows one batch store and preserves unknown provenance', async () => {
  let opens = 0;
  let closes = 0;
  const store = { close() { closes++; } };
  const projectionStore = {
    openGlobalWorkProjectionStore: async () => { opens++; return store; },
    readWorkspaceItems: () => [{ ref: '01', title: 'remote' }],
    readWorkspaceItemProvenance: () => new Map([['01', { nodeId: null, updatedAt: null }]]),
  };
  const reader = createCacheReader({ projectionStore, globalMeshPaths: () => ({}), reportDegrade() {} });
  assert.equal(opens, 0);
  const batch = reader.sharedProjectionStore();
  const workspace = { config: { mesh: { workspaceId: 'fixture' } } };
  const [first, second] = await Promise.all([
    reader.readCachedItemRows(workspace, batch), reader.readCachedItemRows(workspace, batch),
  ]);
  assert.equal(first.rows.get('01').title, 'remote');
  assert.deepEqual(second.provenance.get('01'), { reportedBy: null, syncedAt: null });
  assert.equal(opens, 1);
  assert.equal(closes, 0);
  batch.close();
  assert.equal(closes, 1);
});

test('cache and execution readers degrade to their existing local fallback', async () => {
  const services = {
    openGlobalWorkProjectionStore: async () => { throw Error('offline'); },
    globalMeshPaths: () => ({}), reportDegrade() {},
  };
  const reader = createCacheReader({ ...services, projectionStore: services });
  const overlay = createExecutionOverlay(services);
  const workspace = { projectRoot: '/fixture' };
  assert.equal(await reader.readCachedItemRows(workspace), null);
  assert.deepEqual(await reader.readWorkerItems(workspace, { refs: ['01'] }), new Map());
  const rows = [{ ref: '01', status: 'not-started' }];
  assert.equal(overlay.applyExecutionOverlay(rows, await overlay.readExecutionOverlay(workspace)), rows);
  assert.equal(overlay.applyExecutionOverlay(rows, new Map([['01', { state: 'assigned' }]]))[0].status, 'not-started');
  assert.equal(overlay.applyExecutionOverlay(rows, new Map([['01', { state: 'running' }]]))[0].status, 'in-progress');
});

test('provenance contracts preserve explicit unknowns and strict freshness boundaries', () => {
  assert.deepEqual(toWireProvenance({}), { reportedBy: null, syncedAt: null });
  const nowMs = Date.parse('2026-09-29T12:00:00Z');
  assert.equal(cacheFreshness(null, { nowMs, stalenessSeconds: 0 }), 'unknown');
  assert.equal(cacheFreshness('2026-09-29T12:00:00Z', { nowMs, stalenessSeconds: 0 }), 'fresh');
  assert.equal(cacheFreshness('2026-09-29T12:00:00Z', { nowMs: nowMs + 1, stalenessSeconds: 0 }), 'stale');
  assert.equal(resolveCacheStalenessSeconds({ mesh: { cache: { stalenessSeconds: 0 } } }), 0);
});

test('mesh contribution keeps work resync outcomes and never equates dispatch with freshness', async () => {
  let requests = 0;
  let closed = 0;
  let state = 'dispatched';
  let owner = 'peer';
  const { resyncCommand } = createResyncCommand({
    openGlobalWorkProjectionStore: async () => ({ close() { closed++; } }),
    readWorkspaceItemProvenance: () => new Map([['01', { nodeId: owner }]]),
    globalMeshPaths: () => ({}), requestResync() { requests++; },
    readResync: () => ({ state, detail: 'resync-owner-unreachable' }),
  });
  const registry = createCommandRegistry([createResyncContribution(resyncCommand)]);
  const ctx = { workspace: { config: { mesh: { workspaceId: 'fixture', nodeId: 'self' } } }, timeoutMs: 0 };
  const invoke = () => registry.invoke('work:resync', { ref: '01' }, ctx);
  assert.deepEqual(resyncCommand.cli.route, ['work', 'resync']);
  const accepted = await invoke();
  assert.equal(accepted.code, 'resync-requested');
  assert.match(accepted.message, /Asked peer to push/);
  assert.equal(Object.hasOwn(accepted, 'syncedAt'), false);
  state = 'requested';
  assert.equal((await invoke()).code, 'resync-pending');
  state = 'failed';
  assert.equal((await invoke()).code, 'resync-owner-unreachable');
  owner = 'self';
  assert.equal((await invoke()).code, 'resync-owner-is-self');
  owner = null;
  assert.equal((await invoke()).code, 'resync-no-owner');
  assert.equal(requests, 3);
  assert.equal(closed, 5);
});
