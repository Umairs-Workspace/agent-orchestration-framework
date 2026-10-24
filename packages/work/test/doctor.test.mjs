import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createWorkDoctor } from '../src/doctor/index.mjs';
import { isDriver } from '../src/dependencies.mjs';
import { syncGroup, syncLine, syncSummary, durationLabel } from '../src/doctor/sync.mjs';
import { daemonCostGroup, ageLabel } from '../src/doctor/daemon-cost.mjs';
import { statusCoherenceGroup, lifecycleCompletenessGroup } from '../src/doctor/coherence.mjs';

async function scratch(run) {
  const parent = await realpath(os.tmpdir());
  const root = await mkdtemp(path.join(parent, 'aof-doctor-package-'));
  try { await run(root); }
  finally { assert.equal(path.dirname(await realpath(root)), parent); await rm(root, { recursive: true, force: true }); }
}

test('doctor reads execution only when a record exists and uses supplied projection', () => scratch(async root => {
  const calls = [];
  const diagramsGroup = () => [];
  const api = createWorkDoctor({ diagramsGroup,
    readRuns: async item => { calls.push(['read', item.ref]); return [{ id: 'injected-run' }]; },
    projectExecution: input => { calls.push(['project', input]); return { engagements: [{ loop: 'injected-loop' }] }; },
  });
  assert.deepEqual(calls, []);
  assert.equal(api.isDriver, isDriver, 'doctor uses the shared driver predicate');
  assert.ok(api.CHECK_GROUPS.includes(diagramsGroup), 'the supplied diagram policy owns its check');
  const dir = path.join(root, '12_milestone_fixture');
  await mkdir(dir);
  const record = '---\nstatus: planned\n---\n# Fixture\n';
  await writeFile(path.join(dir, 'SPEC.md'), record);
  const first = await api.buildSnapshot(root);
  assert.equal(first.items.length, 1);
  assert.deepEqual(calls, [], 'an absent execution record does not read runs');
  await writeFile(path.join(dir, 'EXECUTION.md'), '# Execution\n');
  const second = await api.buildSnapshot(root);
  assert.deepEqual(calls, [['read', '12'], ['project', { registry: [], runs: [{ id: 'injected-run' }], config: {} }]]);
  assert.deepEqual(second.items[0].loopEngagements, ['injected-loop']);
  assert.equal(await readFile(path.join(dir, 'SPEC.md'), 'utf8'), record, 'the snapshot does not rewrite records');
}));

// 164/03 — the sync lane is a pure function of the facts the command edge hands it.

test('164/03 the sync lane reports nothing when no sync facts were read', () => {
  assert.deepEqual(syncSummary({ items: [], workDir: '/w' }, 0), []);
  assert.deepEqual(syncGroup({ items: [], workDir: '/w', sync: null }, { now: 0 }), []);
});

test('164/03 the sync lane groups owed steps per workspace, counts this workspace\'s changes, and warns', () => {
  const now = Date.parse('2026-10-19T12:00:00.000Z');
  const snapshot = {
    workDir: '/w/aof/wiki/work',
    items: [{ changedSinceSync: true }, { changedSinceSync: false }, { changedSinceSync: true }],
    sync: {
      workspaceId: 'ws-aof', name: 'aof',
      workspaces: [{ workspaceId: 'ws-aof', name: 'aof', lastSyncedAt: '2026-10-19T10:00:00.000Z' }, { workspaceId: 'ws-other', name: 'other', lastSyncedAt: '2026-10-19T11:00:00.000Z' }],
      owed: [
        { workspaceId: 'ws-other', createdAt: '2026-10-19T11:20:00.000Z', attempts: 7, status: 'failed', lastError: 'database is locked' },
        { workspaceId: 'ws-other', createdAt: '2026-10-19T11:50:00.000Z', attempts: 1, status: 'failed', lastError: 'older' },
      ],
    },
  };
  const [aof, other] = syncSummary(snapshot, now);
  assert.deepEqual([aof.owed, aof.changed, aof.current], [false, 2, true]);
  assert.deepEqual([other.owed, other.owedSince, other.attempts, other.lastError, other.changed], [true, '2026-10-19T11:20:00.000Z', 7, 'database is locked', null]);
  assert.equal(durationLabel(other.owedForMs), '40m');
  const findings = syncGroup(snapshot, { now });
  assert.deepEqual(findings.map((finding) => [finding.code, finding.severity, finding.path]), [['sync-behind', 'warn', '/w/aof/wiki/work'], ['sync-failing', 'warn', '/w/aof/wiki/work']]);
  assert.match(syncLine(other, now), /^sync: other — owed 40m, 7 attempts, last error: database is locked/);
  assert.match(syncLine(aof, now), /^sync: aof — 2 record\(s\) changed and not yet synced/);
});

