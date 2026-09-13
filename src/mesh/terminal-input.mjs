// src/mesh/terminal-input.mjs — the CONTROL-SIDE half of m42's "interactive worker
// terminals" (SECURITY T14's read-only decision operator-overridden; the constrained
// shape is pinned by acd-fleet-terminal-input-constrained). The INPUT direction's
// router: the mesh-ui process wraps a browser keystroke in a `terminal-input` relay
// envelope (tuple-bound at the socket, mesh-ui-serve.mjs) and pushes it into the
// loopback broker; the serve process SELF-SUBSCRIBES to its own broker and hands
// every inbound frame here. This router:
//   - is KIND-BLIND to everything but its THREE named kinds — TERMINAL_INPUT_KIND,
//     TERMINAL_RESUME_KIND and (m50/story 02, ADR-006) SESSION_SPAWN_KIND (the
//     mirror's own discipline — the same subscriber socket also carries every
//     terminal-frame the control pushes for the fleet mirror; those return false
//     untouched),
//   - validates SHAPE only (a non-empty target nodeId, a non-empty sessionId, a
//     non-empty string of bytes) — the WORKER is the authority on whether that
//     session is live (its input registry writes only an exactly-matched live
//     PTY), and the targeting map is the authority on admission (populated only
//     post-admission, SECURITY T5),
//   - routes DOWN the worker's admitted stream connection via the SAME
//     dispatchDirective seam the withdraw notify uses ({ kind, to, ... } — the
//     down-frame carries sessionId + bytes; the relay envelope never crosses the
//     fabric),
//   - never throws, never logs a keystroke's CONTENT (input may be an operator's
//     answer to a secret prompt — codes and counts only).
//
// PURE IN-MEMORY: no fs, no store, no durable write — a lost input frame is a
// keystroke the operator retypes, never a correctness fault.
import { TERMINAL_INPUT_KIND, TERMINAL_RESUME_KIND } from "./terminal-relay-bridge.mjs";
// milestone 50 / story 02 (ADR-006) — the THIRD named lane on this router. The kind
// literal and the down-frame builder come from the session-spawn lane's OWN home, so
// the fleet route that pushes the envelope and the router that unwraps it share one
// contract and there is no re-spelled literal on either side.
import { SESSION_SPAWN_KIND, buildSessionSpawnFrame } from "./session-spawn-directive.mjs";
import { reportDegrade } from "../degrade.mjs";

// THE ONE OUTCOME ONLY THE CONTROL CAN SEE (milestone 50 / story 04, ADR-008 decision 3).
//
// `POST /api/mesh/session` answers 503 `session-target-not-connected` from the fleet
// PROJECTION's presence freshness, and that freshness is a 60-SECOND RAMP — so a node
// whose admitted stream died 40 seconds ago is still `live` to the route, gets a 200, and
// its envelope arrives HERE, where the dispatch reports not-sent and the only trace was a
// log line in a process no browser talks to. The SAME code is minted on both phases
// deliberately (pre-200 by the route's presence check, post-200 here) so DESIGN's failure
// map needs no new row and the operator reads the same true sentence whichever phase
// caught it.
const SESSION_TARGET_NOT_CONNECTED = "session-target-not-connected";

