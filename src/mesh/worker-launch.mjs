// src/mesh/worker-launch.mjs — SEAM 2 of item 83's four (119/04, ADR-007; ADR-005; ADR-002).
//
// THE DIRECTIVE LAUNCH, and the worker's whole half of that seam: the two reads that take `command`
// and `launch` off the directive frame, and the composer that turns the additive `launch` wire field
// into something a driver can run.
//
// WHY IT IS A MODULE NOW. `src/mesh/worker-execution.mjs` was 2,482 lines with 56 dependents against
// 30 imports — a hub with high fan-in AND high fan-out has no side you can change cheaply, and this
// concern is the one 63/03 added most recently (+85 lines, correctly fenced) and touches nothing the
// rest of the handler owns: a declaration read off the workspace root, a scope read off the frame,
// and a refusal or an options bag handed back. It is a SUBTRACTION — the composer moves, it does not
// come to exist twice, and every coded outcome the worker has today is emitted from the same call
// site in the same order, before any worktree or run exists.
//
// THIS MODULE IS A LEAF (ADR-007). It imports the frozen-set reader and the family's own
// `isPlainObject`, and it never reaches back into `worker-execution.mjs` — not directly, and not
// through a third module. The split is only a split if the dependency runs one way.
//
// THIS MODULE SPELLS NO PROGRAM AND NO ARGUMENT (63/ADR-010 §2): the compiled declaration is the
// sole speller and all the worker adds is the SCOPE the control resolved, verbatim, as the trailing
// token. No level exists on this path at all — a mesh assignment is the one signal that carries none
// — so `work:loop`'s own default applies and a change to that default changes this launch with no
// edit here. The sent launch is SPREAD into the request, so every key the control put on it,
// including keys this worker has no opinion about, reaches the driver as it was sent; re-deriving
// instead of forwarding is how a field gets quietly dropped.
//
// The two codes below are the worker's answers to the worker's own question — "can I compose the run
// I was told to make?" — and are deliberately NOT the seam's three admission codes, which answer "is
// this request the launch the declaration names?" and stay private to the seam that owns them. A
// declaration that will not read or compile is a third answer again and keeps the declaring module's
// own code, because an unusable reading is not the same fact as a declaration that admits nothing.
import { compileFrozenSet, readFrozenSet } from "../frozen-set.mjs";
import { isPlainObject } from "./repo-marker.mjs";

export const ASSIGNMENT_LOOP_LAUNCH_UNDECLARED = "assignment-loop-launch-undeclared";
export const ASSIGNMENT_LOOP_LAUNCH_SCOPELESS = "assignment-loop-launch-scopeless";

// milestone 38 / story 05 (ADR-013 invariant 2) — the directive's WHOLE command string, a
// first-class field on the wire frame (buildDirectiveFrame, control-stream-server.mjs), read HERE
// and threaded down to spawnRuntime's `brief.command` — the ONLY place a command is read. A
// directive carrying no command (or a blank one) degrades to null, never a crash: the interactive
// session is still spawned, simply with nothing typed into it.
export function readDirectiveCommand(directive) {
  return typeof directive?.command === "string" && directive.command.length > 0 ? directive.command : null;
}

// 63/03 (ADR-006 §3) — PRESENCE, not truthiness. A directive declaring no launch at all is the
// delivered session path and stays byte-identical, while one declaring a launch that carries nothing
// usable is a DIFFERENT answer with its own coded refusal. Collapsing them would turn "no launch was
// sent" into "an empty one was", which on this path is an unattended run nobody asked for — the
// `?? <empty>` species. Answered as a pair so a caller cannot take the value without the presence.
export function readDirectiveLaunch(directive) {
  const declared = directive != null && typeof directive === "object" && Object.hasOwn(directive, "launch");
  return { declared, launch: declared ? directive.launch : null };
}

/**
 * The one place the additive `launch` wire field becomes something a driver can run.
 *
 * Returns `{ refused: true, code, detail }` — carrying nothing a caller could still spawn — or
 * `{ options: { unattended, declaredLaunch } }`, the two keys the seam admits on.
 */
export async function composeDirectiveLaunchOptions(launch, projectRoot) {
  let declared;
  try {
    declared = compileFrozenSet(await readFrozenSet(projectRoot)).unattendedLaunch;
  } catch (error) {
    return { refused: true, code: error?.code ?? ASSIGNMENT_LOOP_LAUNCH_UNDECLARED, detail: `the frozen-set declaration at ${projectRoot} could not be compiled, so this worker has nothing to hand the launch seam: ${String(error?.message ?? error)}` };
  }
  if (declared == null) {
    return { refused: true, code: ASSIGNMENT_LOOP_LAUNCH_UNDECLARED, detail: `the frozen set this workspace compiles at ${projectRoot} admits no unattended launch, so there is no declared program for this loop directive to be — and never a session in its place.` };
  }
  const scope = isPlainObject(launch) && typeof launch.scope === "string" && launch.scope.length > 0 ? launch.scope : null;
  if (scope == null) {
    return { refused: true, code: ASSIGNMENT_LOOP_LAUNCH_SCOPELESS, detail: `the directive declared a launch naming no scope (${JSON.stringify(launch ?? null)}); this worker never invents one, and never falls back to a session for it.` };
  }
  return { options: { unattended: { ...launch, program: declared.program, args: [...declared.args, scope] }, declaredLaunch: declared } };
}
