// The ONE terminal control's SESSION SOURCE TABLE (milestone 46 / story 03 / task 00 —
// ADR-002, which freezes what spike 44 handed down). A framework-free ESM module — no
// React, no DOM, no socket, no clock — so `node:test` drives it headlessly and the `.tsx`
// stays a thin consumer (ADR-001: ALL logic in `.mjs`, and that split is an INVARIANT).
//
// WHAT THIS ANSWERS: what IS a terminal session source? Exactly two things, and each one
// declares — as VALUES, never as a branch — the route it dials, the params that address it,
// whose origin it belongs to, whether its lane can carry a resize control frame, whether
// its lane can carry input at all, and its fixed geometry if it has one.
//
// WHY A TABLE AND NOT A BOOLEAN. Today the same six facts are spelled as
// `session?.kind === "remote"` plus three `if`s in one component, so a third source would
// need a fourth edit in each. Here a third source is a ROW — the reversibility spike 44's
// timebox explicitly asked to preserve.
//
// A RELAYED `local-pty` IS NOT A ROW AND MUST NOT BE BUILT. Spike 44 sub-question 2
// measured both directions: input cannot arrive (`{ sent: false, code:
// "assignment-target-not-connected" }` — a control node holds no stream connection to
// itself) and output is never produced (a board PTY's `onData` goes straight to its own
// socket). ADR-002: a story proposing it is refused at review; overturning it needs a
// superseding ADR *and* a change to the mesh admission model, in that order. This module's
// shape enforces it structurally — it hands out WHOLE rows and offers no way to assemble a
// descriptor out of one row's route and another's origin.
//
// `canInput` IS A CAPABILITY, NEVER A PERMISSION. It says whether bytes can travel up this
// lane at all. Whether they DO is the MOUNT's posture, and that lives in input-policy.mjs.
// Reading `canInput` as a permission is exactly how the fleet peek would quietly become
// typeable (ADR-002 says so in terms).

// The two origin roles a source can declare. `self` is the origin the surface was served
// from; `fleet` is the fleet face's origin, which the board is HANDED as a served fact
// (ADR-004) rather than guessing from a constant.
export const ORIGIN_ROLE_SELF = "self";
export const ORIGIN_ROLE_FLEET = "fleet";

// The frozen m03/ADR-003 client→server control-frame word. The lane either carries THIS
// frame or carries none, and "none" is what makes a source a `scale` source (ADR-003).
export const RESIZE_CONTROL_FRAME = "resize";

// The worker spawns its interactive `claude` PTY at EXACTLY this geometry
// (src/mesh/worker-execution.mjs's `ptySpawn(..., { cols: 80, rows: 24 })`), and its TUI
// paints every line for THAT screen with absolute cursor addressing. These two numbers are
// a PAIR with that file. The UI build and the node `src/` build are separate worlds that
// cannot import across, so the tie is held by a fitness function that reads BOTH files —
// test/arch/session/acd-terminal-mirror-geometry-pinned.test.mjs. (The predecessor comment on
// ui/src/fleet/terminal-view/geometry.mjs named a test file that had never existed, which
// is worse than untested because it stopped anyone looking. This one exists.)
export const WORKER_TERMINAL_COLS = 80;
export const WORKER_TERMINAL_ROWS = 24;

// The kinds, in table order. Frozen: the SIZE of this table is part of ADR-002's contract,
// not an implementation detail — a frozen-by-convention table is one careless `push` from
// three.
export const SESSION_SOURCE_KINDS = Object.freeze(["local-pty", "mirror"]);

function deepFreeze(value) {
  if (value == null || typeof value !== "object") return value;
  for (const key of Object.keys(value)) deepFreeze(value[key]);
  return Object.freeze(value);
}

// ─── ROW 1 — the PTY the board server owns. Bidirectional, resizable, same origin. ───
const LOCAL_PTY = deepFreeze({
  kind: "local-pty",
  path: "/ws/terminal",
  params: ["ref", "provider"],
  originRole: ORIGIN_ROLE_SELF,
  resizeControlFrame: RESIZE_CONTROL_FRAME,
  canInput: true,
  fixedGeometry: null,
});