test('164/03 an owed step not yet attempted is shown as owed but is not failing', () => {
  const snapshot = { workDir: '/w', items: [], sync: { workspaceId: 'a', name: 'a', workspaces: [], owed: [{ workspaceId: 'a', createdAt: '2026-10-19T11:59:00.000Z', attempts: 0, status: 'pending', lastError: null }] } };
  assert.equal(syncSummary(snapshot, Date.parse('2026-10-19T12:00:00.000Z'))[0].owed, true);
  assert.deepEqual(syncGroup(snapshot, { now: Date.parse('2026-10-19T12:00:00.000Z') }), []);
});

// 167/00 — the daemon-cost lane is a pure function of the snapshots the command edge hands it.
// Traceability: 167_milestone_daemon-stays-within-a-resource-budget/stories/00_story_the-daemon-says-what-it-costs/
//   tasks/01_status-and-doctor-say-what-it-costs.feature (R3; E7 runs through the real edge in
//   test/mesh/identity/mesh-identity-status-commands.test.mjs).
const COST_NOW = Date.parse('2026-10-20T18:30:00.000Z');
const costAt = (clock, { cpuPercent = 1, state = 'idle', topCauses = [] } = {}) => ({ daemon: 'serve', at: `2026-10-20T${clock}.000Z`, cpuPercent, state, topCauses });
const costFindings = (snapshots) => daemonCostGroup({ workDir: '/w/aof/wiki/work' }, { now: COST_NOW, daemonCost: { nodeId: 'node-7297', snapshots } });
const costCodes = (findings) => findings.map((finding) => finding.code);

test('167/00 E8 · a daemon that stopped reporting is warned on', () => {
  const findings = costFindings([{ ...costAt('18:28:00'), daemon: 'ui' }]);
  assert.deepEqual(costCodes(findings), ['daemon-not-reporting']);
  assert.equal(findings[0].severity, 'warn');
  for (const part of ['ui', '2 minutes']) assert.ok(findings[0].message.includes(part), `names "${part}": ${findings[0].message}`);
  assert.equal(ageLabel(50), '50 seconds');
});

test('167/00 E9 · daemons under budget raise nothing', () => {
  const findings = costFindings([costAt('18:29:50', { cpuPercent: 1.5, state: 'idle' }), { ...costAt('18:29:52', { cpuPercent: 6, state: 'viewer-open' }), daemon: 'ui' }]);
  assert.deepEqual(costCodes(findings).filter((code) => code === 'daemon-over-budget' || code === 'daemon-not-reporting'), []);
  assert.deepEqual(daemonCostGroup({ workDir: '/w' }, { now: COST_NOW, daemonCost: null }), [], 'no facts read, nothing said');
});

for (const [share, state, over] of [[2, 'idle', false], [2.1, 'idle', true], [10, 'viewer-open', false], [11, 'viewer-open', true]]) {
  test(`167/00 the judgement holds at the budget's edges — ${share}% ${state}`, () => {
    const findings = costFindings([costAt('18:29:50', { cpuPercent: share, state })]);
    const raised = findings.filter((finding) => finding.code === 'daemon-over-budget');
    assert.equal(raised.length, over ? 1 : 0, JSON.stringify(findings));
    if (over) assert.ok(raised[0].message.startsWith('serve:'), 'the warn names "serve"');
  });
}

// 168/00 task 01, R3 — the doctor's lifecycle lanes skip a prototype (ADR-005 §3), whatever its status.
test('168/00 the coherence and lifecycle lanes report nothing on a prototype in any of its statuses', () => {
  for (const status of ['active', 'paused', 'done', 'abandoned']) {
    const snapshot = { items: [{ ref: '169', number: '169', type: 'prototype', parent: null, dir: '/w/169_prototype_x', meta: { status }, docs: {}, hasTasks: false }] };
    assert.deepEqual(statusCoherenceGroup(snapshot), [], status);
    assert.deepEqual(lifecycleCompletenessGroup(snapshot), [], status);
  }
});
