// The BOARD's half of the one terminal control's call-site contract (milestone 46 / story 04 —
// ADR-002's "the descriptor is the control's ONLY input"). A framework-free ESM module — no
// React, no DOM, no socket — so what the board hands the control is a value `node:test` can read
// (ADR-001: this repo has NO React test harness, so a decision that lives in JSX is a decision
// no test can reach).
//
// WHAT THIS ANSWERS: the board holds its own dock session — a ref plus either a command it is
// about to spawn or a worker tuple it is about to mirror. WHICH SOURCE is that, at WHICH
// posture, addressed by WHICH params?
//
// TWO THINGS IT DELIBERATELY DOES NOT DO, and both are the milestone's subject matter:
//   · IT DOES NOT BUILD A DESCRIPTOR. It asks `sessionSourceFor(kind)` for a WHOLE row off the
//     frozen table. A hand-built `{ ...LOCAL_PTY, originRole: "fleet" }` produces a perfectly
//     plausible fleet URL for a board PTY — the core's duck-typing is deliberate and
//     load-bearing (a third source must be a table row, not a new word in the builder), so the
//     ratchet against assembling one belongs HERE, at the call site, and
//     `acd-terminal-control-boundary` fails CI on it.
//   · IT DOES NOT DECIDE GEOMETRY, INPUT, CHROME OR A URL. Those are all derivations OF the
//     descriptor, and they live in the shared core. The board's job is to say which session.
//
// THE BOARD MOUNTS BOTH SOURCES INTERACTIVELY, INCLUDING `mirror`. That is m42's deliberate
// operator override — a keystroke rides the tuple-bound terminal-view socket to the worker's
// live PTY — and it is exactly why posture cannot be a property of the source: the SAME `mirror`
// is read-only on a fleet card (ADR-002; invariant 4, which survives this milestone).

import { sessionSourceFor } from "../terminal/source-table.mjs";
import { POSTURE_INTERACTIVE } from "../terminal/input-policy.mjs";

// The board's own two session kinds ARE the source kinds — the conflated `local`/`remote`
// vocabulary is retired with the dock. `remote` named a TRANSPORT while every behaviour it
// gated is a property of the FAR END, which is the conflation ADR-003 exists to remove.
export const DOCK_SOURCE_LOCAL_PTY = "local-pty";
export const DOCK_SOURCE_MIRROR = "mirror";

function nonEmpty(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

// The EMPTY mount: the dock is open and nothing is bound. It is `idle` — not an error, not a
// loading state, and NOT `unavailable` (nothing is wrong; nothing has been asked for yet). The
// posture is still the board's own `interactive`, because posture is the HOST's declaration and
// the host does not stop being interactive when it has nothing to show.
const UNBOUND = Object.freeze({
  bound: false,
  rendersPanel: true,
  source: null,
  params: Object.freeze({}),
  posture: POSTURE_INTERACTIVE,
  ref: null,
  farEnd: null,
  detail: null,
  command: null,
  reason: null,
  spawnedHere: false,
  unavailable: null,
});

// boardDockMount(session) — the board's mount declaration.
//
// `session` is the board's own dock session: `{ kind, ref }` plus `command` for a `local-pty` or
// `{ nodeId, sessionId }` for a `mirror`.
//
// IT TAKES NO `provider`, DELIBERATELY. The `provider` half of a `local-pty`'s addressing tuple is
// the PICKER's selection — chrome state the control holds — so the board cannot supply it and this
// module must not invent it. The tuple is completed at exactly one seam, `withSelectedProvider`
// (provider-picker.mjs), which is the seam production uses. This function used to accept an
// optional `{ provider }` that NO production caller passed while the component patched the param
// inline: two spellings of one rule, one of them tested and the other one shipped.
//
// A session naming a kind the table does not know yields the UNBOUND mount rather than a guess:
// the table refuses unknown kinds by name, and a call site that "helpfully" fell back to
// `local-pty` would spawn a PTY for a session the operator asked to mirror.
export function boardDockMount(session) {
  const kind = nonEmpty(session?.kind);
  if (kind == null) return UNBOUND;
  const lookup = sessionSourceFor(kind);
  if (!lookup.resolved) return UNBOUND;
  const source = lookup.source;
  const ref = nonEmpty(session?.ref);

  const params = {};
  if (kind === DOCK_SOURCE_LOCAL_PTY) {
    if (ref != null) params.ref = ref;
  } else {
    const nodeId = nonEmpty(session?.nodeId);
    const sessionId = nonEmpty(session?.sessionId);
    if (nodeId != null) params.nodeId = nodeId;
    if (sessionId != null) params.sessionId = sessionId;
  }

  return Object.freeze({
    bound: true,
    // The dock ALWAYS renders its frame — an operator who pressed Run agent is owed a pane even
    // before the ref resolves, and the empty line is what it says. (The fleet card is the host
    // where "nothing to show" means NO PANEL AT ALL; that rule is the fleet's, not the dock's.)
    rendersPanel: true,
    source,
    params: Object.freeze(params),
    posture: POSTURE_INTERACTIVE,
    ref,
    // The identity line names the far end only when the far end is somewhere else. A local PTY
    // is this server's own, so it names nobody and reads `46/04` rather than `46/04 → …`.
    farEnd: kind === DOCK_SOURCE_MIRROR ? nonEmpty(session?.nodeId) : null,
    // The identity line's TAIL. A mirror is addressed by a session the operator did not start, so
    // naming it is how two open panes on one node stay distinguishable; a local PTY's `ref` IS its
    // name and a tail would repeat it.
    detail: kind === DOCK_SOURCE_MIRROR && nonEmpty(session?.sessionId) != null ? `session ${session.sessionId}` : null,
    // The state-aware command the dock types ONCE per session, as ordinary input on the raw
    // path (never a JSON frame — the m03/ADR-003 envelope is unchanged).
    command: kind === DOCK_SOURCE_LOCAL_PTY ? nonEmpty(session?.command) : null,
    // The board computes no assignment-derived wording: it has no assignments. `waiting for
    // output` is the honest word here and nothing overrides it.
    reason: null,
    // THE BOARD OWNS THE SPAWN OF ITS OWN PTY AND NOTHING ELSE. A `mirror` is a worker's live
    // session on another machine: this host can watch it and (since m42) type into it, but it
    // cannot re-spawn it — so RESTART is not offered there rather than offered-and-refusing.
    // (Set this `true` for a mirror and the dock offers "Restart session" on a dead worker
    // session; pressing it would bump the run token and merely re-dial the same tuple-bound
    // socket — a button promising a re-spawn it cannot perform.)
    spawnedHere: kind === DOCK_SOURCE_LOCAL_PTY,
    // DG-46-3: no production producer in m46. The board dock is always same-origin with its own
    // PTY, so nothing here forces the state; milestone 49 is its producer.
    unavailable: null,
  });
}

export const UNBOUND_DOCK_MOUNT = UNBOUND;
