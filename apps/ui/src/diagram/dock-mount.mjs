// THE DIAGRAM SURFACE's call-site mount — its ONE posture author (m49/ADR-008's generalised
// rule: a value that decides a permission has exactly one author per surface, and a posture is
// never assembled at a render site; `acd-fleet-terminal-input-constrained` holds every surface
// to it by a table row). Framework-free, so `node:test` reads the decision without React.
//
// WHAT THIS SURFACE'S DOCK IS, AND IS NOT. The editor's Ask architect records a request and
// starts ONE interactive session on this server, typed the `/aof:diagram-review` invocation.
// That is a `local-pty` and nothing else: the surface mirrors no worker session (there is no
// assignment here to mirror), so this table has one kind and no second branch. A session with
// no ref or no command yields the UNBOUND mount — the dock's `idle`, not a guess.
//
// It asks `sessionSourceFor(kind)` for a WHOLE row off the frozen table and completes no
// `provider`: that half of the addressing tuple is the picker's selection, completed at the one
// seam production uses (`withSelectedProvider`), exactly as the board's mount leaves it.
import { sessionSourceFor } from "../terminal/source-table.mjs";
import { POSTURE_INTERACTIVE } from "../terminal/input-policy.mjs";

export const DIAGRAM_DOCK_SOURCE = "local-pty";

function nonEmpty(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export const UNBOUND_DIAGRAM_DOCK_MOUNT = Object.freeze({
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

// diagramDockMount(session) — `session` is `{ ref, command }`: the item the draft belongs to and
// the state-aware invocation the dock types ONCE as ordinary input on the raw path.
export function diagramDockMount(session) {
  const ref = nonEmpty(session?.ref);
  const command = nonEmpty(session?.command);
  if (ref == null || command == null) return UNBOUND_DIAGRAM_DOCK_MOUNT;
  const lookup = sessionSourceFor(DIAGRAM_DOCK_SOURCE);
  if (!lookup.resolved) return UNBOUND_DIAGRAM_DOCK_MOUNT;
  return Object.freeze({
    bound: true,
    // The dock always renders its frame: an operator who asked the architect is owed a pane.
    rendersPanel: true,
    source: lookup.source,
    params: Object.freeze({ ref }),
    // The HOST's declaration: the operator may answer the architect in this pane.
    posture: POSTURE_INTERACTIVE,
    ref,
    // A local PTY is this server's own: it names no far end and carries no session tail.
    farEnd: null,
    detail: null,
    command,
    reason: null,
    // This surface spawned the PTY, so a restart is a real re-spawn and is offered.
    spawnedHere: true,
    unavailable: null,
  });
}
