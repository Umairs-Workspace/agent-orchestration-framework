import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createWorkDoctor } from '../src/doctor/index.mjs';
import { createDoctorDiagrams } from '../src/doctor/diagrams.mjs';
import { isDriver } from '../src/dependencies.mjs';
import { syncGroup, syncLine, syncSummary, durationLabel } from '../src/doctor/sync.mjs';

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

test('diagram checks receive caller configuration without loading application configuration', () => {
  const seen = [];
  const api = createDoctorDiagrams({ resolveWorkDiagrams: config => { seen.push(config); return { enabled: true, formats: ['svg', 'png'] }; } });
  assert.deepEqual(seen, []);
  const config = { supplied: true };
  assert.deepEqual(api.diagramsGroup({ items: [] }, { config }), []);
  assert.deepEqual(seen, [config]);
});

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