// ─── ROW 2 — a worker's mirrored, absolutely-addressed TUI. Content-blind, byte-bounded,
// carries no resize frame even in principle, and pinned to the worker's own 80x24. ───
const MIRROR = deepFreeze({
  kind: "mirror",
  path: "/ws/terminal-view",
  params: ["nodeId", "sessionId"],
  originRole: ORIGIN_ROLE_FLEET,
  resizeControlFrame: null,
  // TRUE since m42 — the mirror lane genuinely carries input. The fleet peek is read-only
  // because of its MOUNT, not because of this field.
  canInput: true,
  fixedGeometry: { cols: WORKER_TERMINAL_COLS, rows: WORKER_TERMINAL_ROWS },
});

// THE table. Frozen in FACT (deeply, not by convention), and the SAME object is yielded to
// every consumer, so the board surface and the fleet surface can never read two different
// tables.
export const SESSION_SOURCES = deepFreeze([LOCAL_PTY, MIRROR]);

// The six fields every descriptor declares. Exported so a caller (and a test) can read a
// descriptor generically, without naming a kind and without a branch of its own.
export const SESSION_SOURCE_FIELDS = Object.freeze([
  "path",
  "params",
  "originRole",
  "resizeControlFrame",
  "canInput",
  "fixedGeometry",
]);

// sessionSourceTable() — the one table, by reference. Not a copy: a consumer that got a
// copy could be handed a DIFFERENT copy tomorrow.
export function sessionSourceTable() {
  return SESSION_SOURCES;
}

// sessionSourceFor(kind) — the lookup. A known kind resolves to its whole row; ANYTHING
// else is REFUSED with its cause named, and nothing of either entry leaks into the answer.
//
// Nothing is coerced: no trim, no lower-casing, no "did you mean". A table that trimmed and
// lower-cased is a table where `"MIRROR "` silently dials a real worker's session on the
// wrong route with the wrong geometry — and the failure would not be a crash, which is what
// makes it worth refusing loudly.
// sourceCarriesControlFrames(source) — DERIVED, never a seventh column and never a branch on
// the kind (ADR-003's forbidden spellings apply here too).
//
// WHAT IT ANSWERS, and it is a question the merged control has to ask that neither predecessor
// did: when a STRING arrives on this source's socket, may it be read as the frozen m03/ADR-003
// control envelope (`{type:'exit'}` / `{type:'error'}`), or is it terminal bytes?
//
// A LANE EITHER SPEAKS THE ENVELOPE OR IT DOES NOT, and the two directions travel together:
// `/ws/terminal` carries `{resize}` up and `{exit}`/`{error}` down; `/ws/terminal-view` carries
// opaque bytes up and opaque bytes down, and its end-of-stream is a TRANSPORT CLOSE by explicit
// design — `src/mesh/ui-serve.mjs` says so in terms, because "the browser writes these bytes
// STRAIGHT into xterm, so sniffing control content out of terminal bytes would turn a dumb
// painter into a parser" and because a worker's own PTY output could otherwise FORGE one.
//
// THE LATENT BUG THIS RETIRES, measured at the two predecessors: the board dock parsed EVERY
// string message as a possible control frame regardless of lane, so a worker TUI line beginning
// with `{` that happened to parse as an object was swallowed and never painted — while the same
// bytes in the fleet peek, which parsed nothing, rendered fine. One control has to pick one
// answer; this is the honest one, and it keeps the mirror lane a painter.
export function sourceCarriesControlFrames(source) {
  return source != null && typeof source === "object" && source.resizeControlFrame != null;
}

export function sessionSourceFor(kind) {
  const known = SESSION_SOURCES.find((entry) => entry.kind === kind);
  if (known != null) return Object.freeze({ resolved: true, kind: known.kind, source: known });
  return Object.freeze({
    resolved: false,
    source: null,
    requestedKind: typeof kind === "string" ? kind : null,
    knownKinds: SESSION_SOURCE_KINDS,
    message: `unknown session source ${describeRequested(kind)} — the table knows ${SESSION_SOURCE_KINDS.join(" and ")}`,
  });
}

function describeRequested(kind) {
  if (typeof kind === "string") return JSON.stringify(kind);
  if (kind === undefined) return "(absent)";
  if (kind === null) return "null";
  return `(a ${typeof kind})`;
}
