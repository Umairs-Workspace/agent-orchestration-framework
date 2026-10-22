// src/loop-session-stream.mjs — A LOOP DRIVE'S SESSION, STREAMED THROUGH ITS NODE'S OWN DAEMON
// (162/ADR-001 §3 + §5, ADR-002 §2). Extracted from `commands/drive.mjs` at 162's verify (F-02): the
// drive command spawns and settles a session; this module is the PRODUCER the drive hangs on it —
// the ingress client, the session's two stated facts and their re-statement beat. Nothing here
// decides a drive's outcome: every write is best effort, degrades once and never throws.

import path from "node:path";

// How often a loop drive re-states its session's two facts while its PTY lives: the launched-session
// handler's own ping cadence, well inside the session TTL.
const LOOP_SESSION_RESTATE_MS = 30_000;

// createLoopSessionStreams({ loopSession, readRuns, reportDegrade }) → { openLoopStream, withLoopStream }.
// `loopSession` is the drive's optional port (`openTerminalIngressClient`, `pingSession`,
// `resolveNodeId`, `resolveWorkspaceId`); without it no drive streams.
export function createLoopSessionStreams({ loopSession = null, readRuns, reportDegrade }) {
  // The loop run that drives a lent drive: the `loopRunId` its run record's loop declaration names,
  // else the lent run id itself (still a loop's drive, still read-only). A drive that owns its run
  // is no loop's, and streams nothing.
  async function loopRunIdFor(item, managedRunId) {
    if (managedRunId == null) return null;
    const runs = await Promise.resolve().then(() => readRuns(item)).catch(() => []);
    const run = (Array.isArray(runs) ? runs : []).find((record) => record.runId === managedRunId);
    const declared = run?.brief?.loop?.loopRunId;
    return typeof declared === "string" && declared.length > 0 ? declared : managedRunId;
  }

  // The drive child as PRODUCER. Every chunk with a captured session id is pushed to this node's own
  // terminal ingress; once the ingress admits the connection, the session's record is stated
  // `relaying` and named for its loop run, and re-stated on a beat while the PTY lives. The end
  // marker is pushed once per session. A statement that fails is reported, so the drive is never
  // slowed, failed or retried because of it.
  function createLoopSessionStream(workspace, loopRunId) {
    const ingress = loopSession.openTerminalIngressClient({ workspace, onDegrade: (code, error) => reportDegrade(code, error) });
    const ended = new Set();
    // Every statement in flight, so the stream's close waits for them rather than racing them.
    const inflight = new Set();
    let statedFor = null;
    let restate = null;
    const stop = () => {
      if (restate != null) clearInterval(restate);
      restate = null;
    };
    // Asked again at write time, not only at arm time: a beat already scheduled when the session
    // ended must not re-create the record the session's own hook has just removed.
    const state = (sessionId) => {
      const statement = Promise.resolve()
        .then(() => (ended.has(sessionId) ? null : stateLoopSession(workspace, { sessionId, loopRunId })))
        .catch((error) => reportDegrade("drive-loop-session", error))
        .finally(() => inflight.delete(statement));
      inflight.add(statement);
      return statement;
    };
    const arm = (sessionId) => {
      if (statedFor === sessionId) return;
      statedFor = sessionId;
      ingress.admitted.then((admitted) => {
        if (!admitted || statedFor !== sessionId || ended.has(sessionId)) return;
        state(sessionId);
        stop();
        restate = setInterval(() => state(sessionId), LOOP_SESSION_RESTATE_MS);
        restate.unref?.();
      });
    };
    return {
      onOutputChunk(chunk, sessionId) {
        if (typeof sessionId !== "string" || sessionId.length === 0) return;
        ingress.frame(sessionId, chunk);
        arm(sessionId);
      },
      onSessionEnd(sessionId) {
        stop();
        if (typeof sessionId !== "string" || sessionId.length === 0 || ended.has(sessionId)) return;
        ended.add(sessionId);
        ingress.end(sessionId);
      },
      async close() {
        stop();
        await Promise.allSettled([...inflight]);
        await ingress.close();
      },
    };
  }

  // The statement itself, keyed EXACTLY as the session's own hook keys its record
  // (`aof session start|ping`: this node's id, the workspace's canonical id, the `claude-code`
  // label), so it upserts that record rather than writing a sibling beside it.
  async function stateLoopSession(workspace, { sessionId, loopRunId }) {
    const config = workspace.config ?? {};
    return loopSession.pingSession(workspace, {
      nodeId: await loopSession.resolveNodeId(workspace),
      workspaceId: loopSession.resolveWorkspaceId({ config, projectRoot: workspace.projectRoot }),
      repo: config.name ?? path.basename(workspace.projectRoot),
      assistant: "claude-code",
      sessionId,
      relaying: true,
      loopRunId,
    });
  }

  // Two optional driver hooks composed into one: the caller's own, then the loop stream's.
  const composeHooks = (first, second) => (first == null ? second : second == null ? first : (...args) => {
    try {
      first(...args);
    } catch (error) {
      reportDegrade("drive", error);
    }
    return second(...args);
  });

  // openLoopStream(item, managedRunId, workspace) → the drive's stream, or null when no port is
  // wired or the drive owns its run (162/ADR-001 §5: a drive that is no loop's binds nothing).
  async function openLoopStream(item, managedRunId, workspace) {
    if (loopSession == null) return null;
    const loopRunId = await loopRunIdFor(item, managedRunId);
    return loopRunId == null ? null : createLoopSessionStream(workspace, loopRunId);
  }

  // withLoopStream(baseOptions, stream) → the driver-option overrides that hang the stream on the
  // caller's own hooks; `{}` when there is no stream.
  function withLoopStream(baseOptions, stream) {
    if (stream == null) return {};
    return {
      onOutputChunk: composeHooks(baseOptions.onOutputChunk, stream.onOutputChunk),
      onSessionEnd: composeHooks(baseOptions.onSessionEnd, stream.onSessionEnd),
    };
  }

  return { openLoopStream, withLoopStream };
}
