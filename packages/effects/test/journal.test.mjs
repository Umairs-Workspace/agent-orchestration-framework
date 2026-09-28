import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createEffectsJournal, EFFECTS_JOURNAL_SCHEMA_VERSION } from '@aof/effects/journal';

function storage() {
  const diagnostics = [];
  let next = 0;
  return { diagnostics, ...createEffectsJournal({ mintEventId: () => `event-${++next}`, reportDegrade: (...args) => diagnostics.push(args) }) };
}
function withJournal(run) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'aof-journal-package-'));
  const api = storage(), databasePath = path.join(dir, 'journal.sqlite');
  let journal = api.initializeJournal({ db: new DatabaseSync(databasePath), databasePath });
  const reopen = () => { journal.close(); journal = api.initializeJournal({ db: new DatabaseSync(databasePath), databasePath }); return journal; };
  try { return run(api, journal, reopen); }
  finally { journal.close(); rmSync(dir, { recursive: true, force: true }); }
}
const NOW = '2026-09-28T12:00:00.000Z';
const reactors = [{ key: 'first', locus: 'checkout' }, { key: 'second', locus: 'remote' }];

test('journal rows, step order and attempts survive closing and reopening', () => withJournal((api, journal, reopen) => {
  assert.equal(journal.schemaVersion, EFFECTS_JOURNAL_SCHEMA_VERSION);
  const { eventId } = api.appendEvent(journal, { name: 'changed', payload: { value: 3 }, source: 'test', now: NOW }, reactors);
  api.markStep(journal, eventId, 'first', { status: 'failed', error: 'offline', now: NOW });
  journal = reopen();
  assert.deepEqual(api.pendingSteps(journal).map(row => [row.key, row.attempts, row.payload]), [
    ['first', 1, { value: 3 }], ['second', 0, { value: 3 }],
  ]);
  assert.equal(api.oldestEventAt(journal), NOW);
  assert.equal(api.hasEventId(journal, eventId), true);
  assert.equal(api.readEvents(journal)[0].source, 'test');
}));

test('replayed events are idempotent and conflicting facts or loci roll back atomically', () => withJournal((api, journal) => {
  const fact = { eventId: 'stable', name: 'changed', payload: { value: 3 }, now: NOW };
  api.appendEvent(journal, fact, reactors);
  assert.equal(api.appendEvent(journal, fact, reactors).appended, false);
  assert.throws(() => api.appendEvent(journal, { ...fact, payload: {} }, reactors), { code: 'event-id-conflict' });
  assert.throws(() => api.appendEvent(journal, fact, [{ key: 'new', locus: 'local' }, { key: 'first', locus: 'wrong' }]), { code: 'event-step-conflict' });
  assert.deepEqual(api.readEventSteps(journal, 'stable').map(row => row.key), ['first', 'second']);
  assert.equal(api.readEvents(journal).length, 1);
}));

test('pending work honors scope and retry ceilings while exhausted failures remain visible', () => withJournal((api, journal) => {
  api.appendEvent(journal, { eventId: 'one', name: 'changed', now: NOW }, reactors);
  api.markStep(journal, 'one', 'first', { status: 'failed' });
  assert.deepEqual(api.pendingSteps(journal, { maxAttempts: 1 }).map(row => row.key), ['second']);
  assert.deepEqual(api.pendingSteps(journal, { loci: ['remote'], limit: 1 }).map(row => row.key), ['second']);
  assert.deepEqual(api.pendingSteps(journal, { eventId: 'absent' }), []);
  assert.equal(api.readUnsettledSteps(journal, { key: 'first' })[0].attempts, 1);
  assert.equal(api.readStep(journal, 'one', 'first').status, 'failed');
  assert.throws(() => api.markStep(journal, 'one', 'first', { status: 'invalid' }), { code: 'invalid-step-status' });
}));

test('schema version 1 databases created before extraction retain their rows', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE aof_schema (key TEXT PRIMARY KEY, value INTEGER NOT NULL);
    INSERT INTO aof_schema VALUES ('version', 1);
    CREATE TABLE events (event_id TEXT PRIMARY KEY, name TEXT NOT NULL, payload TEXT NOT NULL, source TEXT, created_at TEXT NOT NULL);
    CREATE TABLE effect_steps (event_id TEXT NOT NULL, reactor_key TEXT NOT NULL, locus TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, updated_at TEXT NOT NULL, PRIMARY KEY (event_id, reactor_key));
    INSERT INTO events VALUES ('old', 'before.extraction', '{"preserved":true}', 'old-build', '2026-01-01');
    INSERT INTO effect_steps VALUES ('old', 'apply', 'checkout', 'failed', 2, 'offline', '2026-01-01');`);
  const api = storage(), journal = api.initializeJournal({ db, databasePath: ':memory:' });
  try {
    assert.deepEqual(api.readEvents(journal)[0].payload, { preserved: true });
    assert.equal(api.pendingSteps(journal)[0].attempts, 2);
    assert.equal(api.readEventSteps(journal, 'old')[0].lastError, 'offline');
  } finally { journal.close(); }
});

test('newer schemas are refused without migration and a failed open closes the connection', () => {
  const db = new DatabaseSync(':memory:');
  db.exec("CREATE TABLE aof_schema (key TEXT PRIMARY KEY, value INTEGER NOT NULL); INSERT INTO aof_schema VALUES ('version', 99)");
  assert.throws(() => storage().initializeJournal({ db, databasePath: 'future.sqlite' }), { code: 'effects-journal-schema-unsupported', status: 409 });
  assert.throws(() => db.prepare('SELECT 1'), /not open/);
});

test('close failures report diagnostics without replacing the original open failure', () => {
  const api = storage(), original = new Error('schema read failed'), closeError = new Error('close failed');
  const db = { exec() { throw original; }, close() { throw closeError; } };
  assert.throws(() => api.initializeJournal({ db, databasePath: 'failed.sqlite' }), error => error === original);
  assert.deepEqual(api.diagnostics, [['effects-journal', closeError]]);
});

test('corrupt payloads remain visible with diagnostics', () => withJournal((api, journal) => {
  api.appendEvent(journal, { eventId: 'corrupt', name: 'changed', now: NOW }, reactors);
  journal.db.prepare('UPDATE events SET payload = ? WHERE event_id = ?').run('{bad', 'corrupt');
  assert.equal(api.pendingSteps(journal)[0].payload, null);
  assert.equal(api.readEvents(journal)[0].payload, null);
  assert.ok(api.diagnostics.every(([code]) => code === 'effects-journal-payload-parse'));
  assert.ok(api.diagnostics.length > 0);
}));
