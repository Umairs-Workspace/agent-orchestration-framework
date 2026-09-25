// src/mesh/terminal-relay-bridge.mjs — the WORKER-SIDE half of the milestone 38 /
// story 06 cross-machine terminal BRIDGE (ADR-014). The net-new work: relay a
// worker's live PTY byte stream (the SAME `term.onData` shape terminal-ws.mjs's
// wireSession and mesh-worker-execution.mjs's driveInteractiveClaudeSession both
// already drive) over the FROZEN `mesh-relay.mjs` envelope as a NEW opaque `signal`
// kind — `"terminal-frame"` — routed by (nodeId, sessionId), with ZERO change to
// the relay itself (the m26-leasing property: an unknown `kind` rides the wire,
// forwarded byte-for-byte, `mesh-relay.mjs:279-298,592-602`).
//
// THE FROZEN ENVELOPE STAYS EXACTLY { kind, nodeId, signal } — `sessionId` rides
// INSIDE the opaque `signal` (beside the PTY bytes), never as a fourth top-level
// envelope key (the relay's `parseEnvelope` reads only `{ kind, nodeId }` and never
// parses `signal` content — ADR-014 invariant 2).
//
// READ-ONLY BY CONSTRUCTION (ADR-014 invariant 1 / SECURITY T14): this module has
// NO write-direction sink and reads NOTHING but its own arguments — no credential
// env, no askpass file, no mint reply — so nothing it builds can carry a secret the
// caller did not already hand it.
//
// milestone 46 / story 01 (ADR-007) — `wireTerminalBridge` LIVED HERE and is DELETED.
// It subscribed to `term.onData` and pushed an envelope per chunk, but it had no
// production caller: the shipped producer is the launcher's
// `onOutputChunk: (chunk, sessionId) => client.sendTerminalFrame(sessionId, String(chunk))`
// (mesh-launcher.mjs, the assignment AND resume call sites) into
// `worker-stream-client.sendTerminalFrame`, which builds the very envelope below.
// T14's surviving half — "the streamed signal is sourced EXCLUSIVELY from the PTY's
// own printed output" — therefore lives on THAT arrow now, and the fitness function
// that used to assert it about this file's dead function
// (`acd-fleet-terminal-input-constrained` detector #4) is re-aimed at it. This module
// keeps only what is live: the frozen envelope builders + the relay push transport.
import { WebSocket } from "ws";
// m42 item 3 — every former silent catch reports a coded degrade event.
import { reportDegrade } from "../degrade.mjs";

// The NEW opaque relay `kind` this bridge introduces (ADR-014 decision 1). A single
// source so the bridge and its tests agree on the literal.
export const TERMINAL_FRAME_KIND = "terminal-frame";

// The INPUT direction's own opaque kind (m42 "interactive worker terminals" —
// operator-overriding SECURITY T14's original read-only decision). A browser
// keystroke rides the fleet face's tuple-bound /ws/terminal-view socket, is
// wrapped in THIS kind by the mesh-ui process, crosses the loopback relay to the
// serve process, and is routed DOWN the worker's admitted stream connection —
// where it may write ONLY the live PTY whose captured sessionId matches exactly.
// One home for the literal: the relay envelope, the control router
// (mesh-terminal-input.mjs) and the worker stream client's dispatch branch all
// import it from here.
export const TERMINAL_INPUT_KIND = "terminal-input";

// The RESUME kind (m42 quick-fix, operator-requested: "run `claude --resume <id>`
// so it can continue from the terminated session"). A control-side CLI
// (`aof mesh terminal-resume`) pushes this envelope into the loopback relay; the
// serve process routes it down the holder's stream; the worker spawns
// `claude --resume <sessionId>` in the assignment's RETAINED worktree and stamps
// the new PTY's terminal frames with the RESUMED session id — so the fleet's
// EXISTING (nodeId, sessionId) tuple simply comes back to life (mirror + input),
// no new discovery surface.
export const TERMINAL_RESUME_KIND = "terminal-resume";

