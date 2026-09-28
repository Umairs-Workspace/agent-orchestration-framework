// Application adapter for the per-node effects journal. The package owns storage;
// this module supplies SQLite loading, the existing mesh/work path, IDs and diagnostics.
// Run and assignment queries remain here until their domain packages are extracted.
import path from "node:path";
import { importSqliteRuntime } from "../sqlite-runtime.mjs";
import { mkdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { globalMeshPaths } from "../workspace.mjs";
// m42 item 3 — every former silent catch reports a coded degrade event.
import { reportDegrade } from "../degrade.mjs";

import { createEffectsJournal, EFFECTS_JOURNAL_SCHEMA_VERSION, STEP_STATUSES } from "@aof/effects/journal";
export { EFFECTS_JOURNAL_SCHEMA_VERSION, STEP_STATUSES };

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

function mintEventId(nowIso) {
  const stamp = nowIso.replace(/[-:.]/g, "");
  return `${stamp}-${randomBytes(4).toString("hex")}`;
}


const storage = createEffectsJournal({ mintEventId, reportDegrade });
export const { appendEvent, pendingSteps, markStep, hasEventId, oldestEventAt, readEventSteps, readUnsettledSteps, readEvents, readStep } = storage;

export async function openEffectsJournal(options = {}) {
  const databasePath = effectsJournalPath(options);
  const sqlite = await resolveSqlite(options);
  await mkdir(path.dirname(databasePath), { recursive: true });
  return storage.initializeJournal({ db: new sqlite.DatabaseSync(databasePath), databasePath });
}

// Compatibility queries retained with application policy; these do not belong in generic storage.
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
