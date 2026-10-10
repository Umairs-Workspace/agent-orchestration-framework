import path from "node:path";
import { appendFile, open, readFile, rm, stat } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";

// Append-only records behind raw feedback capture (55/ADR-005).
//
// STATE.md remains the human-readable running log. This sibling ledger is the evidence:
// the exact text is appended before the projection, and later triage appends a separate
// record that points back to it. Nothing in this module rewrites an existing record.
//
// 153/ADR-001 adds a third, additive kind: a completed decision `recall` — the query an agent
// ran, the records it was handed, and one verdict per returned identity. It is evidence of a
// decision, never raw feedback: it has no text, projects no STATE bullet, and every raw
// consumer selects `kind === "raw"` explicitly, so a recall row can never enter a raw
// denominator. Same-id replay is a no-op and a changed replay is refused, both decided under
// the ledger lock so two concurrent submissions of one observation leave exactly one row.

export const FEEDBACK_RECORD_FILE = "FEEDBACK.ndjson";
// Every row kind the ledger admits. A consumer that must recognise a kind it does not interpret (the
// accounting reader skips raw and classification rows) names them from here rather than respelling them.
export const FEEDBACK_RECORD_KINDS = Object.freeze(["raw", "classification", "recall"]);
export const RAW_FEEDBACK_KEYS = Object.freeze(["kind", "id", "text", "actor", "refs", "at"]);
export const FEEDBACK_CLASSIFICATION_KEYS = Object.freeze(["kind", "id", "raw", "at", "classification"]);
export const RECALL_OBSERVATION_KEYS = Object.freeze(["kind", "id", "at", "edge", "actor", "query", "scope", "records"]);
export const RECALL_RECORD_KEYS = Object.freeze(["item", "id", "recordType", "verdict"]);
export const RECALL_VERDICTS = Object.freeze(["honoured", "departed", "irrelevant"]);

const LEDGER_LOCK_TIMEOUT_MS = 10_000;
const LEDGER_LOCK_STALE_MS = 30_000;

