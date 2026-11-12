import { mkdir, readdir, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { writeText } from "@aof/foundation/fs";

// Core supplies configured application services; construction performs no I/O.
export function createAskMessages({ messagingStoreDir }) {
// src/notify/ask-messages.mjs — THE ASK-MESSAGE INDEX (milestone 131 / story 10; ADR-008 §4). A
// Discord reply carries only the id of the message it replies to, so the notifier records, when it
// posts an ask, which ask that message is: one JSON file per message at
// `<messagingStoreDir()>/discord-asks/<messageId>.json`, holding the seven keys
// `{ messageId, channelId, event, ref, workspaceId, projectRoot, postedAt }`.
//
// It is keyed by the MESSAGE, not by run or ref, because the reply is all the bot has. The answer is
// still routed by `(workspaceId, ref)` through `work:answer`, so a stale record can only reach an ask
// that is no longer waiting, which the verb refuses.
//
// THE HOME IS THE PROCESS'S, as the secret store's is (`./secret.mjs`): no function here takes the
// notifier's injected `env`. A message id that is not a snowflake is never used as a file name, so an
// id arriving over the gateway can never leave `discord-asks/`. Records older than 30 days are pruned
// at each write (DEFAULT DECISION: a parked ask can be answered days later).
//
// 191/07 (ADR-007 §3): a message posted WITH buttons is recorded too, so a tap finds its context by
// message id. A halt or a death adds `scope` and `nodeId`; an ask adds the `choices` its buttons
// carry. The keys are ADDITIVE: written only when given, and never required on read, so a record
// written before them still reads. A reply answers only an ask's record (`readAskMessage`); a tap
// reads any record (`readIndexedMessage`).

const INDEX_SEGMENT = "discord-asks";
const SNOWFLAKE_RE = /^[0-9]{17,20}$/u;
const RECORD_FILE_RE = /^[0-9]{17,20}\.json$/u;
const ASK_MESSAGE_KEYS = Object.freeze(["messageId", "channelId", "event", "ref", "workspaceId", "projectRoot", "postedAt"]);
// The additive keys (191/07), written after the seven only when the fields carry them.
const BUTTON_MESSAGE_KEYS = Object.freeze(["scope", "nodeId", "choices"]);
// The events a reply answers: the two asks (ADR-008 §4).
const ASK_EVENTS = Object.freeze(["session-needs-input", "session-parked-unanswered"]);
// DEFAULT DECISION (ADR-008 §4): how long an ask message stays answerable by reply.
const ASK_MESSAGE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const isSnowflake = (value) => typeof value === "string" && SNOWFLAKE_RE.test(value);

// askMessagesDir(env) → `<global home>/messaging/discord-asks`.
function askMessagesDir(env = process.env) {
  return path.join(messagingStoreDir(env), INDEX_SEGMENT);
}

function indexError(message) {
  const error = new Error(message);
  error.code = "notify-ask-index";
  return error;
}

// Every record older than the TTL, removed — and every record that no longer parses, which no reply
// could use. A file already gone is skipped; any other fault throws, and the notifier degrades it.
async function prune(dir, nowMs) {
  for (const name of await readdir(dir)) {
    if (!RECORD_FILE_RE.test(name)) continue;
    const file = path.join(dir, name);
    let posted;
    try {
      posted = Date.parse(JSON.parse(await readFile(file, "utf8"))?.postedAt);
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      posted = Number.NaN;
    }
    if (Number.isFinite(posted) && nowMs - posted <= ASK_MESSAGE_TTL_MS) continue;
    await unlink(file).catch((error) => {
      if (error?.code !== "ENOENT") throw error;
    });
  }
}

// recordAskMessage(fields, { now }) → the record written. Throws a `notify-ask-index` error for a
// message id that is not a snowflake, and whatever the filesystem throws; the notifier catches both,
// so an index that cannot be written never fails a send.
async function recordAskMessage(fields, { now = () => new Date() } = {}) {
  if (!isSnowflake(fields?.messageId)) throw indexError("the posted message id is not a Discord snowflake, so it is not indexed");
  const dir = askMessagesDir();
  await mkdir(dir, { recursive: true });
  const at = new Date(now());
  await prune(dir, at.getTime());
  const record = {};
  for (const key of ASK_MESSAGE_KEYS) record[key] = key === "postedAt" ? at.toISOString() : fields[key] ?? null;
  for (const key of BUTTON_MESSAGE_KEYS) if (fields[key] !== undefined) record[key] = fields[key];
  await writeText(path.join(dir, `${record.messageId}.json`), `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

// readIndexedMessage(messageId) → the record, whatever its event, or `null` for an id that is not a
// snowflake (no file is read), an absent file, and anything that is not a record of the seven keys.
// The one read a tap makes (191/07). Never throws.
async function readIndexedMessage(messageId) {
  if (!isSnowflake(messageId)) return null;
  let parsed;
  try {
    parsed = JSON.parse(await readFile(path.join(askMessagesDir(), `${messageId}.json`), "utf8"));
  } catch {
    return null;
  }
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  if (parsed.messageId !== messageId || !ASK_MESSAGE_KEYS.every((key) => Object.hasOwn(parsed, key))) return null;
  return parsed;
}

// readAskMessage(messageId) → the record when it is an ASK's, else `null` — the read a reply makes,
// so a reply to a halt's message answers nothing. Never throws.
async function readAskMessage(messageId) {
  const record = await readIndexedMessage(messageId);
  return record != null && ASK_EVENTS.includes(record.event) ? record : null;
}

// findAskMessage({ workspaceId, ref }) → the latest-posted record for that ask, or `null` — the one
// reverse read, for `/asks`'s jump link (131/11, ADR-009 §5). A scan of the index, which the 30-day
// prune keeps small; a record that cannot be read is skipped. Never throws.
async function findAskMessage({ workspaceId, ref } = {}) {
  let names;
  try {
    names = await readdir(askMessagesDir());
  } catch {
    return null;
  }
  let latest = null;
  for (const name of names) {
    if (!RECORD_FILE_RE.test(name)) continue;
    const record = await readAskMessage(name.slice(0, -".json".length));
    if (record == null || record.ref !== ref || record.workspaceId !== workspaceId) continue;
    if (latest == null || String(record.postedAt) > String(latest.postedAt)) latest = record;
  }
  return latest;
}

return { ASK_MESSAGE_KEYS, ASK_MESSAGE_TTL_MS, askMessagesDir, recordAskMessage, readIndexedMessage, readAskMessage, findAskMessage };
}
