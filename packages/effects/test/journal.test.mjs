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

// 164/00 task 01 — the collapse key (164/ADR-003): a key owes at most one run of its work.
const mark = [{ key: 'publish-projection', locus: 'local' }];
test('164/00 E9: newer events with a collapse key supersede the older owed steps of that key', () => withJournal((api, journal) => {
  for (const [id, minute] of [['a', '01'], ['b', '02'], ['c', '03']]) {
    api.appendEvent(journal, { eventId: id, name: 'workspace.changed', payload: { digest: id }, now: `2026-10-19T10:${minute}:00.000Z`, collapseKey: 'ws:aof' }, mark);
  }
  assert.deepEqual(api.pendingSteps(journal).map(row => row.eventId), ['c']);
  assert.deepEqual(['a', 'b'].map(id => api.readStep(journal, id, 'publish-projection').status), ['superseded', 'superseded']);
  assert.deepEqual(api.readUnsettledSteps(journal).map(row => row.eventId), ['c'], 'a superseded step is settled, not owed');
  api.appendEvent(journal, { eventId: 'other', name: 'workspace.changed', payload: { digest: 'x' }, now: NOW, collapseKey: 'ws:elsewhere' }, mark);
  assert.equal(api.readStep(journal, 'c', 'publish-projection').status, 'pending', 'another key collapses nothing of this one');
}));

test('164/00 E10: appending the same keyed event twice is one event, and supersedes nothing of itself', () => withJournal((api, journal) => {
  const fact = { eventId: 'workspace-changed:aof:d1', name: 'workspace.changed', payload: { digest: 'd1' }, now: NOW, collapseKey: 'ws:aof' };
  assert.equal(api.appendEvent(journal, fact, mark).appended, true);
  assert.equal(api.appendEvent(journal, fact, mark).appended, false);
  assert.equal(api.readEvents(journal).length, 1);
  assert.equal(api.readStep(journal, fact.eventId, 'publish-projection').status, 'pending');
}));

test('164/00 E11: an event with no collapse key is never superseded by a keyed one', () => withJournal((api, journal) => {
  api.appendEvent(journal, { eventId: 'verb', name: 'item-status.changed', payload: { ref: '164/00' }, now: NOW }, mark);
  api.appendEvent(journal, { eventId: 'mark', name: 'workspace.changed', payload: { digest: 'd' }, now: NOW, collapseKey: 'ws:aof' }, mark);
  assert.equal(api.readStep(journal, 'verb', 'publish-projection').status, 'pending');
  assert.equal(api.readStep(journal, 'mark', 'publish-projection').status, 'pending');
}));

test('164/00: a schema-1 journal opens at schema 2, gains the collapse key, and keeps its owed step', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE aof_schema (key TEXT PRIMARY KEY, value INTEGER NOT NULL);
    INSERT INTO aof_schema VALUES ('version', 1);
    CREATE TABLE events (event_id TEXT PRIMARY KEY, name TEXT NOT NULL, payload TEXT NOT NULL, source TEXT, created_at TEXT NOT NULL);
    CREATE TABLE effect_steps (event_id TEXT NOT NULL, reactor_key TEXT NOT NULL, locus TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, updated_at TEXT NOT NULL, PRIMARY KEY (event_id, reactor_key));
    INSERT INTO events VALUES ('owed', 'item-status.changed', '{}', 'old-build', '2026-01-01');
    INSERT INTO effect_steps VALUES ('owed', 'publish-projection', 'local', 'pending', 0, NULL, '2026-01-01');`);
  const api = storage(), journal = api.initializeJournal({ db, databasePath: ':memory:' });
  try {
    assert.equal(EFFECTS_JOURNAL_SCHEMA_VERSION, 2);
    assert.equal(db.prepare("SELECT value FROM aof_schema WHERE key = 'version'").get().value, 2);
    assert.ok(db.prepare('PRAGMA table_info(events)').all().some(column => column.name === 'collapse_key'));
    assert.deepEqual(api.pendingSteps(journal).map(row => row.eventId), ['owed']);
    api.appendEvent(journal, { eventId: 'mark', name: 'workspace.changed', payload: {}, now: NOW, collapseKey: 'ws:aof' }, mark);
    assert.equal(api.readStep(journal, 'owed', 'publish-projection').status, 'pending', 'a pre-key event is collapsed by nothing');
  } finally { journal.close(); }
});
