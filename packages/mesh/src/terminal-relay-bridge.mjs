import http from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { WebSocket, WebSocketServer } from "ws";

export const TERMINAL_FRAME_KIND = "terminal-frame";
export const TERMINAL_INPUT_KIND = "terminal-input";
export const TERMINAL_RESUME_KIND = "terminal-resume";

// 162/ADR-001 — the LOCAL TERMINAL INGRESS: a loopback-only door into this node's own daemon
// through which a separate process (a loop's `aof work drive` child) hands it PTY output to
// forward on the leg the daemon's role already owns. Its token header is the only way through
// the upgrade. Where its address is published is the mesh store's (`store.mjs`), never this
// module's: the bridge stays in-memory only (ADR-014 inv.3), so it writes and reads no file.
export const TERMINAL_INGRESS_TOKEN_HEADER = "x-aof-ingress-token";
const TERMINAL_INGRESS_HOST = "127.0.0.1";
// A chunk the child buffers while its connection is still being admitted. Bounded, because a
// door that never answers must not grow a drive's memory; past it, chunks are dropped.
const TERMINAL_INGRESS_PENDING_LIMIT = 512;

// Application services enter through explicit ports; construction starts no network or timer.
export function createTerminalRelayBridge({ reportDegrade }) {
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
// m42 item 3 — every former silent catch reports a coded degrade event.
//
// 162/ADR-001 — the terminal INGRESS lives here too, beside the push transport it resembles.
// Its two halves keep this module's read-only discipline: the server forwards what it is
// handed and has no write-direction sink, and both publish and read the ingress's address
// through ports the caller supplies — this module touches no file and no secret it was not
// handed.

// The NEW opaque relay `kind` this bridge introduces (ADR-014 decision 1). A single
// source so the bridge and its tests agree on the literal.


// The INPUT direction's own opaque kind (m42 "interactive worker terminals" —
// operator-overriding SECURITY T14's original read-only decision). A browser
// keystroke rides the fleet face's tuple-bound /ws/terminal-view socket, is
// wrapped in THIS kind by the mesh-ui process, crosses the loopback relay to the
// serve process, and is routed DOWN the worker's admitted stream connection —
// where it may write ONLY the live PTY whose captured sessionId matches exactly.
// One home for the literal: the relay envelope, the control router
// (mesh-terminal-input.mjs) and the worker stream client's dispatch branch all
// import it from here.


// The RESUME kind (m42 quick-fix, operator-requested: "run `claude --resume <id>`
// so it can continue from the terminated session"). A control-side CLI
// (`aof mesh terminal-resume`) pushes this envelope into the loopback relay; the
// serve process routes it down the holder's stream; the worker spawns
// `claude --resume <sessionId>` in the assignment's RETAINED worktree and stamps
// the new PTY's terminal frames with the RESUMED session id — so the fleet's
// EXISTING (nodeId, sessionId) tuple simply comes back to life (mirror + input),
// no new discovery surface.


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
function loopbackRelayUrl(config) {
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
function buildTerminalFrameEnvelope(nodeId, sessionId, bytes) {
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
function buildTerminalEndEnvelope(nodeId, sessionId) {
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
function buildTerminalInputEnvelope(nodeId, sessionId, bytes) {
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
function buildTerminalResumeEnvelope(nodeId, { sessionId, assignmentId, workspaceId, itemRef, reservedAt, previousNodeId, parkId, answer } = {}) {
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
function createTerminalRelayPushTransport(config, { timeoutMs = 3000 } = {}) {
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

// A presented token is compared in constant time, and anything that is not a string of the
// token's own length is refused before the comparison is asked.
function ingressTokenMatches(presented, token) {
  if (typeof presented !== "string" || typeof token !== "string") return false;
  const left = Buffer.from(presented, "utf8");
  const right = Buffer.from(token, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

// routeIngressMessage(data, forward) — the ingress's whole vocabulary: a `frame` (a session
// id and its bytes) or an `end` (a session id). Only those fields are read, so a `nodeId` the
// client sent never reaches the forward: the daemon stamps its OWN id one hop later (the F17
// re-stamp, ADR-001 §2). An unparseable message, an unknown type, a session id that is not a
// non-empty string, or bytes that are not a string are dropped without a reply — the ingress
// answers nothing back, so it is not a channel into the drive. Returns what it forwarded.
function routeIngressMessage(data, forward) {
  let message;
  try {
    message = JSON.parse(String(data));
  } catch {
    return null;
  }
  const sessionId = typeof message?.sessionId === "string" && message.sessionId.length > 0 ? message.sessionId : null;
  if (sessionId == null) return null;
  if (message.type === "frame" && typeof message.bytes === "string") {
    forward.frame(sessionId, message.bytes);
    return "frame";
  }
  if (message.type === "end") {
    forward.end(sessionId);
    return "end";
  }
  return null;
}

// startTerminalIngress({ forward, publish, withdraw }) → { port, stop() } — the DAEMON half
// (ADR-001 §1). One ws server on 127.0.0.1 and an ephemeral port, whose upgrade is refused
// unless the request carries the per-start random token. Once it listens, `publish` is handed
// `{ host, port, token, pid }` to make it findable, and `withdraw` is handed the token on stop.
// The listening socket is unref'd: the ingress never holds a process open that nothing else is
// keeping alive. A forward fault is reported and swallowed — a forwarding leg's trouble never
// reaches the child. A publish that fails closes the server and fails the start.
async function startTerminalIngress({ forward, publish, withdraw, token = randomBytes(32).toString("hex") } = {}) {
  const safeForward = {
    frame: (sessionId, bytes) => forwardSafely(() => forward.frame(sessionId, bytes)),
    end: (sessionId) => forwardSafely(() => forward.end(sessionId)),
  };
  const httpServer = http.createServer((_request, response) => {
    response.writeHead(404);
    response.end();
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1 << 20 });
  httpServer.on("upgrade", (request, socket, head) => {
    if (!ingressTokenMatches(request.headers[TERMINAL_INGRESS_TOKEN_HEADER], token)) {
      socket.end("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      return;
    }
    wss.handleUpgrade(request, socket, head, (client) => wss.emit("connection", client, request));
  });
  wss.on("connection", (client) => {
    client.on("error", (error) => reportDegrade("mesh-terminal-ingress", error));
    client.on("message", (data) => routeIngressMessage(data, safeForward));
    client.send(JSON.stringify({ type: "admitted" }));
  });
  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(0, TERMINAL_INGRESS_HOST, () => {
      httpServer.off("error", reject);
      resolve();
    });
  });
  httpServer.unref();
  const { port } = httpServer.address();
  const close = () => {
    for (const client of wss.clients) client.terminate();
    wss.close();
    httpServer.close();
  };
  try {
    await publish?.({ host: TERMINAL_INGRESS_HOST, port, token, pid: process.pid });
  } catch (error) {
    close();
    throw error;
  }
  return {
    port,
    async stop() {
      close();
      try {
        await withdraw?.(token);
      } catch (error) {
        reportDegrade("mesh-terminal-ingress", error);
      }
    },
  };
}

function forwardSafely(send) {
  try {
    const sent = send();
    if (sent && typeof sent.catch === "function") sent.catch((error) => reportDegrade("mesh-terminal-ingress", error));
  } catch (error) {
    reportDegrade("mesh-terminal-ingress", error);
  }
}

// openTerminalIngressClient({ readAddress, onDegrade }) → { frame, end, admitted, close } — the
// DRIVE CHILD half (ADR-001 §3). `readAddress()` answers the published `{ port, token }`, or null
// when no daemon has published one. Lazy: nothing is read or dialled until the first frame. Best
// effort and fire-and-forget: `frame`/`end` never throw and never wait, and chunks sent while
// the connection is being admitted are held (bounded) and flushed on admission. A missing
// address file, a refused token, a timeout or a closed socket ends the client for the rest of
// the drive — no reconnect, so a door that is shut costs ONE coded degrade event, not one per
// chunk. `admitted` resolves true once the daemon has said so, false when the client ended
// first. `close()` waits for a pending admission (bounded by `timeoutMs`) so a short drive's
// end marker is not dropped, then closes the socket after its queued sends.
function openTerminalIngressClient({ readAddress, onDegrade, timeoutMs = 3000 } = {}) {
  let state = "idle";
  let socket = null;
  let pending = [];
  let degraded = false;
  let settleAdmitted;
  const admitted = new Promise((resolve) => {
    settleAdmitted = resolve;
  });

  const degrade = (code, error) => {
    if (degraded) return;
    degraded = true;
    // reportDegrade never throws (degrade.mjs); a caller's onDegrade might, and its fault is reported, not lost.
    if (onDegrade == null) { reportDegrade(code, error); return; }
    try {
      onDegrade(code, error);
    } catch (reportError) {
      reportDegrade("mesh-terminal-ingress", reportError);
    }
  };

  const end = (code, error) => {
    if (state === "dead") return;
    state = "dead";
    pending = [];
    settleAdmitted(false);
    degrade(code, error);
    try {
      socket?.terminate?.();
    } catch (terminateError) {
      reportDegrade("mesh-terminal-ingress", terminateError);
    }
  };

  const write = (message) => {
    try {
      socket.send(JSON.stringify(message), (error) => {
        if (error) end("terminal-ingress-closed", error);
      });
    } catch (error) {
      end("terminal-ingress-closed", error);
    }
  };

  async function connect() {
    state = "connecting";
    let address;
    try {
      address = await readAddress();
    } catch (error) {
      end("terminal-ingress-unreadable", error);
      return;
    }
    if (address == null) {
      end("terminal-ingress-absent", new Error("no daemon on this node has published a terminal ingress"));
      return;
    }
    if (!Number.isInteger(address?.port) || typeof address?.token !== "string") {
      end("terminal-ingress-unreadable", new Error("the published terminal ingress names no port and token"));
      return;
    }
    const ws = new WebSocket(`ws://${TERMINAL_INGRESS_HOST}:${address.port}/`, { headers: { [TERMINAL_INGRESS_TOKEN_HEADER]: address.token } });
    socket = ws;
    const timer = setTimeout(() => end("terminal-ingress-timeout", new Error("terminal ingress: no admission in time")), timeoutMs);
    timer.unref?.();
    ws.on("unexpected-response", (_request, response) => {
      clearTimeout(timer);
      end("terminal-ingress-refused", new Error(`terminal ingress refused the connection (${response?.statusCode ?? "?"})`));
    });
    ws.on("error", (error) => {
      clearTimeout(timer);
      end(state === "open" ? "terminal-ingress-closed" : "terminal-ingress-refused", error);
    });
    ws.on("close", () => {
      clearTimeout(timer);
      end("terminal-ingress-closed", new Error("terminal ingress closed the connection"));
    });
    ws.on("message", (data) => {
      let parsed = null;
      try {
        parsed = JSON.parse(String(data));
      } catch {
        return;
      }
      if (parsed?.type !== "admitted" || state !== "connecting") return;
      clearTimeout(timer);
      state = "open";
      const queued = pending;
      pending = [];
      for (const message of queued) write(message);
      settleAdmitted(true);
    });
  }

  const send = (message) => {
    if (state === "dead") return;
    if (state === "open") {
      write(message);
      return;
    }
    if (pending.length < TERMINAL_INGRESS_PENDING_LIMIT) pending.push(message);
    if (state === "idle") connect().catch((error) => end("terminal-ingress-unreadable", error));
  };

  return {
    frame(sessionId, bytes) {
      if (typeof sessionId !== "string" || sessionId.length === 0) return;
      send({ type: "frame", sessionId, bytes: String(bytes) });
    },
    end(sessionId) {
      if (typeof sessionId !== "string" || sessionId.length === 0) return;
      send({ type: "end", sessionId });
    },
    admitted,
    async close() {
      if (state === "connecting") await admitted;
      if (state !== "open") return;
      state = "dead";
      settleAdmitted(false);
      await new Promise((resolve) => {
        const timer = setTimeout(() => {
          try {
            socket.terminate();
          } catch (terminateError) {
            reportDegrade("mesh-terminal-ingress", terminateError);
          }
          resolve();
        }, timeoutMs);
        timer.unref?.();
        socket.once("close", () => {
          clearTimeout(timer);
          resolve();
        });
        try {
          socket.close();
        } catch {
          clearTimeout(timer);
          resolve();
        }
      });
    },
  };
}

return { TERMINAL_FRAME_KIND, TERMINAL_INPUT_KIND, TERMINAL_RESUME_KIND, TERMINAL_INGRESS_TOKEN_HEADER, loopbackRelayUrl, buildTerminalFrameEnvelope, buildTerminalEndEnvelope, buildTerminalInputEnvelope, buildTerminalResumeEnvelope, createTerminalRelayPushTransport, routeIngressMessage, startTerminalIngress, openTerminalIngressClient };
}
