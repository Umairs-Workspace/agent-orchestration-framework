
// src/mesh/session-spawn-directive.mjs — the session-spawn directive's kind
// literals and frame builders (milestone 50 / story 01, ADR-002). ONE home for
// the wire kind so both sides of the stream share the contract, never a
// re-spelled literal — the same single-source discipline as TERMINAL_INPUT_KIND
// (mesh-terminal-relay-bridge.mjs) and RECOVERY_PUSH_KIND (mesh-recovery-push.mjs).

export const SESSION_SPAWN_KIND = "session-spawn";
export const SESSION_SPAWN_ACK_KIND = "session-spawn-ack";

// SESSION_LAUNCHES — 191/ADR-002 §1, the CLOSED set of programs a launched session may be started
// as. `launch` NAMES one of these; it is never text the node runs. The handler builds the one
// command line it types from this name, a UUID and a name in a closed character class
// (`launchCommandLine`, session-spawn-handler.mjs), so nothing a frame carries ever reaches a PTY.
// Widening this set is an ADR, never an edit: FF-19102 pins it to exactly this one value.
export const SESSION_LAUNCHES = Object.freeze(["claude-remote-control"]);

// knownSessionLaunch(value) → the value when it is a member of SESSION_LAUNCHES, else null. Exact
// match: no trimming, no case folding — a value that is not byte-for-byte a member is dropped. The
// ONE membership test: the builders below and the worker's handler (which receives the RAW wire
// frame) all ask it.
export function knownSessionLaunch(value) {
  return typeof value === "string" && SESSION_LAUNCHES.includes(value) ? value : null;
}

// `launch` is ADDITIVE and present only when it is known: absent (or dropped) means a bare shell,
// exactly the pre-191 frame, so a frame without it is byte-identical to the one 50/ADR-002 froze.
export function buildSessionSpawnFrame(to, { sessionId, workspaceId, assistant, itemRef = null, launch, at } = {}) {
  const frame = {
    kind: SESSION_SPAWN_KIND,
    to,
    sessionId,
    workspaceId,
    assistant: typeof assistant === "string" && assistant.length > 0 ? assistant : "claude",
    itemRef: typeof itemRef === "string" && itemRef.length > 0 ? itemRef : null,
    at,
  };
  const known = knownSessionLaunch(launch);
  if (known != null) frame.launch = known;
  return frame;
}

export function buildSessionSpawnAckFrame({ sessionId, nodeId, ok, code } = {}) {
  const frame = { kind: SESSION_SPAWN_ACK_KIND, sessionId, nodeId, ok: !!ok };
  if (!ok && typeof code === "string" && code.length > 0) frame.code = code;
  return frame;
}

// buildSessionSpawnEnvelope(nodeId, frame) — the CONTROL-SIDE relay envelope that
// carries the frame above ACROSS PROCESSES (milestone 50 / story 02, ADR-006).
//
// WHY IT EXISTS AT ALL. `aof mesh ui` (the fleet face, the only production
// `serveMeshUi` call) and `aof mesh serve` (the only owner of
// `startControlStreamServer` and its post-admission `directiveTargets` registry) are
// SEPARATE OS PROCESSES — siblings under the desktop supervisor, not parent/child. So
// the fleet route cannot call `sendDirective`: there is no such handle in its process,
// and a callback injected only by a test would make the route green while the shipped
// daemon could never dispatch. ADR-006's answer is the EXISTING loopback relay bridge,
// which already carries two down-lanes out of exactly this process (`terminal-input`,
// pushed by the mesh-ui process; `terminal-resume`, pushed by a control-side CLI) into
// one router (mesh-terminal-input.mjs) that dispatches via
// `streamServer.dispatchDirective`. This envelope is the third rider on that bridge.
//
// THE FROZEN ENVELOPE STAYS EXACTLY { kind, nodeId, signal } — the relay's own
// `parseEnvelope` reads ONLY `{ kind, nodeId }` and never parses `signal`
// (mesh-relay.mjs; ADR-014 invariant 2), so every frame field rides INSIDE `signal`
// and NEVER as a fourth top-level key. `nodeId` is the TARGET worker, exactly as the
// input/resume envelopes use it.
//
// ONE LITERAL, ONE HOME. The envelope `kind` IS the down-frame `kind`
// (SESSION_SPAWN_KIND above) — the relay is content-blind and forwards an unknown kind
// byte-for-byte (the m26 leasing property), so there is no second constant to drift
// (ADR-006 decision 2). It takes the BUILT frame as its field bag, so the defaults
// (`assistant`, `itemRef`) are applied once, by `buildSessionSpawnFrame`, and the
// router rebuilds a byte-identical down-frame from `signal` on the far side.
//
// A pure projection of its inputs — no fs, no clock, no network.
export function buildSessionSpawnEnvelope(nodeId, { sessionId, workspaceId, assistant, itemRef, launch, at } = {}) {
  const signal = {
    sessionId: sessionId ?? null,
    workspaceId: workspaceId ?? null,
    assistant: assistant ?? null,
    itemRef: itemRef ?? null,
    at: at ?? null,
  };
  // 191/ADR-002 §1 — the launch rides inside `signal` only when it is a known one, so the
  // envelope can never carry a value the router's rebuild would then have to drop.
  const known = knownSessionLaunch(launch);
  if (known != null) signal.launch = known;
  return { kind: SESSION_SPAWN_KIND, nodeId, signal };
}

