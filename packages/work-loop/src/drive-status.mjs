// packages/work-loop/src/drive-status.mjs — THE DRIVE STATUS LINE (162/ADR-004).
//
// A refine drive runs for an hour behind one `Driving 03/07` line, and on 2026-09-27 the operator
// stopped a healthy loop twice because it looked dead. So while a drive runs, the loop prints
//
//   <ref> — <elapsed>, <n> subagent(s) active, last activity <age> ago
//
// every five minutes (EXAMPLES Q2) — a fixed constant, deliberately not a config key. Before the
// drive's session id is known the line reads `<ref> — <elapsed>, session starting`.
//
// WHERE IT HANGS. `spawnLaneDrive` (`./child-drive.mjs`) is the one seam every drive crosses,
// sequential and lane alike, so the ticker is started there while the child is pending and stopped
// when it settles. It prints through the `narrate` its caller hands it — the caller's own in-flight
// printer — so `--quiet` silences it exactly as it silences every other in-flight line, and this
// module prints nothing of its own.
//
// WHAT IT READS, AND WHOSE. "Last activity" is the drive run's consumed heartbeat — the same value
// the loop's stall bound reads (ADR-003 §1), so the line, the UI's quiet flag and the kill agree on
// what quiet means. It is READ off the run record and never consumed here: the child's own stall
// check consumes the queue, and a second consumer racing it from the parent would be a second
// writer of one record. "Subagents active" counts the session's `subagents/*.jsonl` transcripts
// written within the last interval. Both are the LANE's — its run record and its Claude projects
// directory — never the primary's, because a lane is a separate checkout.
//
// FAILURE-ISOLATED. A fact that cannot be read is reported and the line says what is known; a tick
// never throws into the drive it describes.
import path from "node:path";
import { readdir as fsReaddir, stat as fsStat } from "node:fs/promises";

// The cadence — five minutes, the operator's answer to EXAMPLES Q2.
export const DRIVE_STATUS_INTERVAL_MS = 5 * 60 * 1000;

// `5 s`, `14 min`, `1 h 05 min` — the same shape the UI's loop line uses for the same facts.
export function formatDriveDuration(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
}

// driveStatusLine({ ref, elapsedMs, sessionId, subagentsActive, lastActivityAgeMs }) — the line,
// PURE over its facts. No session id → `session starting`; a session with no heartbeat yet →
// `no activity yet`.
export function driveStatusLine({ ref, elapsedMs, sessionId = null, subagentsActive = 0, lastActivityAgeMs = null }) {
  const head = `${ref} — ${formatDriveDuration(elapsedMs)}`;
  if (typeof sessionId !== "string" || sessionId.length === 0) return `${head}, session starting`;
  const count = Number.isInteger(subagentsActive) && subagentsActive > 0 ? subagentsActive : 0;
  const subagents = `${count} ${count === 1 ? "subagent" : "subagents"} active`;
  const activity = Number.isFinite(lastActivityAgeMs) ? `last activity ${formatDriveDuration(lastActivityAgeMs)} ago` : "no activity yet";
  return `${head}, ${subagents}, ${activity}`;
}

// withDriveStatus(spawnDrive, { narrate, resolveItem }) — a spawn seam whose every drive carries its
// status ticker's `status`: the caller's printer and the drive's item, resolved lazily by its ref
// at the first tick. The sequential loop wraps its child spawn with it; a lane passes its own.
export function withDriveStatus(spawnDrive, { narrate, resolveItem }) {
  return (args) => spawnDrive({ ...args, status: { narrate, item: () => resolveItem(args.ref) } });
}

// Application services enter explicitly; construction starts no timer and reads nothing.
export function createDriveStatus({ readRuns, claudeProjectsDir, reportDegrade, readdir = fsReaddir, stat = fsStat, timers = null, clock = null }) {
  if (typeof readRuns !== "function") throw new TypeError("createDriveStatus: readRuns is required");
  if (typeof claudeProjectsDir !== "function") throw new TypeError("createDriveStatus: claudeProjectsDir is required");
  const schedule = timers ?? { setInterval: (fn, ms) => setInterval(fn, ms), clearInterval: (handle) => clearInterval(handle) };
  const nowMs = () => (typeof clock === "function" ? clock() : Date.now());
  const degrade = (error) => {
    try {
      reportDegrade?.("drive-status", error);
    } catch {
      // a reporting fault is never the drive's
    }
  };

  // The subagent transcripts written within the last interval, under the LANE's own projects dir.
  async function activeSubagents({ lane, env, sessionId, atMs }) {
    const dir = path.join(claudeProjectsDir({ cwd: lane, ...(env == null ? {} : { env: { ...process.env, ...env } }) }), sessionId, "subagents");
    let names;
    try {
      names = await readdir(dir);
    } catch (error) {
      if (error?.code !== "ENOENT") degrade(error);
      return 0;
    }
    let active = 0;
    for (const name of names) {
      if (!name.endsWith(".jsonl")) continue;
      try {
        const { mtimeMs } = await stat(path.join(dir, name));
        if (atMs - mtimeMs <= DRIVE_STATUS_INTERVAL_MS) active += 1;
      } catch (error) {
        if (error?.code !== "ENOENT") degrade(error);
      }
    }
    return active;
  }

  // readDriveFacts({ item, runId, lane, env, atMs }) → { sessionId, lastActivityAgeMs, subagentsActive }
  // `item` is the drive's item AS THE LANE SEES IT, or a function that resolves it.
  async function readDriveFacts({ item, runId, lane, env, atMs }) {
    let run = null;
    try {
      const resolved = typeof item === "function" ? await item() : item;
      run = resolved == null ? null : (await readRuns(resolved)).find((record) => record.runId === runId) ?? null;
    } catch (error) {
      degrade(error);
    }
    const sessionId = typeof run?.sessionId === "string" && run.sessionId.length > 0 ? run.sessionId : null;
    const heartbeatAt = Date.parse(run?.heartbeatAt ?? "");
    const lastActivityAgeMs = Number.isFinite(heartbeatAt) ? atMs - heartbeatAt : null;
    const subagentsActive = sessionId == null ? 0 : await activeSubagents({ lane, env, sessionId, atMs });
    return { sessionId, lastActivityAgeMs, subagentsActive };
  }

  // startDriveStatus({ ref, runId, lane, env, status }) → { stop() } — arm the ticker for one drive.
  // `status` is `{ narrate, item }`; with no `narrate` nothing is armed. A tick that is still
  // reading when the drive settles prints nothing: `stop()` is final, and checked after the read.
  function startDriveStatus({ ref, runId, lane, env, status }) {
    if (typeof status?.narrate !== "function") return { stop() {} };
    const startedAtMs = nowMs();
    let stopped = false;
    const tick = async () => {
      const atMs = nowMs();
      const facts = await readDriveFacts({ item: status.item, runId, lane, env, atMs });
      if (stopped) return;
      await status.narrate(driveStatusLine({ ref, elapsedMs: atMs - startedAtMs, ...facts }));
    };
    const handle = schedule.setInterval(() => {
      tick().catch(degrade);
    }, DRIVE_STATUS_INTERVAL_MS);
    handle?.unref?.();
    return {
      stop() {
        if (stopped) return;
        stopped = true;
        schedule.clearInterval(handle);
      },
    };
  }

  return Object.freeze({ DRIVE_STATUS_INTERVAL_MS, driveStatusLine, readDriveFacts, startDriveStatus });
}
