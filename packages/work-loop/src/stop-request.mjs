// packages/work-loop/src/stop-request.mjs — THE STOP REQUEST HAS ONE HOME (milestone 130 / story 01; ADR-001).
//
// A running loop cannot be signalled from another process on Windows, so the stop is a FILE the
// loop polls: `<meshRoot>/loop-stops/<loopRunId>.json` — the sibling of `logs/` (the diag
// recorder) and `loop-fixes/` (129/ADR-005 §3), using the supplied runtime-root policy, and never anywhere under a checkout (a loop leaves
// the tree as it found it; a lane's `git add -A` would otherwise commit it). This module owns the
// path, the ten-key record, 129/04's ladder (the first request DRAINS, the second CANCELS), the
// lifecycle (requested → honoured → cleared) and `createStopSource` — the ONE interrupt source the
// shell reads, which composes the process's own SIGINT/SIGTERM with the file.
//
// 131/11 (ADR-009 §6) — THE RESUME REQUEST lives here too, beside the stop it undoes: a supervised
// loop handed back to its supervisor (`work:loop --hand-off`) is `<meshRoot>/loop-resumes/<loopRunId>.json`,
// five keys `{ loopRunId, scope, workspaceId, by, requestedAt }`, read by the declarations producer
// and cleared by the `--resume` launch. It is its own record: the stop's ten keys are 130's frozen
// contract, and a resume is not a stop state.
//
// 191/04 (ADR-005 §1) — THE START REQUEST lives here too, beside the resume: a scope that has never
// run has no declaration for `--hand-off` to relaunch, so `work:loop --hand-off-start` writes
// `<meshRoot>/loop-starts/<workspaceId>--<scope>.json`, five keys `{ scope, workspaceId, by,
// requestedAt, level }`, read by the declarations producer (one fresh supervised start row each) and
// cleared by the fresh `--supervised` launch it starts. Keyed by workspace and scope, never by a loop
// id: no loop exists yet to name one, and a second request for the scope overwrites the first.
//
// The segment literals `loop-stops`, `loop-resumes` and `loop-starts`, the state words and the level-to-word map
// are spelled HERE and nowhere else in runtime source (FF-13001): the shell, the verb, the presence read and the
// declarations producer read one record through these exports and spell no path of their own.
//
// Every write goes whole through `writeText` (temp + rename, after a recursive mkdir) so a reader
// never sees a half-written file; there is no lock — concurrent writers on one id are last-rename-
// wins, each write whole, so a torn file is impossible and a lost update is not. Every read is
// absence-tolerant (`null`), and a file that does not parse AS A RECORD reads `null` after one
// `reportDegrade("loop-stop-request", …)` — never a throw into the loop that polls it.
import { readdir, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { normalizeId, writeText } from "@aof/foundation/fs";

// The ONE map from level to word (ADR-001 §2): the verb, the presence read and the faces speak
// these two words and spell no third. Level 1 drains; level 2 cancels the in-flight session now.
export const STOP_LEVELS = Object.freeze({ drain: 1, cancel: 2 });
// The ONE map from lifecycle state to word, for the same reason: a consumer that must ask whether a
// request is honoured (the declarations producer drops such a loop until a resume clears it) asks
// `record.state === STOP_STATES.honoured` and spells no word of its own.
export const STOP_STATES = Object.freeze({ requested: "requested", honoured: "honoured" });

const STOPS_SEGMENT = "loop-stops";
const RESUMES_SEGMENT = "loop-resumes";
const STARTS_SEGMENT = "loop-starts";
const DEGRADE_CODE = "loop-stop-request";
const RESUME_DEGRADE_CODE = "loop-resume-request";
const START_DEGRADE_CODE = "loop-start-request";
// `<workspaceId>--<scope>`: neither part may carry `--` of its own for the name to split back
// unambiguously, which `normalizeId` alone does not refuse, so the start's segment check adds it.
const START_SEPARATOR = "--";
// DEFAULT DECISION (ADR-001 §5): a cancel is seen within two seconds of the write, and 2 s of
// file stats per loop is noise beside a PTY.
const DEFAULT_POLL_MS = 2000;
// The record's TEN keys, in the one frozen order every write spells. An omitted carried field
// (`scope`, `workspaceId`, `by`) is written `null` in its slot — the key set never shrinks.
const RECORD_KEYS = Object.freeze([
  "loopRunId", "scope", "workspaceId", "level", "state",
  "requestedAt", "escalatedAt", "honouredAt", "cancelled", "by",
]);

// Application policy is supplied once; construction performs no I/O.
export function createStopRequests({ getRuntimeRoot, reportDegrade }) {
  if (typeof getRuntimeRoot !== "function") throw new TypeError("createStopRequests: getRuntimeRoot is required");
  if (typeof reportDegrade !== "function") throw new TypeError("createStopRequests: reportDegrade is required");

  function loopStopsDir(env = process.env) {
    return path.join(getRuntimeRoot(env), STOPS_SEGMENT);
  }

  function loopResumesDir(env = process.env) {
    return path.join(getRuntimeRoot(env), RESUMES_SEGMENT);
  }

  function loopStartsDir(env = process.env) {
    return path.join(getRuntimeRoot(env), STARTS_SEGMENT);
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

  function stopRequestPath(dir, loopRunId) {
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
  async function readStopRequest(dir, loopRunId) {
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
  async function requestLoopStop(dir, { loopRunId, scope, workspaceId, by, now = () => new Date() } = {}) {
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
  async function markStopHonoured(dir, loopRunId, { now = () => new Date(), cancelled = null } = {}) {
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
  async function clearStopRequest(dir, loopRunId) {
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

  // ── the resume request (131/11, ADR-009 §6) ─────────────────────────────────────────────────────

  // The record's FIVE keys, in their one order.
  const RESUME_KEYS = Object.freeze(["loopRunId", "scope", "workspaceId", "by", "requestedAt"]);

  function resumeRequestPath(dir, loopRunId) {
    return path.join(dir, `${segmentOf(loopRunId)}.json`);
  }

  const isResumeRecord = (value) => value != null && typeof value === "object" && !Array.isArray(value)
    && typeof value.loopRunId === "string" && value.loopRunId.length > 0;

  // readResumeRequest(dir, loopRunId) → the record, or `null` for an absent file (no event) and for
  // anything that is not a record (one degrade event carrying the path). Never throws past the id refusal.
  async function readResumeRequest(dir, loopRunId) {
    const filePath = resumeRequestPath(dir, loopRunId);
    let text;
    try {
      text = await readFile(filePath, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      reportDegrade(RESUME_DEGRADE_CODE, error, { path: filePath });
      return null;
    }
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      reportDegrade(RESUME_DEGRADE_CODE, error, { path: filePath });
      return null;
    }
    if (!isResumeRecord(parsed)) {
      reportDegrade(RESUME_DEGRADE_CODE, new Error("not a resume request: \"loopRunId\" must be a non-empty string"), { path: filePath });
      return null;
    }
    return parsed;
  }

  // requestLoopResume(dir, { loopRunId, scope, workspaceId, by, now }) — the ONE writer: the five keys,
  // written whole over whatever stood there, so a second hand-off before the relaunch is idempotent.
  async function requestLoopResume(dir, { loopRunId, scope, workspaceId, by, now = () => new Date() } = {}) {
    const fields = { loopRunId, scope, workspaceId, by, requestedAt: instant(now) };
    const record = {};
    for (const key of RESUME_KEYS) record[key] = fields[key] ?? null;
    await writeRecord(resumeRequestPath(dir, loopRunId), record);
    return record;
  }

  // clearResumeRequest(dir, loopRunId) → `{ cleared, record }`, the `--resume` launch's: deletes the
  // file whatever it holds; `cleared: false` only when there was no file.
  async function clearResumeRequest(dir, loopRunId) {
    const filePath = resumeRequestPath(dir, loopRunId);
    const record = await readResumeRequest(dir, loopRunId);
    try {
      await unlink(filePath);
    } catch (error) {
      if (error?.code === "ENOENT") return { cleared: false, record: null };
      throw error;
    }
    return { cleared: true, record };
  }

  // ── the start request (191/04, ADR-005 §1) ──────────────────────────────────────────────────────

  // The record's FIVE keys, in their one order. `level` is `null` unless the request named one.
  const START_KEYS = Object.freeze(["scope", "workspaceId", "by", "requestedAt", "level"]);

  // Each part of the name is one filename segment by `segmentOf`'s rule, and carries no `--` of its
  // own; a refusal names the argument that was wrong and throws BEFORE any filesystem access.
  function startSegmentOf(value, name) {
    let segment;
    try {
      segment = normalizeId(value);
    } catch (error) {
      throw new TypeError(`${name} must be one filename segment: ${error.message}`);
    }
    if (segment.includes(START_SEPARATOR)) throw new TypeError(`${name} must not contain "${START_SEPARATOR}": ${JSON.stringify(segment)}`);
    return segment;
  }

  function startRequestPath(dir, { workspaceId, scope } = {}) {
    return path.join(dir, `${startSegmentOf(workspaceId, "workspaceId")}${START_SEPARATOR}${startSegmentOf(scope, "scope")}.json`);
  }

  const isStartRecord = (value) => value != null && typeof value === "object" && !Array.isArray(value)
    && typeof value.scope === "string" && value.scope.length > 0
    && typeof value.workspaceId === "string" && value.workspaceId.length > 0;

  async function readStartFile(filePath) {
    let text;
    try {
      text = await readFile(filePath, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      reportDegrade(START_DEGRADE_CODE, error, { path: filePath });
      return null;
    }
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      reportDegrade(START_DEGRADE_CODE, error, { path: filePath });
      return null;
    }
    if (!isStartRecord(parsed)) {
      reportDegrade(START_DEGRADE_CODE, new Error("not a start request: \"scope\" and \"workspaceId\" must be non-empty strings"), { path: filePath });
      return null;
    }
    return parsed;
  }

  // readStartRequests(dir, { workspaceId }) → every start request standing in `dir`, sorted by file
  // name, or only `workspaceId`'s when one is named. An absent directory is `[]`; a file that is not
  // a record is skipped after one degrade event carrying its path. Never throws past the id refusal.
  async function readStartRequests(dir, { workspaceId } = {}) {
    const prefix = workspaceId == null ? null : `${startSegmentOf(workspaceId, "workspaceId")}${START_SEPARATOR}`;
    let names;
    try {
      names = await readdir(dir);
    } catch (error) {
      if (error?.code === "ENOENT") return [];
      reportDegrade(START_DEGRADE_CODE, error, { path: dir });
      return [];
    }
    const records = [];
    for (const name of names.filter((entry) => entry.endsWith(".json")).sort()) {
      if (prefix != null && !name.startsWith(prefix)) continue;
      const record = await readStartFile(path.join(dir, name));
      // The name is a cheap pre-filter; the record's own `workspaceId` is the answer.
      if (record != null && (workspaceId == null || record.workspaceId === workspaceId)) records.push(record);
    }
    return records;
  }

  // requestLoopStart(dir, { scope, workspaceId, by, level, now }) — the ONE writer: the five keys,
  // written whole over whatever stood there, so a second request before the start is idempotent and
  // the later `requestedAt` stands.
  async function requestLoopStart(dir, { scope, workspaceId, by, level = null, now = () => new Date() } = {}) {
    const filePath = startRequestPath(dir, { workspaceId, scope });
    const fields = { scope, workspaceId, by, requestedAt: instant(now), level };
    const record = {};
    for (const key of START_KEYS) record[key] = fields[key] ?? null;
    await writeRecord(filePath, record);
    return record;
  }

  // clearStartRequest(dir, { workspaceId, scope }) → `{ cleared, record }`, the fresh supervised
  // launch's: deletes the file whatever it holds; `cleared: false` only when there was no file.
  async function clearStartRequest(dir, { workspaceId, scope } = {}) {
    const filePath = startRequestPath(dir, { workspaceId, scope });
    const record = await readStartFile(filePath);
    try {
      await unlink(filePath);
    } catch (error) {
      if (error?.code === "ENOENT") return { cleared: false, record: null };
      throw error;
    }
    return { cleared: true, record };
  }

  // spendStartRequest(dir, { workspaceId, scope }) → `{ cleared, scope }`, the fresh supervised launch's
  // (ADR-005 §4): `clearStartRequest` for a well-named request, and `cleared: false` without a throw
  // when the workspace has no id or the scope is not a segment — no request could carry that name.
  async function spendStartRequest(dir, { workspaceId, scope } = {}) {
    const name = typeof scope === "string" ? scope.trim() : "";
    try {
      startRequestPath(dir, { workspaceId, scope: name });
    } catch (error) {
      if (error instanceof TypeError) return { cleared: false, scope: name };
      throw error;
    }
    return { cleared: (await clearStartRequest(dir, { workspaceId, scope: name })).cleared, scope: name };
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
  function createStopSource({
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

  return Object.freeze({ loopStopsDir, loopResumesDir, stopRequestPath, readStopRequest, requestLoopStop, markStopHonoured, clearStopRequest, resumeRequestPath, readResumeRequest, requestLoopResume, clearResumeRequest, loopStartsDir, startRequestPath, readStartRequests, requestLoopStart, clearStartRequest, spendStartRequest, createStopSource });
}
