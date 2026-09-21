// src/loop/stop-request.mjs — THE STOP REQUEST HAS ONE HOME (milestone 130 / story 01; ADR-001).
//
// A running loop cannot be signalled from another process on Windows, so the stop is a FILE the
// loop polls: `<meshRoot>/loop-stops/<loopRunId>.json` — the sibling of `logs/` (the diag
// recorder) and `loop-fixes/` (129/ADR-005 §3), honouring `AOF_GLOBAL_HOME` through the same
// `globalMeshPaths` call `loop-diag.mjs` makes, and never anywhere under a checkout (a loop leaves
// the tree as it found it; a lane's `git add -A` would otherwise commit it). This module owns the
// path, the ten-key record, 129/04's ladder (the first request DRAINS, the second CANCELS), the
// lifecycle (requested → honoured → cleared) and `createStopSource` — the ONE interrupt source the
// shell reads, which composes the process's own SIGINT/SIGTERM with the file.
//
// The segment literal `loop-stops`, the state words and the level-to-word map are spelled HERE
// and nowhere else under `src/` (FF-13001): the shell, the verb, the presence read and the
// declarations producer read one record through these exports and spell no path of their own.
//
// Every write goes whole through `writeText` (temp + rename, after a recursive mkdir) so a reader
// never sees a half-written file; there is no lock — concurrent writers on one id are last-rename-
// wins, each write whole, so a torn file is impossible and a lost update is not. Every read is
// absence-tolerant (`null`), and a file that does not parse AS A RECORD reads `null` after one
// `reportDegrade("loop-stop-request", …)` — never a throw into the loop that polls it.
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { globalMeshPaths } from "../workspace.mjs";
import { normalizeId, writeText } from "../fs.mjs";
import { reportDegrade } from "../degrade.mjs";

// The ONE map from level to word (ADR-001 §2): the verb, the presence read and the faces speak
// these two words and spell no third. Level 1 drains; level 2 cancels the in-flight session now.
export const STOP_LEVELS = Object.freeze({ drain: 1, cancel: 2 });
// The ONE map from lifecycle state to word, for the same reason: a consumer that must ask whether a
// request is honoured (the declarations producer drops such a loop until a resume clears it) asks
// `record.state === STOP_STATES.honoured` and spells no word of its own.
export const STOP_STATES = Object.freeze({ requested: "requested", honoured: "honoured" });

const STOPS_SEGMENT = "loop-stops";
const DEGRADE_CODE = "loop-stop-request";
// DEFAULT DECISION (ADR-001 §5): a cancel is seen within two seconds of the write, and 2 s of
// file stats per loop is noise beside a PTY.
const DEFAULT_POLL_MS = 2000;
// The record's TEN keys, in the one frozen order every write spells. An omitted carried field
// (`scope`, `workspaceId`, `by`) is written `null` in its slot — the key set never shrinks.
const RECORD_KEYS = Object.freeze([
  "loopRunId", "scope", "workspaceId", "level", "state",
  "requestedAt", "escalatedAt", "honouredAt", "cancelled", "by",
]);

export function loopStopsDir(env = process.env) {
  return path.join(globalMeshPaths({ env }).meshRoot, STOPS_SEGMENT);
}

// A `loopRunId` is ONE filename segment — `normalizeId`'s alphabet (a `randomUUID()` fits) — and
// every export refuses another by throwing BEFORE any filesystem access, so an id arriving over a
// route can never leave `loop-stops/`. The refusal names `loopRunId`, the argument that was wrong.
function segmentOf(loopRunId) {
  try {
    return normalizeId(loopRunId);
  } catch (error) {
    throw new TypeError(`loopRunId must be one filename segment: ${error.message}`);
  }
}

export function stopRequestPath(dir, loopRunId) {
  return path.join(dir, `${segmentOf(loopRunId)}.json`);
}

// Every instant is the clock's `Date`, written as its `toISOString()` — as given, never compared
// or clamped: the stale rule (ADR-001 §4) holds by construction and needs no clock comparison.
function instant(now) {
  return new Date(now()).toISOString();
}