function feedbackError(message, code, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function presentString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isoInstant(value) {
  return presentString(value)
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && Number.isFinite(Date.parse(value));
}

function serializableObject(value) {
  if (value == null || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length === 0) {
    throw feedbackError("Feedback classification must be a non-empty object.", "feedback-classification-required");
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    throw feedbackError("Feedback classification must be JSON-serializable.", "feedback-classification-invalid");
  }
}

export function feedbackRecordPath(item) {
  return path.join(item.dir, FEEDBACK_RECORD_FILE);
}

export function compileRawFeedback({ id, text, actor, refs = "", at } = {}) {
  if (!presentString(id)) throw feedbackError("Raw feedback needs an id.", "feedback-id-required");
  if (typeof text !== "string" || text.trim().length === 0) {
    throw feedbackError("Raw feedback needs verbatim text.", "feedback-text-required");
  }
  if (!presentString(actor)) throw feedbackError("Raw feedback needs an actor.", "feedback-actor-required");
  if (typeof refs !== "string") throw feedbackError("Raw feedback refs must be text.", "feedback-refs-invalid");
  if (!isoInstant(at)) throw feedbackError("Raw feedback needs an ISO-8601 capture instant.", "feedback-at-required");
  return Object.freeze({ kind: "raw", id, text, actor, refs, at });
}

export function compileFeedbackClassification({ id, raw, at, classification } = {}) {
  if (!presentString(id)) throw feedbackError("Feedback classification needs an id.", "feedback-classification-id-required");
  if (!presentString(raw)) throw feedbackError("Feedback classification must reference raw feedback.", "feedback-raw-reference-required");
  if (!isoInstant(at)) throw feedbackError("Feedback classification needs an ISO-8601 instant.", "feedback-classification-at-required");
  return Object.freeze({ kind: "classification", id, raw, at, classification: serializableObject(classification) });
}

function invalidObservation(defect) {
  return feedbackError(`Recall observation refused: ${defect}.`, "invalid-observation", 400);
}

function plainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function recallIdentity(record) {
  return `${record.item}/${record.recordType}/${record.id}`;
}

// compileRecallObservation — the one validator of a completed recall. Every defect is a coded
// `invalid-observation` naming what is wrong, raised before anything is written. A verdict is
// required for EVERY returned identity: there is no default and no partial observation.
export function compileRecallObservation(input) {
  if (!plainObject(input)) throw invalidObservation("the observation must be a JSON object");
  const unknown = Object.keys(input).filter((key) => !RECALL_OBSERVATION_KEYS.includes(key));
  if (unknown.length > 0) throw invalidObservation(`unknown top-level field ${unknown.map((key) => `"${key}"`).join(", ")}`);
  if (input.kind !== "recall") throw invalidObservation('kind must be "recall"');
  if (!presentString(input.id)) throw invalidObservation("blank or missing id");
  if (!isoInstant(input.at)) throw invalidObservation("invalid capture instant (an ISO-8601 instant is required)");
  if (!presentString(input.actor)) throw invalidObservation("blank actor");
  if (!presentString(input.edge)) throw invalidObservation("blank edge");
  if (typeof input.query !== "string") throw invalidObservation("query must be text");
  if (!plainObject(input.scope) || Object.values(input.scope).some((value) => typeof value !== "string")) {
    throw invalidObservation("scope must be an object of text values");
  }
  if (!Array.isArray(input.records)) throw invalidObservation("records must be an array (empty when nothing was returned)");

  const seen = new Set();
  const records = input.records.map((entry, index) => {
    if (!plainObject(entry)) throw invalidObservation(`record ${index + 1} must be an object`);
    const extra = Object.keys(entry).filter((key) => !RECALL_RECORD_KEYS.includes(key));
    if (extra.length > 0) throw invalidObservation(`record ${index + 1} has unknown field ${extra.map((key) => `"${key}"`).join(", ")}`);
    if (!presentString(entry.item)) throw invalidObservation(`record ${index + 1} has a blank item`);
    if (!presentString(entry.id)) throw invalidObservation(`record ${index + 1} has a blank id`);
    if (!presentString(entry.recordType)) throw invalidObservation(`missing record type for ${entry.item}/${entry.id}`);
    if (entry.verdict === undefined || entry.verdict === null || entry.verdict === "") {
      throw invalidObservation(`missing verdict for ${entry.item}/${entry.id}`);
    }
    if (!RECALL_VERDICTS.includes(entry.verdict)) {
      throw invalidObservation(`verdict "${entry.verdict}" for ${entry.item}/${entry.id} is not one of ${RECALL_VERDICTS.join(", ")}`);
    }
    const identity = recallIdentity(entry);
    if (seen.has(identity)) throw invalidObservation(`duplicate returned identity ${identity}`);
    seen.add(identity);
    return Object.freeze({ item: entry.item, id: entry.id, recordType: entry.recordType, verdict: entry.verdict });
  });

  return Object.freeze({
    kind: "recall",
    id: input.id,
    at: input.at,
    edge: input.edge,
    actor: input.actor,
    query: input.query,
    scope: JSON.parse(JSON.stringify(input.scope)),
    records,
  });
}

export async function readFeedbackRecords(item) {
  let body;
  try {
    body = await readFile(feedbackRecordPath(item), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const records = [];
  for (const [index, line] of body.split(/\r?\n/).entries()) {
    if (line.trim() === "") continue;
    try {
      const parsed = JSON.parse(line);
      const expected = parsed?.kind === "raw"
        ? RAW_FEEDBACK_KEYS
        : parsed?.kind === "classification"
          ? FEEDBACK_CLASSIFICATION_KEYS
          : parsed?.kind === "recall"
            ? RECALL_OBSERVATION_KEYS
            : null;
      if (expected == null || Object.keys(parsed).some((key) => !expected.includes(key)) || Object.keys(parsed).length !== expected.length) {
        throw feedbackError(`Feedback record line ${index + 1} has an unknown shape.`, "feedback-record-invalid", 409);
      }
      records.push(parsed.kind === "raw"
        ? compileRawFeedback(parsed)
        : parsed.kind === "classification"
          ? compileFeedbackClassification(parsed)
          : compileRecallObservation(parsed));
    } catch (error) {
      if (error?.code === "feedback-record-invalid") throw error;
      throw feedbackError(`Feedback record line ${index + 1} is invalid: ${error.message}`, "feedback-record-invalid", 409);
    }
  }
  return records;
}

async function appendRecord(item, record) {
  await appendFile(feedbackRecordPath(item), `${JSON.stringify(record)}\n`, "utf8");
  return record;
}

// withLedgerLock — a cross-process, per-item mutex around read-check-append. The duplicate check
// and the append must be ONE step: two submissions of the same observation race between the
// read and the write otherwise, and both would find the id absent. An exclusive-create lock
// file is the portable primitive; a lock older than LEDGER_LOCK_STALE_MS belongs to a process
// that died and is reclaimed. The lock is removed on every exit, so a refused submission leaves
// the item directory byte-identical.
// A lock older than LEDGER_LOCK_STALE_MS belongs to a process that died. A lock that vanishes (or
// is mid-delete) between the failed create and the stat was released by its holder — the caller
// simply retries the create — so those codes end the check; anything else is a real fault.
async function reclaimStaleLock(lockPath) {
  let held;
  try {
    held = await stat(lockPath);
  } catch (error) {
    if (["ENOENT", "EPERM", "EACCES", "EBUSY"].includes(error.code)) return;
    throw error;
  }
  if (Date.now() - held.mtimeMs > LEDGER_LOCK_STALE_MS) await rm(lockPath, { force: true });
}

async function withLedgerLock(item, work) {
  const lockPath = `${feedbackRecordPath(item)}.lock`;
  const deadline = Date.now() + LEDGER_LOCK_TIMEOUT_MS;
  for (;;) {
    try {
      const handle = await open(lockPath, "wx");
      await handle.close();
      break;
    } catch (error) {
      if (!["EEXIST", "EPERM", "EACCES", "EBUSY"].includes(error.code)) throw error;
      await reclaimStaleLock(lockPath);
      if (Date.now() > deadline) {
        throw feedbackError("The feedback ledger is busy; retry the submission.", "feedback-ledger-busy", 409);
      }
      await sleep(5 + Math.floor(Math.random() * 15));
    }
  }
  try {
    return await work();
  } finally {
    await rm(lockPath, { force: true });
  }
}

export async function appendRawFeedback(item, input) {
  const record = compileRawFeedback(input);
  return withLedgerLock(item, async () => {
    const records = await readFeedbackRecords(item);
    if (records.some((entry) => entry?.id === record.id)) {
      throw feedbackError(`Feedback record "${record.id}" already exists.`, "feedback-id-conflict", 409);
    }
    return appendRecord(item, record);
  });
}

export async function recordFeedbackClassification(item, input) {
  const record = compileFeedbackClassification(input);
  return withLedgerLock(item, async () => {
    const records = await readFeedbackRecords(item);
    const target = records.find((entry) => entry?.id === record.raw);
    if (target != null && target.kind !== "raw") {
      throw feedbackError(
        `Record "${record.raw}" is a ${target.kind} record, not raw feedback; classification was not recorded.`,
        "feedback-raw-reference-invalid",
        400,
      );
    }
    if (target == null) {
      throw feedbackError(
        `Raw feedback "${record.raw}" does not exist; classification was not recorded.`,
        "feedback-raw-not-found",
        404,
      );
    }
    if (records.some((entry) => entry?.id === record.id)) {
      throw feedbackError(`Feedback record "${record.id}" already exists.`, "feedback-id-conflict", 409);
    }
    return appendRecord(item, record);
  });
}

// appendRecallObservation — the third door onto the ledger (153/ADR-001). Returns
// { record, replayed }: an identical resubmission of an existing id is a no-op that names the
// row already there; a resubmission that differs in ANY field is an id conflict and writes
// nothing. The kind is the writer's, not the caller's.
export async function appendRecallObservation(item, input) {
  const record = compileRecallObservation({ ...input, kind: "recall" });
  return withLedgerLock(item, async () => {
    const records = await readFeedbackRecords(item);
    const existing = records.find((entry) => entry?.id === record.id);
    if (existing != null) {
      if (existing.kind === "recall" && JSON.stringify(existing) === JSON.stringify(record)) {
        return { record: existing, replayed: true };
      }
      throw feedbackError(
        `Feedback record "${record.id}" already exists with different content; the recall was not recorded.`,
        "feedback-id-conflict",
        409,
      );
    }
    return { record: await appendRecord(item, record), replayed: false };
  });
}