// loopbackRelayUrl(config) → string | null — milestone 38 / story 06 (ADR-014
// AMENDMENT 2026-07-19, hardening owed-before-done). The SHARED dial-url derivation for
// BOTH relay transports below (createTerminalRelayPushTransport, the control-side
// loopback push) AND the fleet subscriber (createTerminalMirrorSubscriberTransport,
// mesh-terminal-mirror.mjs) — both import THIS helper.
//
// WHY: `config.mesh.relay.url` is OVERLOADED — its port + path also drive the FABRIC
// control-stream endpoint (mesh-launcher.mjs substitutes the per-peer fabric HOST onto
// that same port/path). An operator who sets `relay.url` to the control node's FABRIC
// address would therefore silently aim the relay legs at the control-STREAM server
// (which speaks the fabric stream protocol, not the relay fan-out) — a wrong-server
// dial that clean-degrades to NO frames with NO error. The relay legs are SAME-MACHINE
// only (serveRelay binds LOOPBACK — mesh-relay.mjs:622), so this derives ONLY the port
// + path from relay.url and FORCES the host to 127.0.0.1, making the loopback leg
// immune to that overload. UNCONFIGURED (`relay.url` absent/blank/malformed) → null,
// the SAME null-degrade the factories already keep (caller returns a null transport).
export function loopbackRelayUrl(config) {
  const raw = config?.mesh?.relay?.url;
  if (typeof raw !== "string" || raw.length === 0) return null;
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  const port = parsed.port ? `:${parsed.port}` : "";
  return `${parsed.protocol}//127.0.0.1${port}${parsed.pathname}${parsed.search}`;
}

// buildTerminalFrameEnvelope(nodeId, sessionId, bytes) — the FROZEN
// { kind, nodeId, signal } envelope (mesh-relay.mjs / mesh-relay-client.mjs's own
// relayEnvelope/leaseRelayEnvelope shape), with `signal` carrying BOTH the
// sessionId (the routing metadata the relay never parses) and the PTY bytes
// VERBATIM — byte-for-byte what `term.onData` emitted, coerced to a string ONLY
// (never re-encoded/rewritten). A pure projection of its inputs — no fs, no clock,
// no network.
export function buildTerminalFrameEnvelope(nodeId, sessionId, bytes) {
  return {
    kind: TERMINAL_FRAME_KIND,
    nodeId,
    signal: { sessionId: sessionId ?? null, bytes },
  };
}

// buildTerminalEndEnvelope(nodeId, sessionId) — the END-OF-STREAM marker (ADR-014
// AMENDMENT 2026-07-23, structural invariant 8; BLOCKER F-38.06e). A SIBLING of the
// builder above, on the SAME FROZEN envelope and the SAME EXISTING
// `TERMINAL_FRAME_KIND` — the marker rides INSIDE the opaque `signal` (`end: true`),
// beside the sessionId that routes it, and NEVER as a fourth top-level key (inv.2)
// and NEVER as a second `kind`.
//
// WHY INSIDE `signal` (the architect's ruling): a second `kind` would need a new
// branch at THREE kind-switching hops — control-stream-server's terminal-frame
// branch, the control-side loopback push, and the mirror's own kind guard — and each
// is a place a future refactor drops one and re-inerts this seam (this milestone's
// whole failure history). Riding inside `signal` means the control path needs ZERO
// new branches: the existing branch forwards it verbatim with the F17 nodeId
// re-stamp, and the mirror's `routingKey(nodeId, signal.sessionId)` routes it to
// exactly that stream's subscribers, so inv.4 holds BY CONSTRUCTION.
//
// It carries NO bytes at all: an end is a fact about the stream, never terminal
// content (an in-band marker written into the byte stream would be forgeable by the
// worker's OWN printed output — SECURITY T14; the fleet route answers this marker by
// CLOSING the browser socket, which a PTY cannot fake). A pure projection of its
// inputs — no fs, no clock, no network.
export function buildTerminalEndEnvelope(nodeId, sessionId) {
  return {
    kind: TERMINAL_FRAME_KIND,
    nodeId,
    signal: { sessionId: sessionId ?? null, end: true },
  };
}

// buildTerminalInputEnvelope(nodeId, sessionId, bytes) — the INPUT direction's
// envelope, on the SAME FROZEN { kind, nodeId, signal } shape as the two builders
// above (the relay never parses `signal`; sessionId rides INSIDE it, never as a
// fourth top-level key). Here `nodeId` is the TARGET worker (the tuple's own
// nodeId — the output direction's source becomes the input direction's
// destination; one tuple, two directions). `bytes` are the browser's keystrokes
// VERBATIM — opaque terminal input, coerced to a string only, never parsed and
// never branched on (a pasted "{...}" must reach the PTY as typed text, so there
// is deliberately NO control-message sniffing on this lane). A pure projection of
// its inputs — no fs, no clock, no network.
export function buildTerminalInputEnvelope(nodeId, sessionId, bytes) {
  return {
    kind: TERMINAL_INPUT_KIND,
    nodeId,
    signal: { sessionId: sessionId ?? null, bytes },
  };
}

