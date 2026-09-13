// The FLEET's half of the one terminal control's call-site contract (milestone 46 / story 04 —
// ADR-005's "the fleet's assignment-derived copy stays OUT of the shared set and is INJECTED by
// the fleet call site"). A framework-free ESM module — no React, no DOM, no socket, no WebSocket
// and, load-bearing, NO INPUT PATH OF ANY KIND: this file lives under `ui/src/fleet/`, which
// arch-test invariant 4 sweeps, and it must keep that sweep honest rather than merely quiet.
//
// ═══ WHY THIS FILE EXISTS AT ALL, and why it is FLEET-LOCAL rather than shared ═════════════
// Four behaviours of the deleted `ui/src/fleet/terminal-view/` had no home in the shared core,
// and three of them are FLEET-DOMAIN by inspection — they read `assignment.targetNodeId`,
// `assignment.sessionId` and the m35 assignment chip:
//   · `resolveTerminalStream(assignment)` + `NO_STREAM` — which terminal stream, if any, may
//     THIS assignment's card open;
//   · `terminalAssignmentReason(assignment)` — the V10 copy, *"no live output — assignment
//     failed · reclaimed"*.
// ADR-005 names the tidy-looking alternative and rejects it in terms: moving
// `terminalAssignmentReason` into the shared set "because it is only one import" would make the
// shared control depend on the fleet's assignment vocabulary FOREVER, invisibly, from inside a
// module named for terminals — and the graph measured that import as the ONLY outward edge any
// of the five predecessor helpers had. So the shared describer takes an injected `reason`
// STRING, and this module is what computes it. `acd-terminal-control-boundary` fails the build
// if anyone re-admits the import in the other direction.
//
// The remaining two behaviours were NOT fleet-domain and are NOT re-created here: the multiplex
// key is the core's `terminalPaneKey` (keyed on the SOURCE's declared params, so a third source
// needs no edit), and "a terminal with no visible owner is never rendered" is the core's
// `terminalPaneIdentity` returning `{ rendered: false, reason }`.
//
// ═══ ADR-014 INVARIANT 4, UNCHANGED: THE FULL TUPLE OR NOTHING ═════════════════════════════
// Routing is by the FULL (nodeId, sessionId) tuple. A half-tuple resolves to NO stream — never a
// guessed, defaulted or sibling session, and never a node-only subscription that would bleed
// another session's bytes into this card. "No stream" is a first-class, honest outcome: the card
// simply shows no terminal and opens no socket. It is NOT an `unavailable` pane — that state
// says "there IS a session and we cannot reach WHERE it lives", which is a different fact, and
// the unifying story is exactly where the two would be confused by accident.

import { assignmentChip } from "./assignments.mjs";
import { sessionSourceFor } from "../terminal/source-table.mjs";
import { POSTURE_READ_ONLY } from "../terminal/input-policy.mjs";
import { terminalPaneKey } from "../terminal/pane-identity.mjs";

// The reasons a card legitimately has NO stream to open. Each is a NORMAL state (an assignment
// whose worker has not launched or captured its interactive session yet is the common one),
// never an error.
export const NO_STREAM = Object.freeze({
  NO_ASSIGNMENT: "no-assignment",
  NO_NODE: "no-node",
  NO_SESSION: "no-session",
});

// The fleet card mounts exactly ONE source, and it is a `mirror` — a worker's live PTY on
// another machine. Named as a kind and resolved through the table's own lookup, never
// assembled: the whole row travels or none of it does.
export const FLEET_TERMINAL_SOURCE_KIND = "mirror";