// createTerminalInputRouter({ dispatchDirective, now, onLog, onSessionSpawnRefused }) →
// { apply(frame) }.
// The `apply` shape is deliberately the terminal MIRROR's own consumer contract
// (createTerminalMirror().apply) so the EXISTING subscriber machinery
// (startTerminalMirrorSubscriber + createTerminalMirrorSubscriberTransport —
// parse, backoff, reconnect) drives this router with zero new transport code: the
// serve process hands this object in as the "mirror".
//
// `onSessionSpawnRefused({ nodeId, sessionId, code })` — ADR-008 decision 3's injected
// sink, in this module's established injection idiom (it already takes `dispatchDirective`,
// `now` and `onLog`) and default no-op. It is called on the session-spawn lane's EXISTING
// FAILURE EXITS and NOWHERE else: this router gains NO new kind branch, because it is the
// DOWN direction's authority and the ack is UP. A lane that both dispatches and interprets
// its own replies is the shape the process split was drawn to avoid — so this callback
// REPORTS a dispatch outcome and never reads one.
//
// THOSE EXITS ARE TWO, NOT ONE (architect ruling, review 2026-08-14). ADR-008 decision 3
// placed the callback in the `result?.sent !== true` branch alone, and the dispatch's THROW
// path is equally reachable: `sendDirective` (control-stream-server.mjs) tests
// `ws.readyState !== WebSocket.OPEN` and THEN calls `ws.send(...)`, so a socket that moves
// OPEN -> CLOSING between those two statements throws out of the seam. Caught and swallowed,
// that is the control OBSERVING the fault and telling nobody: the browser waits out its full
// 15s window and renders "the node has reported nothing", which is false — this process knew.
// That is the control-only-fact-with-no-reader shape ADR-008 exists to close, so both exits
// announce, and both announce the SAME code (see below).
export function createTerminalInputRouter({ dispatchDirective, now, onLog, onSessionSpawnRefused, onTerminalResumeRefused } = {}) {
  const resolveNow = () => (typeof now === "function" ? now() : now ?? new Date().toISOString());
  // A not-connected target is reported ONCE per (nodeId, sessionId) per router
  // lifetime — a worker that is offline while an operator types would otherwise
  // log every keystroke.
  const reportedMisses = new Set();
  const log = (level, code, message) => {
    try {
      onLog?.({ level, code, message });
    } catch (error) {
      reportDegrade("mesh-terminal-input", error);
    }
  };
  // ONE HOME for "the browser is holding a sessionId this control node knows can never
  // become a session" (ADR-008 decision 3). Both failure exits of the session-spawn lane
  // call it with the SAME code — `session-target-not-connected` is true of each: the
  // not-sent result says the target has no live stream connection, and the throw says the
  // send onto that connection failed because the socket is unusable. One code means the
  // browser keeps exactly ONE reader and DESIGN's failure map needs no new row.
  //
  // A sink fault is reported and swallowed: a refusal that cannot be announced is still a
  // refusal, and `apply` never throws.
  const announceSpawnRefusal = (nodeId, sessionId) => {
    try {
      onSessionSpawnRefused?.({ nodeId, sessionId, code: SESSION_TARGET_NOT_CONNECTED });
    } catch (error) {
      reportDegrade("mesh-terminal-input", error);
    }
  };
  const announceResumeRefusal = (detail) => {
    try {
      const announced = onTerminalResumeRefused?.(detail);
      if (announced && typeof announced.catch === "function") {
        announced.catch((error) => reportDegrade("mesh-terminal-input", error));
      }
    } catch (error) {
      reportDegrade("mesh-terminal-input", error);
    }
  };
  return {
    // apply(envelope) → boolean (true iff the frame was routed down a live worker
    // connection). Mirrors createTerminalMirror().apply's guarantees: never
    // throws, ignores every foreign kind, drops an unroutable frame without
    // disturbing anything else.
    apply(envelope) {
      if (envelope == null || typeof envelope !== "object") return false;
      if (
        envelope.kind !== TERMINAL_INPUT_KIND
        && envelope.kind !== TERMINAL_RESUME_KIND
        && envelope.kind !== SESSION_SPAWN_KIND
      ) return false;
      if (typeof dispatchDirective !== "function") return false;
      const signal = envelope.signal;
      const nodeId = typeof envelope.nodeId === "string" && envelope.nodeId.length > 0 ? envelope.nodeId : null;
      const sessionId = signal != null && typeof signal.sessionId === "string" && signal.sessionId.length > 0 ? signal.sessionId : null;

      // The RESUME lane (m42 quick-fix): a CLI-pushed request to re-attach a
      // parked/killed session — routed down the holder's stream like the input
      // lane, carrying the worktree-resolution context. Logged (a resume is a
      // deliberate operator act, one line — unlike a keystroke).
      if (envelope.kind === TERMINAL_RESUME_KIND) {
        const assignmentId = signal != null && typeof signal.assignmentId === "string" && signal.assignmentId.length > 0 ? signal.assignmentId : null;
        const workspaceId = signal != null && typeof signal.workspaceId === "string" && signal.workspaceId.length > 0 ? signal.workspaceId : null;
        const itemRef = signal != null && typeof signal.itemRef === "string" && signal.itemRef.length > 0 ? signal.itemRef : null;
        const reservedAt = signal != null && typeof signal.reservedAt === "string" && signal.reservedAt.length > 0 ? signal.reservedAt : null;
        const previousNodeId = signal != null && typeof signal.previousNodeId === "string" && signal.previousNodeId.length > 0 ? signal.previousNodeId : null;
        const parkId = signal != null && typeof signal.parkId === "string" && signal.parkId.length > 0 ? signal.parkId : null;
        if (nodeId == null || sessionId == null || assignmentId == null || workspaceId == null || itemRef == null || reservedAt == null || previousNodeId == null || parkId == null) {
          log("warn", "terminal-resume-invalid", "terminal-resume frame dropped: missing nodeId/sessionId/assignmentId/workspaceId/reservation/parkId");
          if (nodeId != null && assignmentId != null && reservedAt != null && previousNodeId != null) {
            announceResumeRefusal({ assignmentId, reservedAt, targetNodeId: nodeId, previousNodeId, code: "terminal-resume-frame-invalid" });
          }
          return false;
        }
        let result;
        try {
          result = dispatchDirective({
            kind: TERMINAL_RESUME_KIND,
            to: nodeId,
            sessionId,
            assignmentId,
            workspaceId,
            itemRef,
            reservedAt,
            targetNodeId: nodeId,
            previousNodeId,
            parkId,
            at: resolveNow(),
          });
        } catch (error) {
          reportDegrade("mesh-terminal-input", error);
          if (reservedAt != null) announceResumeRefusal({ assignmentId, reservedAt, targetNodeId: nodeId, previousNodeId, code: "terminal-resume-target-not-connected" });
          return false;
        }
        if (result?.sent !== true) {
          log("warn", "terminal-resume-target-not-connected", `terminal resume for session ${sessionId} dropped: node ${nodeId} has no live stream connection (${result?.code ?? "no-code"})`);
          if (reservedAt != null) announceResumeRefusal({ assignmentId, reservedAt, targetNodeId: nodeId, previousNodeId, code: "terminal-resume-target-not-connected" });
          return false;
        }
        log("info", "terminal-resume-dispatched", `terminal resume dispatched: session ${sessionId} (assignment ${assignmentId}) -> ${nodeId}`);
        return true;
      }

      // The SESSION-SPAWN lane (milestone 50 / story 02, ADR-006 decision 3): the
      // fleet face's POST /api/mesh/session pushes its envelope into the loopback
      // relay from the mesh-UI process; the serve process's self-subscription hands
      // it here, and it is routed DOWN the target worker's admitted stream by the
      // SAME dispatchDirective seam the two lanes above use. It lives in THIS router
      // rather than a sibling one because the singular subscriber machinery (parse,
      // backoff, reconnect) is here — a second router would duplicate all of it for
      // one kind.
      //
      // SHAPE ONLY, exactly like the lanes above (ADR-006 decision 3): a non-empty
      // nodeId, sessionId and workspaceId. The router is NOT an authority on whether
      // the worker can spawn (the worker answers that with its own ack) and NOT an
      // authority on admission — `directiveTargets` is populated only POST-admission
      // (SECURITY T5), so a revoked or unadmitted pair simply has no target entry and
      // the dispatch reports not-connected here rather than being waved through.
      //
      // Logged as ONE line per spawn (a deliberate operator act, like the resume lane
      // — never the per-keystroke silence the input lane needs).
      if (envelope.kind === SESSION_SPAWN_KIND) {
        const workspaceId = signal != null && typeof signal.workspaceId === "string" && signal.workspaceId.length > 0 ? signal.workspaceId : null;
        if (nodeId == null || sessionId == null || workspaceId == null) {
          log("warn", "session-spawn-invalid", "session-spawn frame dropped: missing nodeId/sessionId/workspaceId");
          return false;
        }
        let result;
        try {
          // The down-frame is rebuilt through the lane's OWN builder — the ADR-002
          // wire shape has one home, so the router can never mint a frame the worker's
          // receive branch does not recognise. The control's mint instant rides
          // through when the envelope carries one; a frame that lost it is stamped
          // here rather than dispatched without an `at`.
          result = dispatchDirective(buildSessionSpawnFrame(nodeId, {
            sessionId,
            workspaceId,
            assistant: signal.assistant,
            itemRef: signal.itemRef,
            at: typeof signal.at === "string" && signal.at.length > 0 ? signal.at : resolveNow(),
          }));
        } catch (error) {
          // THE THROW EXIT (architect ruling, review 2026-08-14). The dispatch seam blew up
          // mid-send — the OPEN -> CLOSING race in `sendDirective` is the measured way that
          // happens — so the frame did NOT reach the worker and this process is the only one
          // that knows. Reported as a degrade AND announced onto the outcome lane; before
          // this line the fault was observed and swallowed, and the browser's 15s window
          // expired into "the node has reported nothing" while the control held the truth.
          reportDegrade("mesh-terminal-input", error);
          announceSpawnRefusal(nodeId, sessionId);
          return false;
        }
        if (result?.sent !== true) {
          log("warn", "session-spawn-target-not-connected", `session spawn ${sessionId} dropped: node ${nodeId} has no live stream connection (${result?.code ?? "no-code"})`);
          // ADR-008 decision 3 — the SAME log line, now with a reader. The browser is
          // holding a sessionId this control node knows can never become a session; this
          // is the only place in the system where that is knowable, and the callback is
          // what carries it back onto the outcome lane.
          announceSpawnRefusal(nodeId, sessionId);
          return false;
        }
        log("info", "session-spawn-dispatched", `session spawn dispatched: session ${sessionId} (workspace ${workspaceId}) -> ${nodeId}`);
        return true;
      }

      const bytes = signal != null && typeof signal.bytes === "string" && signal.bytes.length > 0 ? signal.bytes : null;
      if (nodeId == null || sessionId == null || bytes == null) {
        log("warn", "terminal-input-invalid", "terminal-input frame dropped: missing nodeId/sessionId/bytes");
        return false;
      }
      let result;
      try {
        result = dispatchDirective({ kind: TERMINAL_INPUT_KIND, to: nodeId, sessionId, bytes, at: resolveNow() });
      } catch (error) {
        reportDegrade("mesh-terminal-input", error);
        return false;
      }
      if (result?.sent !== true) {
        const missKey = `${nodeId}::${sessionId}`;
        if (!reportedMisses.has(missKey)) {
          reportedMisses.add(missKey);
          log("warn", "terminal-input-target-not-connected", `terminal input for session ${sessionId} dropped: node ${nodeId} has no live stream connection (${result?.code ?? "no-code"}); further drops for this tuple are silent`);
        }
        return false;
      }
      return true;
    },
  };
}