// buildTerminalResumeEnvelope(nodeId, { sessionId, assignmentId, workspaceId,
// itemRef, reservedAt, previousNodeId, parkId }) — the resume request, on the SAME
// FROZEN { kind, nodeId, signal }
// shape (nodeId = the TARGET worker, exactly as the input envelope). The signal
// carries the full worktree-resolution context the worker needs (the assignment
// names the retained worktree dir; the workspaceId names which checkout). parkId
// is the durable assignment.reported event being answered, so relay duplication
// remains one resume while a later park has a new identity. The reservation fields
// let either router or worker restore exactly this reservation on a proven refusal.
// `answer` ({ text, by, askedAt }, 131/04) rides last, and only when `work:answer` carried one.
// A pure projection of its inputs — no fs, no clock, no network.
export function buildTerminalResumeEnvelope(nodeId, { sessionId, assignmentId, workspaceId, itemRef, reservedAt, previousNodeId, parkId, answer } = {}) {
  return {
    kind: TERMINAL_RESUME_KIND,
    nodeId,
    signal: {
      sessionId: sessionId ?? null,
      assignmentId: assignmentId ?? null,
      workspaceId: workspaceId ?? null,
      itemRef: itemRef ?? null,
      ...(reservedAt == null ? {} : { reservedAt }),
      ...(previousNodeId == null ? {} : { previousNodeId }),
      parkId: parkId ?? null,
      ...(answer == null ? {} : { answer }),
    },
  };
}

// createTerminalRelayPushTransport(config, { timeoutMs }) →
// { push(envelope): Promise<void>, close() } | null — the PRODUCTION push
// transport: a PERSISTENT ws@8 socket to `config.mesh.relay.url`, mirroring
// mesh-presence-subscriber.mjs's `createSubscriberTransport` connect() shape
// (m23/ADR-003 — resolve on the broker's `{ type:'joined' }` ack), but for
// SENDING: a live PTY emits many frames per second, so — unlike
// mesh-relay-client.mjs's ONE-SHOT connect→push-one-frame→dispose presence
// client — this transport connects ONCE (lazily, on the first push) and REUSES
// the SAME socket for every subsequent push. UNCONFIGURED (no
// config.mesh.relay.url) returns null so the caller degrades to
// "no push attempted" (the same clean-degrade posture mesh-relay-client.mjs's
// createRelayClient keeps). Real-socket behaviour is exercised by the @manual
// two-machine soak (task 03), not @executable CI — this stays a thin seam,
// exactly like createRelayClient / createSubscriberTransport.
export function createTerminalRelayPushTransport(config, { timeoutMs = 3000 } = {}) {
  // ADR-014 AMENDMENT hardening — dial the FORCED-LOOPBACK url (loopbackRelayUrl),
  // never the raw config.mesh.relay.url whose host is overloaded onto the fabric
  // control-stream endpoint. Unconfigured -> null -> the caller degrades to no push.
  const url = loopbackRelayUrl(config);
  if (url == null) {
    return null;
  }

  let socket = null;
  let connecting = null;

  function connectOnce() {
    if (socket != null && socket.readyState === WebSocket.OPEN) {
      return Promise.resolve(socket);
    }
    if (connecting != null) return connecting;
    connecting = new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          try { ws.close(); } catch (error) { /* noop */
      reportDegrade("mesh-terminal-relay-bridge", error); }
          reject(new Error("terminal relay connect: join-ack timeout"));
        }
      }, timeoutMs);
      ws.on("message", (data) => {
        let parsed = null;
        try { parsed = JSON.parse(data.toString()); } catch (error) { /* raw frame */
      reportDegrade("mesh-terminal-relay-bridge", error); }
        if (parsed && parsed.type === "joined" && !settled) {
          settled = true;
          clearTimeout(timer);
          socket = ws;
          resolve(ws);
        }
      });
      ws.on("error", (error) => {
        if (!settled) { settled = true; clearTimeout(timer); reject(error); return; }
        socket = null;
      });
      ws.on("close", () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(new Error("terminal relay connect: socket closed before the join ack"));
          return;
        }
        socket = null;
      });
    }).finally(() => {
      connecting = null;
    });
    return connecting;
  }

  return {
    async push(envelope) {
      const ws = await connectOnce();
      return new Promise((resolve, reject) => {
        ws.send(JSON.stringify(envelope), (error) => (error ? reject(error) : resolve()));
      });
    },
    close() {
      try { socket?.close(); } catch (error) { /* already closing */
      reportDegrade("mesh-terminal-relay-bridge", error); }
      socket = null;
    },
  };
}