// A record is a plain object whose `level` is the integer 1 or 2 — the ONE validity rule
// (task 00, ruling 2). Its `state` is never what makes it a record: the source reads a level and
// never a state, so an `honoured` request at level ≥ 1 still halts the loop that reads it.
function isStopRecord(value) {
  return value != null && typeof value === "object" && !Array.isArray(value)
    && (value.level === STOP_LEVELS.drain || value.level === STOP_LEVELS.cancel);
}

// The ten keys in their frozen order, each present, then any key a newer writer added — carried,
// never dropped, so an escalation or a mark rewrites what it changes and nothing else.
function shapeRecord(fields) {
  const record = {};
  for (const key of RECORD_KEYS) record[key] = fields[key] ?? null;
  for (const [key, value] of Object.entries(fields)) if (!(key in record)) record[key] = value;
  return record;
}

async function writeRecord(filePath, record) {
  await writeText(filePath, `${JSON.stringify(record, null, 2)}\n`);
}

// readStopRequest(dir, loopRunId) → the record, or `null` for an absent file (no event) and for
// anything that is not a record (one degrade event carrying the path). Never throws past the id
// refusal — the loop polls this.
export async function readStopRequest(dir, loopRunId) {
  const filePath = stopRequestPath(dir, loopRunId);
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
  if (!isStopRecord(parsed)) {
    reportDegrade(DEGRADE_CODE, new Error(`not a stop request: "level" must be ${STOP_LEVELS.drain} or ${STOP_LEVELS.cancel}`), { path: filePath });
    return null;
  }
  return parsed;
}

// requestLoopStop(dir, { loopRunId, scope, workspaceId, by, now }) — the ONE writer of a request,
// and 129/04's ladder exactly (ADR-001 §3): no file → level 1 `requested` (`created: true`); a
// level-1 `requested` file → level 2 with `escalatedAt` (`escalated: true`), keeping the creator's
// `by` and `requestedAt`; a level-2 file → unchanged; an `honoured` file → unchanged, and the
// answer says so — a honoured stop stands until a resume clears it. A corrupt file is `null` to
// this writer (one degrade) and is overwritten whole.
export async function requestLoopStop(dir, { loopRunId, scope, workspaceId, by, now = () => new Date() } = {}) {
  const filePath = stopRequestPath(dir, loopRunId);
  const existing = await readStopRequest(dir, loopRunId);
  if (existing == null) {
    const record = shapeRecord({
      loopRunId, scope, workspaceId,
      level: STOP_LEVELS.drain, state: STOP_STATES.requested,
      requestedAt: instant(now), escalatedAt: null, honouredAt: null, cancelled: null, by,
    });
    await writeRecord(filePath, record);
    return { created: true, escalated: false, level: record.level, state: record.state, record };
  }
  if (existing.state !== STOP_STATES.honoured && existing.level === STOP_LEVELS.drain) {
    const record = shapeRecord({ ...existing, level: STOP_LEVELS.cancel, escalatedAt: instant(now) });
    await writeRecord(filePath, record);
    return { created: false, escalated: true, level: record.level, state: record.state, record };
  }
  return { created: false, escalated: false, level: existing.level, state: existing.state, record: existing };
}

// markStopHonoured(dir, loopRunId, { now, cancelled }) — the SHELL's, at the halt it produces for
// the request (ADR-001 §4; only the loop knows it has halted): `state: "honoured"`, `honouredAt`,
// and `cancelled` (the runId the loop cancelled, or `null`). Answers the record; `null` for an
// absent or corrupt file (nothing is created, a corrupt file is left). A second mark on an
// honoured request is the idempotent re-mark (§5): the record unchanged, the first mark's
// `honouredAt` and `cancelled`.
export async function markStopHonoured(dir, loopRunId, { now = () => new Date(), cancelled = null } = {}) {
  const filePath = stopRequestPath(dir, loopRunId);
  const existing = await readStopRequest(dir, loopRunId);
  if (existing == null) return null;
  if (existing.state === STOP_STATES.honoured) return existing;
  const record = shapeRecord({ ...existing, state: STOP_STATES.honoured, honouredAt: instant(now), cancelled: cancelled ?? null });
  await writeRecord(filePath, record);
  return record;
}

