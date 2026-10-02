import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createMeshStore } from '@aof/mesh/store';
import { createMeshRegistry } from '@aof/mesh/registry';
import { createMeshSessions } from '@aof/mesh/session';
import { createMeshLauncherLock } from '@aof/mesh/launcher-lock';
import { writeRepoPublishedMarker } from '@aof/mesh/repo-marker';
import { probeFabric } from '@aof/mesh/fabric';
import { createRunStore } from '@aof/execution/runs';

async function fixture(t) {
  const parent = await realpath(os.tmpdir());
  const root = await mkdtemp(path.join(parent, 'aof-mesh-persistence-'));
  t.after(async () => {
    assert.equal(path.dirname(await realpath(root)), parent);
    await rm(root, { recursive: true, force: true });
  });
  const globalMeshPaths = () => ({ meshRoot: path.join(root, 'mesh') });
  return { root, globalMeshPaths, store: createMeshStore({ globalMeshPaths }) };
}

test('node storage preserves opaque records and confines hostile ids to one leaf', async t => {
  const { store, globalMeshPaths } = await fixture(t);
  const record = { id: '../peer/sub', future: { mixed: [1, null, false] } };
  await store.publishNodeRecord({}, record.id, record);
  assert.equal(path.dirname(store.nodeRecordPath({}, record.id)), path.join(globalMeshPaths().meshRoot, 'nodes'));
  assert.deepEqual(await store.readNodeRecord({}, record.id), record);
  await writeFile(path.join(globalMeshPaths().meshRoot, 'nodes', 'torn.json'), '{');
  assert.deepEqual(await store.readNodeRecords({}), [record]);
  assert.equal(await store.readNodeRecord({}, 'missing'), null);
});

test('registry enforces its writer, rejects corruption and verifies live revocations', async t => {
  const { store } = await fixture(t);
  const registry = createMeshRegistry(store);
  const config = { mesh: { nodeId: 'control', relay: { controlNode: 'control' } } };
  const proof = createHash('sha256').update('fixture-token').digest('hex');
  const value = registry.admitNode({ ...registry.emptyRegistry(), future: [1] }, { nodeId: 'peer', admittedAt: '2026-01-01', relayAuthHash: proof });
  await registry.writeRegistry({}, value, config);
  const before = await readFile(registry.registryPath({}), 'utf8');
  assert.equal((await registry.writeRegistry({}, {}, {})).written, false);
  assert.equal(await readFile(registry.registryPath({}), 'utf8'), before);
  assert.deepEqual(await registry.readRegistry({}), value);
  assert.equal(registry.verifyCredential(value, 'fixture-token').ok, true);
  const revoked = registry.appendRevocation(value, { nodeId: 'peer', revokedAt: '2026-01-01' });
  assert.equal(registry.verifyCredential(revoked, 'fixture-token').reason, 'revoked');
  const invite = registry.appendPendingInvite(value, { codeHash: 'fixture-hash', issuedAt: '2026-01-01', expiresAt: '2026-01-02' });
  assert.equal(registry.isInvitePending(invite.pending[0], '2026-01-02'), true);
  assert.equal(registry.isInviteConsumed(registry.consumePendingInvite(invite, 'fixture-hash', '2026-01-02').pending[0]), true);
  await writeFile(registry.registryPath({}), '{');
  await assert.rejects(registry.readRegistry({}), SyntaxError);
});

test('session persistence uses execution TTL, retains relay facts and ends only one sibling', async t => {
  const { store } = await fixture(t);
  const reportDegrade = () => {};
  const { isStale } = createRunStore({ reportDegrade, getAnswerTokens: () => 0, readSessionAnswers: async () => [] });
  const sessions = createMeshSessions({ ...store, isStale, reportDegrade });
  const key = { nodeId: 'peer', workspaceId: 'repo', assistant: 'claude', sessionId: 'one', repo: '/fixture' };
  const now = '2026-01-01T00:00:00.000Z';
  const record = await sessions.startSession({}, { ...key, relaying: true, now });
  await sessions.startSession({}, { ...key, sessionId: 'two', now });
  const ping = await sessions.pingSession({}, { ...key, relaying: false, now });
  assert.equal(ping.relaying, true);
  assert.equal(sessions.isSessionLive(record, Date.parse(now) + 120000, 120000), true);
  assert.equal(sessions.isSessionLive(record, Date.parse(now) + 120001, 120000), false);
  await sessions.endSession({}, key);
  assert.equal(await sessions.readSessionRecord({}, key), null);
  assert.equal((await sessions.readSessionRecordsForNode({}, 'peer')).length, 1);
});

test('launcher ownership prevents contention and stale release from removing a successor', async t => {
  const { globalMeshPaths } = await fixture(t);
  const locks = createMeshLauncherLock({ globalMeshPaths, reportDegrade: () => {} });
  const options = { pid: 12345, isProcessAlive: () => true };
  const first = await locks.acquireMeshLauncherLock(options);
  assert.equal(first.acquired, true);
  assert.equal((await locks.acquireMeshLauncherLock(options)).acquired, false);
  await first.release();
  const successor = await locks.acquireMeshLauncherLock(options);
  assert.equal(successor.acquired, true);
  await first.release();
  assert.equal((await locks.readMeshLauncherLockStatus(options)).running, true);
  await successor.release();
});

test('repository publication preserves config and strips detected URL credentials; undeclared fabric stays inert', async t => {
  const { root } = await fixture(t);
  const configPath = path.join(root, 'config.json');
  await writeFile(configPath, JSON.stringify({ other: { untouched: true }, mesh: { nodeId: 'peer' } }));
  await writeRepoPublishedMarker({ configPath, workspaceId: 'repo', projectRoot: root, now: '2026-01-01', gitRemoteExec: async () => 'https://fixture:secret@example.test/repo.git' });
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  assert.deepEqual(config.other, { untouched: true });
  assert.equal(config.mesh.nodeId, 'peer');
  assert.equal(config.mesh.repo.cloneUrl, 'https://example.test/repo.git');
  assert.equal((await probeFabric({}, { exec: () => { throw Error('must not spawn'); } })).reason, 'fabric-undeclared');
});
