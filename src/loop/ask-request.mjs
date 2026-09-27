// src/loop/ask-request.mjs — THE ASK HAS ONE HOME (milestone 131 / story 01; ADR-003 §1-§2).
//
// A driven session that stops to ask a human leaves its question in its transcript and nowhere a
// human looks. The run's owner reads it (ADR-002) and writes it HERE: `<meshRoot>/loop-asks/
// <runId>.json`, the sibling of 130's `loop-stops/`, honouring `AOF_GLOBAL_HOME` through the same
// `globalMeshPaths` call and never under a checkout. The file is keyed by RUN, never by ref — a ref
// is re-driven by a fresh run, and a ref-keyed file would answer a question nobody is asking any
// more (130's stale-key hazard). This module owns the path, the fifteen-key record, the three state
// words, the owner's writes (`openAsk`, `parkAsk`, `clearAsk`), the verb's one write (`answerAsk`,
// the only place an answer is sanitised), the reads (`readAsk`, `readAsks`) and the owner's poll.
//
// The segment literal and the state words are spelled HERE and nowhere else under `src/`: every
// face reads one record through these exports and spells no path of its own.
//
// Every write goes whole through `writeText` (temp + rename). Every read is absence-tolerant
// (`null`), and a file that is not a record reads `null` after one
// `reportDegrade("loop-ask-request", …)` — never a throw into the owner that polls it.
import { readdir, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { globalMeshPaths } from "../workspace.mjs";
import { normalizeId, writeText } from "../fs.mjs";
import { reportDegrade } from "../degrade.mjs";

// The ONE map from lifecycle state to word: an ask is waiting on a human, parked by its owner at
// the bound or a stop, or answered. A face asks `record.state === ASK_STATES.parked` and spells
// no word of its own.
export const ASK_STATES = Object.freeze({ waiting: "waiting", parked: "parked", answered: "answered" });

const ASKS_SEGMENT = "loop-asks";
const DEGRADE_CODE = "loop-ask-request";
// DEFAULT DECISION (ADR-003 §1): the stop source's own figure, so an answer is picked up within
// two seconds.
const DEFAULT_POLL_MS = 2000;
// DEFAULT DECISION (ADR-003 §2): the ask is ~1,500 characters and a reply is shorter.
const MAX_ANSWER_CODE_POINTS = 8_000;
// Any C0 control other than TAB, LF and CR, and DEL. The driver types the answer inside a
// bracketed paste, so an `ESC [ 201 ~` would close the paste and type keystrokes into an agent
// with shell access.
const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;
// The record's FIFTEEN keys, in the one frozen order every write spells. An omitted carried field
// is written `null` in its slot — the key set never shrinks.
const RECORD_KEYS = Object.freeze([
  "runId", "ref", "workspaceId", "loopRunId", "scope", "sessionId", "phase", "node",
  "question", "askedAt", "state", "parkedAt", "answer", "answeredAt", "by",
]);
const RECORD_FILE_RE = /^[a-z0-9][a-z0-9-_.]*\.json$/iu;
const ASK_STATE_WORDS = new Set(Object.values(ASK_STATES));

export function loopAsksDir(env = process.env) {
  return path.join(globalMeshPaths({ env }).meshRoot, ASKS_SEGMENT);
}

// A `runId` is ONE filename segment — `normalizeId`'s alphabet — and every export refuses another
// by throwing BEFORE any filesystem access, so an id arriving over a route can never leave
// `loop-asks/`. The refusal names `runId`, the argument that was wrong.
function segmentOf(runId) {
  try {
    return normalizeId(runId);
  } catch (error) {
    throw new TypeError(`runId must be one filename segment: ${error.message}`);
  }
}

export function askRequestPath(dir, runId) {
  return path.join(dir, `${segmentOf(runId)}.json`);
}

function instant(now) {
  return new Date(now()).toISOString();
}

// A record is a plain object whose `state` is one of the three words — the ONE validity rule. An
// unknown extra key is carried, never degraded.
function isAskRecord(value) {
  return value != null && typeof value === "object" && !Array.isArray(value) && ASK_STATE_WORDS.has(value.state);
}

function shapeRecord(fields) {
  const record = {};
  for (const key of RECORD_KEYS) record[key] = fields[key] ?? null;
  for (const [key, value] of Object.entries(fields)) if (!(key in record)) record[key] = value;
  return record;
}

async function writeRecord(filePath, record) {
  await writeText(filePath, `${JSON.stringify(record, null, 2)}\n`);
}

function askError(message, code, status) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

// readAsk(dir, runId) → the record, or `null` for an absent file (no event) and for anything that
// is not a record (one degrade event carrying the path). Never throws past the id refusal.
export async function readAsk(dir, runId) {
  const filePath = askRequestPath(dir, runId);
  let text;
  try {
    text = await readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    reportDegrade(DEGRADE_CODE, error, { path: filePath });
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    reportDegrade(DEGRADE_CODE, error, { path: filePath });
    return null;
  }
  if (!isAskRecord(parsed)) {
    reportDegrade(DEGRADE_CODE, new Error(`not an ask: "state" must be one of ${[...ASK_STATE_WORDS].join(", ")}`), { path: filePath });
    return null;
  }
  return parsed;
}

// readAsks(dir, { workspaceId }) → one workspace's records, ordered by `askedAt` and then `runId`,
// both ascending. Only entries named `<segment>.json` are read — a `.tmp-*` write in flight or a
// stray file is skipped quietly; a `.json` that is not a record is skipped after its degrade.
// An absent directory is `[]`.
export async function readAsks(dir, { workspaceId } = {}) {
  let names;
  try {
    names = await readdir(dir);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    reportDegrade(DEGRADE_CODE, error, { path: dir });
    return [];
  }
  const records = [];
  for (const name of names) {
    if (!RECORD_FILE_RE.test(name)) continue;
    const record = await readAsk(dir, name.slice(0, -".json".length));
    if (record != null && record.workspaceId === workspaceId) records.push(record);
  }
  return records.sort((a, b) => ordinal(a.askedAt, b.askedAt) || ordinal(a.runId, b.runId));
}

// An ordinal comparison — ISO instants and run ids order by their code units, never by a locale.
function ordinal(a, b) {
  const [x, y] = [String(a), String(b)];
  return x < y ? -1 : x > y ? 1 : 0;
}

// openAsk(dir, { runId, ref, workspaceId, loopRunId, scope, sessionId, phase, node, question, now })
// — the OWNER's, when its session stops to ask. Writes a whole `waiting` record over whatever the
// file held, answered or not: a resumed session that asks again is a new question.
export async function openAsk(dir, { now = () => new Date(), ...fields } = {}) {
  const filePath = askRequestPath(dir, fields.runId);
  const record = shapeRecord({
    ...fields,
    askedAt: instant(now), state: ASK_STATES.waiting,
    parkedAt: null, answer: null, answeredAt: null, by: null,
  });
  await writeRecord(filePath, record);
  return record;
}

// parkAsk(dir, runId, { now }) — the OWNER's, at the bound or a stop. Moves only a `waiting` ask;
// a `parked` or `answered` one is answered as it stands, byte-unchanged — an answer that landed
// first wins the race with the bound. An absent or corrupt file is `null` and is left as it is.
export async function parkAsk(dir, runId, { now = () => new Date() } = {}) {
  const filePath = askRequestPath(dir, runId);
  const existing = await readAsk(dir, runId);
  if (existing == null || existing.state !== ASK_STATES.waiting) return existing;
  const record = shapeRecord({ ...existing, state: ASK_STATES.parked, parkedAt: instant(now) });
  await writeRecord(filePath, record);
  return record;
}

// clearAsk(dir, runId) — the OWNER's, once the answered drive returns. Deletes the file whatever
// it holds; clearing an absent file is quiet. Answers whether there was a file to delete.
export async function clearAsk(dir, runId) {
  const filePath = askRequestPath(dir, runId);
  try {
    await unlink(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
  return true;
}

// The ONE sanitation of an answer (ADR-003 §2), in the ADR's order — blank, then length, then
// controls — and the first that fails names the refusal. Blank is a non-string or a string empty
// after `trim()`; length is counted in code points.
function refuseBadAnswer(text) {
  if (typeof text !== "string" || text.trim().length === 0) {
    throw askError("the answer is blank — say what the session should do", "answer-empty", 400);
  }
  if ([...text].length > MAX_ANSWER_CODE_POINTS) {
    throw askError(`the answer is longer than ${MAX_ANSWER_CODE_POINTS} characters`, "answer-too-long", 400);
  }
  if (CONTROL_CHARS_RE.test(text)) {
    throw askError("the answer carries a control character (only tab, newline and carriage return are allowed)", "answer-control-chars", 400);
  }
}

// answerAsk(dir, { workspaceId, ref, text, by, now }) — the VERB's one write. Sanitation runs
// before any lookup, so a bad answer is refused 400 whether or not an ask exists. Of this
// workspace's asks for `ref`, the one with the latest `askedAt` (a tie to the higher `runId`) is
// the ask; none at all answers `null` and writes nothing, which is how the verb knows to try the
// mesh leg. A `waiting` or `parked` ask moves to `answered`, stamping `answer` verbatim,
// `answeredAt` and `by`; an `answered` one is refused `ask-already-answered` (409) naming who
// gave the first answer — the first answer wins.
export async function answerAsk(dir, { workspaceId, ref, text, by = null, now = () => new Date() } = {}) {
  refuseBadAnswer(text);
  const asks = (await readAsks(dir, { workspaceId })).filter((record) => record.ref === ref);
  if (asks.length === 0) return null;
  const existing = asks[asks.length - 1];
  if (existing.state === ASK_STATES.answered) {
    const who = existing.by?.actor ?? "someone";
    throw askError(`${ref} was already answered by ${who} at ${existing.answeredAt}`, "ask-already-answered", 409);
  }
  const record = shapeRecord({ ...existing, state: ASK_STATES.answered, answer: text, answeredAt: instant(now), by });
  await writeRecord(askRequestPath(dir, existing.runId), record);
  return record;
}

// createAskPoll({ dir, runId, pollMs, timers }) → { ask, poll, start, stop } — the owner's poll,
// in the stop source's shape. Construction reads nothing and `ask()` is `null` until the first
// poll; `start()` arms ONE unref'd interval only for a finite `pollMs` > 0 (default 2000); a poll
// over a file that is not a record answers `null` after its degrade and never rejects; `stop()`
// clears the interval and is terminal.
export function createAskPoll({ dir, runId, pollMs = DEFAULT_POLL_MS, timers = { setInterval, clearInterval } } = {}) {
  const filePath = askRequestPath(dir, runId); // the id refusal, before anything is armed
  let ask = null;
  let interval = null;
  let stopped = false;

  const poll = async () => {
    ask = await readAsk(dir, runId);
    return ask;
  };
  const start = () => {
    if (stopped || interval != null) return;
    if (typeof pollMs !== "number" || !Number.isFinite(pollMs) || pollMs <= 0) return;
    interval = timers.setInterval(() => {
      poll().catch((error) => reportDegrade(DEGRADE_CODE, error, { path: filePath }));
    }, pollMs);
    interval?.unref?.();
  };
  const stop = () => {
    stopped = true;
    if (interval != null) {
      timers.clearInterval(interval);
      interval = null;
    }
  };

  return { ask: () => ask, poll, start, stop };
}
