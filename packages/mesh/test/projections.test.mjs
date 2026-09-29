import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createMeshStore } from '@aof/mesh/store';
import { createMeshPresence } from '@aof/mesh/presence';
import { createGlobalNodeRegistry } from '@aof/mesh/global-node-registry';
import { createGlobalMeshQuery } from '@aof/mesh/global-query';
import { createGlobalWorkPublisher } from '@aof/mesh/publisher';
import { createGlobalWorkProjectionStore, GLOBAL_WORK_SCHEMA_VERSION } from '@aof/mesh/projection-store';
import { assembleAssignmentRecord, insertAssignment, readAssignment } from '@aof/mesh/assignment-record';

async function fixture(t) {
  const parent = await realpath(os.tmpdir());
  const root = await mkdtemp(path.join(parent, 'aof-mesh-projections-'));
  t.after(async () => { assert.equal(path.dirname(await realpath(root)), parent); await rm(root, { recursive: true, force: true }); });
  const meshRoot = path.join(root, 'mesh');
  const paths = { meshRoot, workRoot: path.join(meshRoot, 'work'), databasePath: path.join(meshRoot, 'work', 'global.db'), nodesRoot: path.join(meshRoot, 'descriptors', 'nodes'), workspacesRoot: path.join(meshRoot, 'descriptors', 'workspaces') };
  const globalMeshPaths = () => paths;
  const reportDegrade = () => {};
  const services = createGlobalWorkProjectionStore({
    globalMeshPaths, reportDegrade, importSqliteRuntime: () => import('node:sqlite'),
    workspaceIdFromPath: () => 'workspace', resolveWorkspaceId: () => 'workspace',
    listItems: async () => [], tableClass: table => table === 'projection_errors' ? 'projection' : 'fact',
    toWireProvenance: value => value,
  });
  const workDir = path.join(root, 'repo', 'wiki', 'work');
  await mkdir(workDir, { recursive: true });
  const workspace = { projectRoot: path.join(root, 'repo'), workDir, globalMeshRoot: meshRoot, config: { name: 'fixture', work: { dir: './wiki/work' }, mesh: { enabled: true, nodeId: 'peer' } } };
  await mkdir(path.join(workspace.projectRoot, '.aof'));
  await writeFile(path.join(workspace.projectRoot, '.aof', 'aof.config.json'), '{}');
  return { paths, workspace, services, globalMeshPaths, reportDegrade };
}

test('projection construction is inert and unavailable SQLite retains its coded refusal', async () => {
  let imports = 0;
  const services = createGlobalWorkProjectionStore({ importSqliteRuntime: async () => { imports++; throw Error('fixture unavailable'); } });
  assert.equal(imports, 0);
  await assert.rejects(services.openGlobalWorkProjectionStore({ paths: {}, sqlite: false }), error => error.code === 'sqlite-unavailable');
  assert.equal(imports, 0);
});

test('SQLite schema and snapshot publication preserve assignment facts', async t => {
  const { services, workspace } = await fixture(t);
  const store = await services.openGlobalWorkProjectionStore();
  try {
    assert.equal(store.schemaVersion, GLOBAL_WORK_SCHEMA_VERSION);
    const record = assembleAssignmentRecord({ assignmentId: 'assignment', itemRef: '01/01', workspaceId: 'workspace', targetNodeId: 'peer', issuer: 'operator', now: '2026-01-01' });
    insertAssignment(store, record);
    const before = readAssignment(store, record.assignmentId);
    await services.publishWorkspaceSnapshot(store, workspace, { now: '2026-01-01', nodeId: 'peer' });
    assert.deepEqual(readAssignment(store, record.assignmentId), before);
    assert.throws(() => services.wholesaleDelete(store.db, 'global_assignments', 'workspace'), error => error.code === 'fact-table-wholesale-delete');
    assert.equal(services.queryGlobalWorkProjection(store).workspaces.length, 1);
  } finally { store.close(); }
});

test('node publication and fleet query join real descriptors, presence and membership without closing borrowed stores', async t => {
  const { services, workspace, paths, globalMeshPaths, reportDegrade } = await fixture(t);
  const store = await services.openGlobalWorkProjectionStore();
  try {
    const nodeStore = createMeshStore({ globalMeshPaths });
    const presence = createMeshPresence({ ...nodeStore });
    const registry = createGlobalNodeRegistry({ ...nodeStore, ...presence, globalMeshPaths, reportDegrade, resolveWorkspaceId: () => 'workspace', resolveCloneUrl: () => null });
    await nodeStore.publishNodeRecord(workspace, 'peer', { nodeId: 'peer', host: 'fixture', os: 'test', runtimes: ['codex'] });
    await presence.publishPresenceRecord(workspace, 'peer', presence.assemblePresenceRecord({ nodeId: 'peer', heartbeatAt: '2026-01-01', activeRuns: ['run'], sessions: [], aofVersion: 'fixture' }));
    await registry.publishGlobalRegistryDescriptorsToStore(store, workspace, { now: '2026-01-01', fabricPeers: [] });
    const query = createGlobalMeshQuery({ ...services, ...registry, globalMeshPaths, resolveCacheStalenessSeconds: () => 300 });
    const status = await query.queryGlobalMeshStatus({ store, paths, now: '2026-01-01' });
    assert.equal(status.nodes[0].nodeId, 'peer');
    assert.equal(status.workspaces[0].workspaceId, 'workspace');
    assert.equal((await registry.queryGlobalRegistry(store, { now: '2026-01-01' })).nodes[0].presence.activeRuns[0], 'run');
    assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM global_node_workspaces').get().n, 1);
    const descriptor = JSON.parse(await readFile(path.join(paths.workspacesRoot, 'workspace.json'), 'utf8'));
    assert.equal(descriptor.workDir, workspace.workDir);
  } finally { store.close(); }
});

test('publishing an opted-out workspace stays inert and store failures remain warnings', async t => {
  const { workspace, globalMeshPaths } = await fixture(t);
  let opens = 0;
  const publisher = createGlobalWorkPublisher({ globalMeshPaths, openGlobalWorkProjectionStore: async () => { opens++; throw Error('fixture open failure'); } });
  const skipped = await publisher.publishGlobalWorkSnapshot({ ...workspace, config: {} });
  assert.equal(skipped.skipped, true);
  assert.equal(opens, 0);
  const failed = await publisher.publishGlobalWorkSnapshot(workspace);
  assert.equal(failed.published, false);
  assert.ok(failed.warning);
  assert.equal(opens, 1);
});

test('global query maps store-open errors to the stable API refusal and configured database path', async () => {
  const { globalStoreError } = createGlobalWorkProjectionStore({});
  const paths = { databasePath: '/fixture/global.db' };
  const query = createGlobalMeshQuery({ globalStoreError, globalMeshPaths: () => paths, openGlobalWorkProjectionStore: async () => { throw Error('fixture unavailable'); } });
  await assert.rejects(query.queryGlobalMeshStatus(), error => error.code === 'global-store-unavailable' && error.status === 503 && error.message.includes(paths.databasePath));
});