function nonEmpty(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

// fleetPageOrigins(location) — the ORIGINS this page hands the one control (ADR-004), as a pure
// function of the location it is GIVEN. It reads no global: the `.tsx` supplies `window.location`
// and this stays headless, which is the same shape the shell's nav model established and the
// whole reason the URL builder is testable with no browser at all.
//
// BOTH KEYS CARRY THE SAME VALUE HERE, and that coincidence is worth stating rather than
// exploiting: the fleet page IS the fleet origin. `mirror` declares `originRole: fleet`, so it
// resolves against `origins.fleet` ALONE — a builder that quietly fell back to `self` when
// `fleet` was absent would pass on this page and fail on the board, which is the case that
// matters. An absent or malformed location yields two NULLS, never a guess: a pane with no origin
// opens no socket and says why.
export function fleetPageOrigins(location) {
  const origin = nonEmpty(location?.origin);
  return Object.freeze({ self: origin, fleet: origin });
}

// resolveTerminalStream(assignment) — PURE over the row it is handed; never mutates it, never
// reaches for a fallback elsewhere in the payload (no "the node's other assignment", no "the
// only live session"). Returns either:
//   { resolved: false, reason }                — no terminal, no socket
//   { resolved: true, nodeId, sessionId, key } — exactly this stream
//
// The order of the two checks matters only for the REASON reported: a row with no target node is
// a malformed dispatch, whereas a row with no session is the normal not-yet-captured case.
//
// `key` is the CORE's pane key, computed from the `mirror` descriptor's own declared params. Its
// predecessor joined `(nodeId, sessionId)` by hand, which is the same conflation ADR-002 removes
// everywhere else; the V8 property is identical and now belongs to one home.
export function resolveTerminalStream(assignment) {
  if (assignment == null || typeof assignment !== "object") {
    return Object.freeze({ resolved: false, reason: NO_STREAM.NO_ASSIGNMENT });
  }
  const nodeId = nonEmpty(assignment.targetNodeId);
  const sessionId = nonEmpty(assignment.sessionId);
  if (nodeId == null) return Object.freeze({ resolved: false, reason: NO_STREAM.NO_NODE });
  if (sessionId == null) return Object.freeze({ resolved: false, reason: NO_STREAM.NO_SESSION });
  const lookup = sessionSourceFor(FLEET_TERMINAL_SOURCE_KIND);
  return Object.freeze({
    resolved: true,
    reason: null,
    nodeId,
    sessionId,
    key: terminalPaneKey(lookup.source, { nodeId, sessionId }),
  });
}

// terminalAssignmentReason(assignment) — the V10 copy, and TERMINAL-NESS IS NOT A SECOND
// VOCABULARY (DESIGN §Surface 3 V10, corrected 2026-07-23 §Correction 3).
//
// A hand-maintained set of terminal `state` strings drifts the moment a state is added — and it
// did: the original `{done, failed, reclaimed}` set LEAKED `withdrawn` (operator-stop) and
// `stale`, so those two terminal assignments sat on `waiting for output` forever. The m35
// `assignmentChip(row)` ALREADY decides which states are terminal AND owns the words, so both
// terminal-ness and the wording derive from that ONE chip:
//     TERMINAL  iff  chip.label === "done" || chip.label === "failed".
// Everything else — including the forward-compatible `unknown` — is NOT terminal and keeps
// `waiting for output`: we may not assert that output is impossible for a state neither this
// module nor the chip recognises.
//
// It is the LABEL that must tell the truth, never the ROUTING: the resolution above stays
// tuple-only, because a state FILTER would hide a real captured stream (V10 is explicit).
export function terminalAssignmentReason(assignment) {
  const chip = assignmentChip(assignment);
  if (chip.label !== "done" && chip.label !== "failed") return null;
  const note = chip.note ? ` · ${chip.note}` : "";
  return `no live output — assignment ${chip.label}${note}`;
}

// The mount that renders NOTHING. Not an empty frame, not a disabled toggle, and NOT an
// `unavailable` pane — ADR-014 invariant 4 / V1, and the story that unifies the two components
// is exactly where that rule would be relaxed by accident.
function noPanel(reason) {
  return Object.freeze({
    bound: false,
    rendersPanel: false,
    reason: null,
    noStream: reason,
    source: null,
    params: Object.freeze({}),
    posture: POSTURE_READ_ONLY,
    ref: null,
    farEnd: null,
    detail: null,
    command: null,
    spawnedHere: false,
    unavailable: null,
  });
}

// fleetTerminalMount(assignment, { itemRef, assignmentId }) — the fleet's mount declaration, in
// the SAME shape the board's `boardDockMount` returns. One shape, two producers: that is what
// makes "the only thing that differs between the two surfaces is what they declare" checkable.
//
// THE POSTURE IS `read-only` AND THERE IS NO PATH TO ANYTHING ELSE IN THIS MILESTONE. It is a
// literal here, not a parameter, not a prop, not a value read off an assignment or a roster or a
// query string — because arch-test invariant 4 must still HOLD when this milestone accepts, and
// the way to make that structural rather than aspirational is to leave the fleet with nothing to
// flip. Milestone 49 changes THIS ONE WORD, at THIS ONE CALL SITE, and the control does not
// change at all.
export function fleetTerminalMount(assignment, { itemRef, assignmentId } = {}) {
  const stream = resolveTerminalStream(assignment);
  if (!stream.resolved) return noPanel(stream.reason);

  // V1 — "a terminal with no visible owner is never rendered." The ref prefers the human
  // work-item ref and degrades to the assignment id ONLY because the caller passes one; nothing
  // here invents an owner, because an invented owner is precisely the bare session hash V1
  // exists to keep off the screen.
  const ref = nonEmpty(itemRef) ?? nonEmpty(assignmentId) ?? nonEmpty(assignment?.assignmentId);
  if (ref == null) return noPanel(NO_STREAM.NO_ASSIGNMENT);

  const lookup = sessionSourceFor(FLEET_TERMINAL_SOURCE_KIND);
  if (!lookup.resolved) return noPanel(NO_STREAM.NO_ASSIGNMENT);

  return Object.freeze({
    bound: true,
    rendersPanel: true,
    noStream: null,
    source: lookup.source,
    params: Object.freeze({ nodeId: stream.nodeId, sessionId: stream.sessionId }),
    posture: POSTURE_READ_ONLY,
    ref,
    farEnd: stream.nodeId,
    // The identity line TAIL. It is the FIRST thing to yield when the header cannot fit
    // (DESIGN §S2 yield order) — dropped WHOLE, with its separator, because half an id names
    // nothing — and the ref and the node still identify the pane without it.
    detail: `session ${stream.sessionId}`,
    // A mirror is never spawned from here, so there is no command to type — and there is no
    // input path to type it down (invariant 4).
    command: null,
    // NEVER, and it is the same fact as `command: null` read from the other side: the session
    // belongs to a worker on another machine, so this host cannot re-spawn it and RESTART is
    // absent rather than present-and-refusing.
    spawnedHere: false,
    // The injected wording. The shared describer honours it on `waiting` ONLY: a pane that
    // actually received bytes keeps its own, stronger, observed fact whatever an assignment says.
    reason: terminalAssignmentReason(assignment),
    // DG-46-3: no production producer in m46. A card whose tuple does not resolve renders NO
    // PANEL AT ALL rather than an unavailable one, and a card whose tuple DOES resolve is on the
    // fleet page, which IS the fleet origin — so this surface cannot reach the state at all.
    unavailable: null,
  });
}