// buildSessionSpawnAckEnvelope(nodeId, frame) — the RETURN direction's relay envelope
// (milestone 50 / story 04, ADR-008 decision 2), the exact mirror of the sibling above
// and living in the SAME home for the same reason: one wire shape, one literal, no
// second constant to drift.
//
// WHO CALLS IT, AND WITH WHOSE nodeId. The control's stream server branches a worker's
// `session-spawn-ack` frame BEFORE any store apply and hands it to the launcher's
// `onSessionSpawnAck` sink; that sink builds this envelope and pushes it into the
// loopback broker, where the mesh-ui process's ONE relay subscriber fans it to the spawn
// outcome registry. `nodeId` is therefore the CONNECTION-BOUND identity resolved at
// admission (finding F17's re-stamp, identical to the terminal byte lane's) — the
// worker's self-declared `frame.nodeId` is DISCARDED here by construction, because this
// builder never reads it. Without that, an admitted worker could send
// `{ kind:"session-spawn-ack", nodeId:"<victim>", ok:false }` up its OWN socket and
// refuse another node's pending spawn.
//
// THE SECOND CALLER IS THE CONTROL ITSELF (ADR-008 decision 3): a session-spawn envelope
// the terminal-input router could not route synthesises `session-target-not-connected`
// on this SAME kind, through this SAME builder, into this SAME registry — so the browser
// needs exactly ONE reader for both. The two producers stay distinguishable by CODE
// (no worker can mint that one), never by a `source` field the registry would have to
// trust.
//
// THE FROZEN ENVELOPE IS `{ kind, nodeId, signal }` and nothing else — the relay parses
// only `{ kind, nodeId }` (ADR-014 invariant 2), so `sessionId`, `ok` and `code` all
// ride INSIDE `signal` and never as a fourth top-level key.
//
// A pure projection of its inputs — no fs, no clock, no network.
export function buildSessionSpawnAckEnvelope(nodeId, { sessionId, ok, code } = {}) {
  return {
    kind: SESSION_SPAWN_ACK_KIND,
    nodeId,
    signal: {
      sessionId: sessionId ?? null,
      // STRICT, and `code` is `null` rather than absent: a reader must be able to tell
      // "this build states no code" from "this outcome has none", which is the same
      // reason the frame builder above makes `ok` a real boolean.
      ok: ok === true,
      code: typeof code === "string" && code.length > 0 ? code : null,
    },
  };
}

// ─────────────────────────────────── 191/ADR-004 — ending a launched session ────
//
// `session-end` is the lane's SECOND down-frame: it asks the node holding a launched session to
// halt it. It lives here, beside the spawn kind, for the same reason that kind does — one home for
// the literal, so the verb that pushes the envelope, the router that unwraps it and the worker
// client that reads the frame share one contract.
//
// THERE IS NO `session-end-ack` (ADR-004 §4). The end is confirmed by the session's record
// leaving the node's own presence, which the node writes and the control only reads.
export const SESSION_END_KIND = "session-end";

// buildSessionEndFrame(to, { sessionId, at }) → the DOWN-frame. It names the session and nothing
// else: the node is the authority on whether it launched that id (`handler.end`), so the frame
// carries no workspace, no assistant and nothing a node could be talked into acting on.
export function buildSessionEndFrame(to, { sessionId, at } = {}) {
  return { kind: SESSION_END_KIND, to, sessionId, at };
}

// buildSessionEndEnvelope(nodeId, { sessionId, at }) — the control-side relay envelope that carries
// the frame above across processes, the exact sibling of `buildSessionSpawnEnvelope`: the frozen
// `{ kind, nodeId, signal }` shape, the envelope kind IS the frame kind, and every frame field
// rides inside `signal`. It takes the BUILT frame as its field bag.
//
// A pure projection of its inputs — no fs, no clock, no network.
export function buildSessionEndEnvelope(nodeId, { sessionId, at } = {}) {
  return { kind: SESSION_END_KIND, nodeId, signal: { sessionId: sessionId ?? null, at: at ?? null } };
}
