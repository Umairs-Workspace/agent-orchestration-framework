// Append-only records behind raw feedback capture (55/ADR-005).
//
// STATE.md remains the human-readable running log. This sibling ledger is the evidence:
// the exact text is appended before the projection, and later triage appends a separate
// record that points back to it. Nothing in this module rewrites an existing record.
import path from "node:path";
import { appendFile, readFile } from "node:fs/promises";

export const FEEDBACK_RECORD_FILE = "FEEDBACK.ndjson";
export const RAW_FEEDBACK_KEYS = Object.freeze(["kind", "id", "text", "actor", "refs", "at"]);
export const FEEDBACK_CLASSIFICATION_KEYS = Object.freeze(["kind", "id", "raw", "at", "classification"]);

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
          : null;
      if (expected == null || Object.keys(parsed).some((key) => !expected.includes(key)) || Object.keys(parsed).length !== expected.length) {
        throw feedbackError(`Feedback record line ${index + 1} has an unknown shape.`, "feedback-record-invalid", 409);
      }
      records.push(parsed.kind === "raw" ? compileRawFeedback(parsed) : compileFeedbackClassification(parsed));
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

export async function appendRawFeedback(item, input) {
  const record = compileRawFeedback(input);
  const records = await readFeedbackRecords(item);
  if (records.some((entry) => entry?.id === record.id)) {
    throw feedbackError(`Feedback record "${record.id}" already exists.`, "feedback-id-conflict", 409);
  }
  return appendRecord(item, record);
}

export async function recordFeedbackClassification(item, input) {
  const record = compileFeedbackClassification(input);
  const records = await readFeedbackRecords(item);
  if (!records.some((entry) => entry?.kind === "raw" && entry.id === record.raw)) {
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
}
