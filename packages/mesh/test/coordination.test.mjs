import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { meshRole, resolveWorkerStreamTarget } from '@aof/mesh/role';
import { createAssignmentReclaim } from '@aof/mesh/assignment-reclaim';
import { createMeshResync, RESYNC_OWNER_NOT_CONNECTED } from '@aof/mesh/resync';
import { createRecoveryPush } from '@aof/mesh/recovery-push';
import { createMeshParkResumeServices } from '@aof/mesh/park-resume';

test('role resolution leaves standalone and control nodes independent of fabric access', async () => {
  const config = { mesh: { relay: { controlNode: 'control' } } };
  assert.equal(meshRole(config, 'worker'), 'worker');
  const exec = () => { throw Error('unexpected fabric access'); };
  assert.deepEqual(await resolveWorkerStreamTarget({}, 'worker', { exec }), { role: 'standalone', target: null });
  assert.deepEqual(await resolveWorkerStreamTarget(config, 'control', { exec }), { role: 'control', target: null });
});

test('reclaim requires both shared clocks and gives fresh or unknown presence precedence', () => {
  let heartbeatReads = 0;
  const { dualStalenessDecision } = createAssignmentReclaim({
    isNodeStale: (record, now, threshold) => now - Date.parse(record.heartbeatAt) > threshold,
    isStale: (record, now, threshold) => { heartbeatReads++; return now - Date.parse(record.heartbeatAt) > threshold; },
  });
  const now = Date.parse('2026-01-01T00:01:00Z');
  const bounds = { presenceThresholdMs: 1000, heartbeatThresholdMs: 2000 };
  const heartbeatAt = new Date(now - 3000).toISOString();
  assert.equal(dualStalenessDecision({ presence: null, heartbeatAt }, now, bounds), false);
  assert.equal(dualStalenessDecision({ presence: { heartbeatAt: new Date(now - 1000).toISOString() }, heartbeatAt }, now, bounds), false);
  assert.equal(heartbeatReads, 0);
  assert.equal(dualStalenessDecision({ presence: { heartbeatAt }, heartbeatAt }, now, bounds), true);
  assert.equal(dualStalenessDecision({ presence: { heartbeatAt }, heartbeatAt: new Date(now).toISOString() }, now, bounds), false);
  assert.equal(heartbeatReads, 2);
});

test('resync loads storage on demand, reports a disconnected owner and closes its handle', async t => {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  let loads = 0, closes = 0;
  const store = { db, close: () => closes++ };
  const api = createMeshResync({ loadProjectionStore: async () => { loads++; return { openGlobalWorkProjectionStore: async () => store }; } });
  assert.equal(loads, 0);
  api.requestResync(store, { workspaceId: 'workspace', itemRef: '42', targetNodeId: 'worker' });
  assert.deepEqual(await api.runResyncDispatchTick({ directiveTargets: new Map() }), { drained: 1 });
  const row = api.readResync(store, 'workspace', '42');
  assert.equal(row.state, 'failed');
  assert.equal(row.detail, RESYNC_OWNER_NOT_CONNECTED);
  assert.equal(loads, 1);
  assert.equal(closes, 1);
});

test('recovery retains disconnected requests for retry and closes storage after credential refusal', async t => {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  let loads = 0, closes = 0;
  const store = { db, close: () => closes++ };
  const api = createRecoveryPush({ loadProjectionStore: async () => { loads++; return { openGlobalWorkProjectionStore: async () => store }; } });
  assert.equal(loads, 0);
  api.requestRecoveryPush(store, { assignmentId: 'assignment', workspaceId: 'workspace', itemRef: '42', targetNodeId: 'worker' });
  await api.runRecoveryPushDispatchTick({ directiveTargets: new Map() });
  assert.equal(api.readRecoveryPush(store, 'assignment').state, 'requested');
  await api.runRecoveryPushDispatchTick({ directiveTargets: new Map([['worker', {}]]) }, { mintWriteCredential: async () => { throw Error('fixture refusal'); } });
  const row = api.readRecoveryPush(store, 'assignment');
  assert.equal(row.state, 'failed');
  assert.match(row.detail, /mint-failed/);
  assert.equal(loads, 2);
  assert.equal(closes, 2);
});

test('worker questions preserve Unicode bounds and defer notification services until announcement', async () => {
  let loads = 0;
  const degradations = [];
  const api = createMeshParkResumeServices({
    readAskQuestion: async () => '😀'.repeat(8001),
    loadPresence: async () => { loads++; return { resolveWorkspaceProjectRoot: async () => null }; },
    loadWork: async () => { loads++; return {}; },
    loadNotifications: async () => { loads++; return {}; },
    reportDegrade: code => degradations.push(code),
  });
  const ask = await api.readWorkerAsk({ worktreePath: '/fixture', sessionId: 'session', phase: 'build', now: () => new Date('2026-01-01') });
  assert.equal(ask.question, '😀'.repeat(8000) + '…');
  assert.equal(ask.phase, 'build');
  assert.equal(loads, 0);
  assert.equal(await api.announceWorkerAsk({ workspaceId: 'workspace', itemRef: '42', targetNodeId: 'worker' }, ask), false);
  assert.equal(loads, 3);
  assert.deepEqual(degradations, ['worker-ask-unannounced']);
});