// clearStopRequest(dir, loopRunId) — the shell's, on `--resume` (the operator asking for the loop
// back): deletes the file whatever its state and answers `{ cleared, record }` — `record` is what
// was read first (`null` for a corrupt file, after one degrade), `cleared: false` only when there
// was no file to delete.
export async function clearStopRequest(dir, loopRunId) {
  const filePath = stopRequestPath(dir, loopRunId);
  const record = await readStopRequest(dir, loopRunId);
  try {
    await unlink(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") return { cleared: false, record: null };
    throw error;
  }
  return { cleared: true, record };
}

// createStopSource({ loopRunId, dir, process, pollMs, now, timers }) → { level, producer, request,
// signal, poll, start, stop } — the seam 129/04's task 06 injects as `ctx.stopSource` (ADR-001 §5).
//
//   level()     the highest rung reached, 0..2 — by the process's own SIGINT/SIGTERM (the first
//               raises it to 1, the second to 2) or by the file's level on a poll; MONOTONIC,
//               a file that vanishes or turns corrupt afterwards lowers nothing.
//   producer()  "SIGINT" | "SIGTERM" | "stop-request" | null — whichever raised the level to its
//               CURRENT value; an equal raise never renames it. A datum for the halt line.
//   request()   the file's record as last polled, or null. Construction reads nothing.
//   signal      one AbortController's signal, aborted the moment the level reaches 2 and never
//               re-armed — the object the driver and `spawnLaneDrive` honour.
//   poll()      reads the file once (the shell awaits it at the tick head and after a drive).
//   start()     arms ONE unref'd `setInterval(poll, pollMs)` — only for a finite pollMs > 0
//               (default 2000; `0`, negative or a non-number arms none, the recorder's idiom).
//   stop()      clears it and removes the source's OWN listeners; terminal and idempotent.
//
// The listeners are PERSISTENT `process.on` ones the source owns, and they go the moment the
// level reaches 2 by EITHER route — so a THIRD signal reaches node's default through the
// recorder's last-listener repair (exit 128 + signo): first drains, second cancels, third kills,
// in that order and no other. The recorder must be installed BEFORE the source for that repair
// to fire at the third rather than the second (the launch seam's order; ruling 8). `timers` is
// the injected `{ setInterval, clearInterval }` pair for the suites; `now` is accepted for §5's
// shape and unused — the source stamps no instant, it only reads. `proc.exit` is never called.
export function createStopSource({
  loopRunId,
  dir,
  process: proc = globalThis.process,
  pollMs = DEFAULT_POLL_MS,
  timers = { setInterval, clearInterval },
} = {}) {
  const filePath = stopRequestPath(dir, loopRunId); // the id refusal, before any listener exists
  const controller = new AbortController();
  let level = 0;
  let producer = null;
  let request = null;
  let signalsSeen = 0;
  let interval = null;
  let listening = false;
  let stopped = false;

  const removeListeners = () => {
    if (!listening) return;
    listening = false;
    proc.off("SIGINT", onSigint);
    proc.off("SIGTERM", onSigterm);
  };
  const raise = (to, by) => {
    const next = Math.min(STOP_LEVELS.cancel, to);
    if (next <= level) return;
    level = next;
    producer = by;
    if (level >= STOP_LEVELS.cancel) {
      removeListeners();
      controller.abort();
    }
  };
  const onSignal = (signal) => () => {
    signalsSeen += 1;
    raise(signalsSeen, signal);
  };
  const onSigint = onSignal("SIGINT");
  const onSigterm = onSignal("SIGTERM");
  proc.on("SIGINT", onSigint);
  proc.on("SIGTERM", onSigterm);
  listening = true;

  const poll = async () => {
    request = await readStopRequest(dir, loopRunId);
    if (request != null) raise(request.level, "stop-request");
    return request;
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
    removeListeners();
  };

  return {
    level: () => level,
    producer: () => producer,
    request: () => request,
    signal: controller.signal,
    poll,
    start,
    stop,
  };
}
