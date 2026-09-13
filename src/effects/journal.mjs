// src/effects/journal.mjs — the per-node effects journal (m42 wave (d) leg d2;
// PRD-command-spine-effects-ledger). DUMB STORAGE ONLY: this module knows events
// and steps as rows, never what a reactor does (src/effects/table.mjs owns the
// vocabulary, src/effects/dispatch.mjs owns the topology). One SQLite file per
// node beside the projection (`~/.aof/mesh/work/journal.sqlite`, honoring
// AOF_GLOBAL_HOME), so a crashed process leaves PENDING steps another process
// can drain — the whole point: a consequence survives the process that owed it.
//
// The write discipline mirrors global-work-store.mjs deliberately (node:sqlite
// DatabaseSync, aof_schema version table, refuse-newer): one storage idiom, not
// two. busy_timeout is set from birth — the projection's continuous
// "database is locked" warnings (STATE 2026-07-27) are a measured lesson.
import path from "node:path";
import { importSqliteRuntime } from "../sqlite-runtime.mjs";
import { mkdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { globalMeshPaths } from "../workspace.mjs";
// m42 item 3 — every former silent catch reports a coded degrade event.
import { reportDegrade } from "../degrade.mjs";

export const EFFECTS_JOURNAL_SCHEMA_VERSION = 1;

// Step statuses: pending (owed), done (paid), failed (attempted, retryable —
// the tick/next sweep re-runs it while attempts < maxAttempts), skipped
// (vocabulary drift: the reactor key no longer exists in this build's EFFECTS).
export const STEP_STATUSES = Object.freeze(["pending", "done", "failed", "skipped"]);

function journalError(message, code, status = 500) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

// The journal's one canonical location (per node, beside the projection).
export function effectsJournalPath(options = {}) {
  if (options.databasePath) return options.databasePath;
  const paths = options.paths ?? globalMeshPaths(options);
  return path.join(paths.workRoot, "journal.sqlite");
}

// The runtime is imported through the ONE home (126/ADR-008 §1), which filters the SQLite
// ExperimentalWarning around the import and restores `process.emitWarning` in a `finally`.
// THIS BODY'S OWN BEHAVIOUR IS UNCHANGED (§2): the injected-module seam, the `DatabaseSync`
// check and this journal's own coded refusal all stay here, because the leaf decides no
// policy and the two callers' refusals are deliberately not the same refusal.
async function resolveSqlite(options = {}) {
  if (options.sqlite) return options.sqlite;
  try {
    const sqlite = await importSqliteRuntime(options);
    if (typeof sqlite.DatabaseSync !== "function") throw new Error("DatabaseSync unavailable");
    return sqlite;
  } catch {
    throw journalError("The effects journal requires a supported SQLite runtime.", "sqlite-unavailable", 501);
  }
}

export async function openEffectsJournal(options = {}) {
  const databasePath = effectsJournalPath(options);
  const sqlite = await resolveSqlite(options);
  await mkdir(path.dirname(databasePath), { recursive: true });
  const db = new sqlite.DatabaseSync(databasePath);
  try {
    db.exec("PRAGMA busy_timeout = 2000");
    const existing = readSchemaVersion(db);
    if (existing != null && existing > EFFECTS_JOURNAL_SCHEMA_VERSION) {
      throw journalError(
        `Effects journal schema ${existing} is newer than this AOF build supports (${EFFECTS_JOURNAL_SCHEMA_VERSION}) at ${databasePath}.`,
        "effects-journal-schema-unsupported",
        409,
      );
    }
    migrateSchema(db);
    return { db, databasePath, schemaVersion: EFFECTS_JOURNAL_SCHEMA_VERSION, close: () => db.close() };
  } catch (error) {
    try {
      db.close();
    } catch (closeError) {
      // Closing a failed open is best-effort; the original error is the contract.
      reportDegrade("effects-journal", closeError);
    }
    throw error;
  }
}

function readSchemaVersion(db) {
  const hasSchema = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'aof_schema'").get();
  if (!hasSchema) return null;
  const row = db.prepare("SELECT value FROM aof_schema WHERE key = 'version'").get();
  if (row == null) return 0;
  const version = Number.parseInt(String(row.value), 10);
  return Number.isFinite(version) ? version : 0;
}

function migrateSchema(db) {
  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS aof_schema (
        key TEXT PRIMARY KEY,
        value INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS events (
        event_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        payload TEXT NOT NULL,
        source TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS effect_steps (
        event_id TEXT NOT NULL,
        reactor_key TEXT NOT NULL,
        locus TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (event_id, reactor_key)
      );
      CREATE INDEX IF NOT EXISTS idx_effect_steps_status ON effect_steps (status);
    `);
    db.prepare("INSERT OR REPLACE INTO aof_schema (key, value) VALUES ('version', ?)").run(EFFECTS_JOURNAL_SCHEMA_VERSION);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function mintEventId(nowIso) {
  const stamp = nowIso.replace(/[-:.]/g, "");
  return `${stamp}-${randomBytes(4).toString("hex")}`;
}

// appendEvent — record one past-tense fact plus its OWED steps in one
// transaction. `reactors` is the EFFECTS[name] entry the caller (transition /
// dispatch) resolved; the journal never imports the vocabulary itself. Events
// carry their own evidence (the serialised payload), never empty pings.
export function appendEvent(journal, { eventId: suppliedEventId = null, name, payload = {}, source = null, now } = {}, reactors = []) {
  if (!name) throw journalError("An event needs a name.", "invalid-event", 400);
  const createdAt = now ?? new Date().toISOString();
  const eventId = typeof suppliedEventId === "string" && suppliedEventId.length > 0 ? suppliedEventId : mintEventId(createdAt);
  const encodedPayload = JSON.stringify(payload);
  const { db } = journal;
  db.exec("BEGIN IMMEDIATE");
  try {
    const inserted = db.prepare("INSERT OR IGNORE INTO events (event_id, name, payload, source, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(eventId, name, encodedPayload, source, createdAt).changes === 1;
    const existing = inserted
      ? null
      : db.prepare("SELECT name, payload, created_at AS createdAt FROM events WHERE event_id = ?").get(eventId);
    if (!inserted && (existing?.name !== name || existing?.payload !== encodedPayload)) {
      throw journalError(`Event id ${eventId} already names a different fact.`, "event-id-conflict", 409);
    }
    const insertStep = db.prepare(
      "INSERT OR IGNORE INTO effect_steps (event_id, reactor_key, locus, status, attempts, updated_at) VALUES (?, ?, ?, 'pending', 0, ?)",
    );
    for (const reactor of reactors) {
      insertStep.run(eventId, reactor.key, reactor.locus, createdAt);
      const step = db.prepare("SELECT locus FROM effect_steps WHERE event_id = ? AND reactor_key = ?").get(eventId, reactor.key);
      if (step?.locus !== reactor.locus) {
        throw journalError(`Event ${eventId} reactor ${reactor.key} changed locus.`, "event-step-conflict", 409);
      }
    }
    db.exec("COMMIT");
    return { eventId, createdAt: existing?.createdAt ?? createdAt, appended: inserted };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

// The drainable work-list: pending steps (plus retryable failed ones under the
// attempts ceiling), each joined to its event's evidence. Oldest first — a
// cascade's declared order is its array order at append time (insertion order
// within one event is preserved by the rowid tiebreak). `loci` narrows the fetch
// to steps at those loci (m42 wave (d) leg d4, port 4 — the unscoped sweep asks
// only for what it can run, so a deferred integration backlog cannot starve the
// limit window); absent, every locus is returned.
export function pendingSteps(journal, { eventId = null, includeFailed = true, maxAttempts = 5, limit = 100, loci = null } = {}) {
  const statuses = includeFailed ? ["pending", "failed"] : ["pending"];
  const clauses = [`s.status IN (${statuses.map(() => "?").join(", ")})`, "s.attempts < ?"];
  const params = [...statuses, maxAttempts];
  if (eventId) {
    clauses.push("s.event_id = ?");
    params.push(eventId);
  }
  if (Array.isArray(loci) && loci.length > 0) {
    clauses.push(`s.locus IN (${loci.map(() => "?").join(", ")})`);
    params.push(...loci);
  }
  const rows = journal.db.prepare(`
    SELECT s.event_id AS eventId, e.name AS name, e.payload AS payload, e.source AS source,
           e.created_at AS createdAt, s.reactor_key AS key, s.locus AS locus,
           s.status AS status, s.attempts AS attempts
    FROM effect_steps s JOIN events e ON e.event_id = s.event_id
    WHERE ${clauses.join(" AND ")}
    ORDER BY e.created_at ASC, s.rowid ASC
    LIMIT ?
  `).all(...params, limit);
  return rows.map((row) => ({ ...row, payload: safeParse(row.payload) }));
}

export function markStep(journal, eventId, key, { status, error = null, now } = {}) {
  if (!STEP_STATUSES.includes(status)) {
    throw journalError(`Unknown step status "${status}".`, "invalid-step-status", 400);
  }
  journal.db.prepare(
    "UPDATE effect_steps SET status = ?, attempts = attempts + 1, last_error = ?, updated_at = ? WHERE event_id = ? AND reactor_key = ?",
  ).run(status, error, now ?? new Date().toISOString(), eventId, key);
}

// hasEventForRun(journal, name, runId) — does an event of this name already
// name this runId in its payload? The d5 reconciler's join: run records carry a
// UNIQUE runId, which is what makes "did the crash eat my event?" answerable at
// all (record-doc bullets have no such key — their window is acknowledged, not
// scanned). json_extract, not LIKE: the payload is a JSON document, not text.
export function hasEventForRun(journal, name, runId) {
  if (!name || !runId) return false;
  const row = journal.db
    .prepare("SELECT 1 FROM events WHERE name = ? AND json_extract(payload, '$.runId') = ? LIMIT 1")
    .get(name, runId);
  return row != null;
}

export function hasEventId(journal, eventId) {
  if (!eventId) return false;
  return journal.db.prepare("SELECT 1 FROM events WHERE event_id = ? LIMIT 1").get(eventId) != null;
}

// The applied park event is the stable identity of one released slot. Resume
// carries it through the relay so a repeated delivery of the same answer remains
// one process, while a later park (a new event id) may be answered normally.
export function latestAppliedAssignmentParkEventId(journal, assignmentId, { runId = null, sessionId = null } = {}) {
  if (!assignmentId) return null;
  const row = journal.db.prepare(`
    SELECT e.event_id AS eventId
    FROM events e
    JOIN effect_steps s ON s.event_id = e.event_id
    WHERE e.name = 'assignment.reported'
      AND s.reactor_key = 'settle-assignment'
      AND s.status = 'done'
      AND json_extract(e.payload, '$.assignmentId') = ?
      AND json_extract(e.payload, '$.state') = 'running'
      AND json_extract(e.payload, '$.code') = 'needs-input'
      AND json_extract(e.payload, '$.runId') IS ?
      AND json_extract(e.payload, '$.sessionId') IS ?
    ORDER BY e.rowid DESC
    LIMIT 1
  `).get(assignmentId, runId, sessionId);
  return row?.eventId ?? null;
}

// The ledger's birth — the floor below which the reconciler never reaches (a
// record that completed before the journal existed is history, not a crash).
export function oldestEventAt(journal) {
  const row = journal.db.prepare("SELECT MIN(created_at) AS at FROM events").get();
  return row?.at ?? null;
}

// Test/diagnostic read: every step of one event (aof doctor --explain feeds from
// here in leg d5).
export function readEventSteps(journal, eventId) {
  return journal.db.prepare(
    "SELECT event_id AS eventId, reactor_key AS key, locus, status, attempts, last_error AS lastError, updated_at AS updatedAt FROM effect_steps WHERE event_id = ? ORDER BY rowid ASC",
  ).all(eventId);
}

// Generic diagnostic/gating read for consequences that are still owed. Unlike
// `pendingSteps`, this deliberately has no attempts ceiling: an exhausted failed
// step is still unsettled and must remain visible to a destructive cleanup gate.
// The journal stays vocabulary-blind — callers may narrow by reactor key, but the
// payload is returned as event evidence for them to interpret.
export function readUnsettledSteps(journal, { key = null, limit = 1000 } = {}) {
  const clause = key == null ? "" : "AND s.reactor_key = ?";
  const params = key == null ? [limit] : [key, limit];
  const rows = journal.db.prepare(`
    SELECT s.event_id AS eventId, e.name AS name, e.payload AS payload, e.source AS source,
           e.created_at AS createdAt, s.reactor_key AS key, s.locus AS locus,
           s.status AS status, s.attempts AS attempts, s.last_error AS lastError
    FROM effect_steps s JOIN events e ON e.event_id = s.event_id
    WHERE s.status IN ('pending', 'failed') ${clause}
    ORDER BY e.created_at ASC, s.rowid ASC
    LIMIT ?
  `).all(...params);
  return rows.map((row) => ({ ...row, payload: safeParse(row.payload) }));
}

export function readEvents(journal, { name = null, limit = 100 } = {}) {
  const clause = name ? "WHERE name = ?" : "";
  const params = name ? [name, limit] : [limit];
  const rows = journal.db.prepare(
    `SELECT event_id AS eventId, name, payload, source, created_at AS createdAt FROM events ${clause} ORDER BY created_at DESC LIMIT ?`,
  ).all(...params);
  return rows.map((row) => ({ ...row, payload: safeParse(row.payload) }));
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    // A corrupt payload is a degrade event, not a crash — the step row still
    // surfaces (with a null payload) so the drain can mark it failed loudly.
    reportDegrade("effects-journal-payload-parse", error);
    return null;
  }
}
