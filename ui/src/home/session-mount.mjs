// The TERMINALS HOME's half of the one terminal control's call-site contract (milestone 49 /
// story 03 / task 01 — ADR-007's posture, ADR-002's mount shape, ADR-003's feed axis). A
// framework-free ESM module — no React, no DOM, no socket, no global — so what the home hands
// the control is a value `node:test` reads (ADR-001: this repo has NO React test harness, and a
// decision that lives in JSX is a decision no test can reach).
//
// ═══ ONE SHAPE, THREE PRODUCERS ════════════════════════════════════════════════════════════
// `fleetTerminalMount` and `boardDockMount` already froze it, and the fleet's own comment states
// the contract: *"One shape, two producers: that is what makes 'the only thing that differs
// between the two surfaces is what they declare' checkable."* This makes it THREE, in the SAME
// thirteen keys the fleet returns (`noStream` included) — never a fourteenth for a fact this
// surface finds interesting, because the whole value of a frozen shape is that a reader of one
// producer has read all three.
//
// ═══ THE ONE WORD m46 LEFT, CHANGED HERE AND NOWHERE ELSE ══════════════════════════════════
// `ui/src/fleet/terminal-mount.mjs:152-157` says it in terms: *"THE POSTURE IS `read-only` AND
// THERE IS NO PATH TO ANYTHING ELSE IN THIS MILESTONE … Milestone 49 changes THIS ONE WORD, at
// THIS ONE CALL SITE, and the control does not change at all."* THIS is that call site. The
// fleet's literal does not move, the board's does not move, and the control does not change.
//
// ═══ AND IT IS NARROWED BY THE FEED AXIS, WHICH IS WHAT MAKES THE READ-ONLY FALLBACK REAL ═══
// Taken naively, SPEC's read-only fallback is vacuous: `inputEnabled = source.canInput &&
// !mount.readOnly`, and `mirror.canInput` is TRUE, so under the frozen table an interactive
// mount is always typeable and "a session that cannot accept input" would never occur.
//
// Measured, it occurs constantly. ADR-007 traced a keystroke into a free session and found it
// swallowed at ONE OF TWO HOPS with no error anywhere: on a worker,
// `liveSessionInputs.get(sessionId)` returns undefined and the frame is DROPPED (pinned as a
// drop and never a redirect by invariant 4's own gate); on the control node's own sessions,
// `{ sent: false, code: "assignment-target-not-connected" }`. That silence is exactly the
// failure the posture exists to prevent — *an operator believing a keystroke reached a worker* —
// so a pane whose feed axis is not a positively-established `producer-known` is READ-ONLY,
// LABELLED, and carries the cause in words.
//
// FAILING CLOSED IS BOTH DIRECTIONS. Nothing the ROW carries may turn the posture: not a
// `posture:` key, not `readOnly: false`, not a `canInput`, not a dispatch state that looks
// alive. And equally, a positively-established producer is NOT silenced by a decoy — a build
// that hard-coded `read-only` would pass every adversarial row and ship a grid that can never
// type, which is this milestone's headline silently missing.
//
// ═══ WHAT THIS MODULE DELIBERATELY DOES NOT DECIDE ═════════════════════════════════════════
//   · WHETHER A SOCKET OPENS, and which rows are subscribed — the cap arbiter's (ADR-006).
//     This module's contribution to a pane is its POSTURE and its REASON, nothing more.
//   · WHICH ROWS BECOME PANES AT ALL, and what a row that leaves the index mid-view does on
//     screen — story 05. This module answers about ONE row it is handed.
//   · THE FEED AXIS ITSELF. Its three closed values and their derivation are `./feed-axis.mjs`'s
//     (ADR-003); a malformed `workItem` is that module's contract, not this one's.
//   · THE POSTURE'S CONSEQUENCES. `disableStdin`, the keystroke sink, the send path, the cursor
//     and the mandatory `read-only` label are all `input-policy.mjs`'s, which ADR-003 states
//     this milestone does not edit. The home CONSUMES that model; it re-derives none of it.
//
// ═══ AND IT DOES NOT VARY WITH THE HOST ════════════════════════════════════════════════════
// `SET_POSTURE` costs the SESSION (`host-model.mjs`'s catalogue, which names this milestone by
// name). A tile that were read-only inline and interactive expanded would rebuild the xterm and
// reopen the socket, and because the mirror is ephemeral the pane would come back EMPTY. So the
// posture is declared ONCE per row, at mount, and both hosts share it: taking the keyboard IS
// the expand (DG-49-5). This producer accepts a host argument and IGNORES it, deliberately, so
// that rule is a value a test can read rather than a convention at a render site.
import { sessionSourceFor } from "../terminal/source-table.mjs";
import { POSTURE_INTERACTIVE, POSTURE_READ_ONLY } from "../terminal/input-policy.mjs";
import { HELD_AT_CAP } from "./socket-cap.mjs";
import { FEED_AXIS_VALUES, FEED_NO_PRODUCER, FEED_PRODUCER_KNOWN, FEED_ROSTER_GONE, NO_LIVE_OUTPUT_REASON, feedAxisFor } from "./feed-axis.mjs";
// The SURFACE's count rule (GAP-6). One import, one direction: `page-state.mjs` imports nothing
// from this directory, so it stays off `acd-home-pane-truth`'s participant list.
import { countedPhrase } from "./page-state.mjs";

// The home mounts exactly ONE source, and it is a `mirror` — a worker's live PTY on another
// machine. Named as a kind and resolved through the table's own lookup, never assembled: the
// whole row travels or none of it does (ADR-002).
export const HOME_SESSION_SOURCE_KIND = "mirror";

// The reasons a row legitimately renders NO PANEL. Each is a NORMAL outcome and none of them is
// `unavailable` — that word means *the ORIGIN could not be resolved*, which is a different fact
// and is false here (DG-49-10). A row this surface cannot address simply has no terminal.
export const HOME_NO_STREAM = Object.freeze({
  NO_ROW: "no-row",
  NO_NODE: "no-node",
  NO_SESSION: "no-session",
  NO_OWNER: "no-owner",
});

// THE CAUSE, IN WORDS, FOR EACH AXIS VALUE THAT COSTS THE KEYBOARD — and the shared describer
// honours an injected reason on `waiting` alone, so this is the only place the home says why a
// pane is silent. AT MOST ONE reason is ever injected and it has exactly one author.
//
//   `no-producer`  DESIGN K6 verbatim, imported from the axis module rather than re-typed: a
//                  re-typed sentence is a second copy that drifts, and this one is DG-49-2's.
//   `roster-gone`  FLAGGED GAP, and deliberately minimal. DESIGN's copy table (K1-K12) has NO
//                  string for a session that left the roster, so this sentence is a placeholder
//                  with ONE author rather than a copy decision taken at a render site. It says
//                  only what is measured — the mesh no longer lists this tuple — and claims
//                  neither that the session is still live nor that it has ended, because a
//                  stale node's worker can genuinely keep relaying. WHEN DESIGN RULES THE
//                  SENTENCE, IT IS CHANGED HERE, in one place, and nowhere else.
export const ROSTER_GONE_REASON = "no live output — the mesh no longer lists this session";

// EXPORTED so the cause TRAVELS rather than being re-derived: a consumer holding a declaration
// can read back which axis value cost this pane its keyboard, and the sentence has one author.
export const READ_ONLY_CAUSE_REASON = Object.freeze({
  [FEED_NO_PRODUCER]: NO_LIVE_OUTPUT_REASON,
  [FEED_ROSTER_GONE]: ROSTER_GONE_REASON,
});

// THE HELD TILE'S LINE (DESIGN K7/K8, DG-49-4), authored HERE because a pane has ONE injected
// sentence and it has exactly one author. A tile the arbiter did not subscribe is listed, at rest,
// and says which of the two held states it is in:
//
//   a slot is free   `not streaming` — the fact, nothing more; the toggle beside it is the action
//   at the cap       `not streaming — <N> live panes already · hide one to watch this` — the limit
//                    AND the exact recovery, because at the cap there is no control left to press
//
// `<N>` IS RENDERED FROM THE CONFIGURED NUMBER AND NEVER TYPED. Change the cap and the sentence
// changes with it; a hard-coded number passes at 16 and lies at 4 — and the milestone's own mock
// draws `12`, which is a placeholder rather than the cap (mocks/BASELINE.md divergence 1).
//
// …AND SO IS ITS AGREEMENT (designer's GAP-6, ruled 2026-08-13). `1 live panes already` is
// UNREACHABLE at today's `MAX_LIVE_PANES` = 16 and becomes reachable the moment the cap is
// configured to 1 — which is precisely the trap the sentence above already refuses for the
// NUMBER. Refusing it for the number and not for the noun beside it would be the same defect
// half-fixed, which is what GAP-6 measured one region up. No rendered string changes today.
// The rule is the surface's and lives in ./page-state.mjs; it is IMPORTED rather than re-typed
// as a ternary here, because the whole finding is that a rule applied per site gets missed at
// the next site.
export const HELD_LINE = "not streaming";

export function heldPaneLine(hold) {
  if (hold?.cause !== HELD_AT_CAP) return HELD_LINE;
  const cap = Number.isInteger(hold?.cap) ? hold.cap : null;
  // AT THE CAP WITH NO STATED NUMBER the sentence would name a limit nobody stated, so it stays
  // the plain fact rather than inventing one — the arbiter's own rule about causes, applied to
  // the copy that reports one.
  if (cap == null) return HELD_LINE;
  return `${HELD_LINE} — ${countedPhrase(cap, "live pane already", "live panes already")} · hide one to watch this`;
}

function nonEmpty(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

// homePageOrigins(page) — the ORIGINS this surface hands the one control (ADR-004), as a pure
// function of a `{ origin }`-shaped value. The `.mjs` set touches NO browser global — and neither
// does the home's `.tsx`: `acd-home-layout-is-a-filter` sweeps this whole directory, so the page
// is HANDED its origin by `main.tsx`, which already resolves the address at module scope. The
// argument is deliberately not named for the global it usually comes from.
//
// BOTH KEYS ARE THE SAME VALUE AND BOTH ARE SUPPLIED. The terminals home IS the fleet origin — it
// is served by the same face — which is why `unavailable` cannot arise here at all (DG-49-10).
// They are still two keys: `mirror` resolves `originRole: "fleet"`, and a builder that quietly
// fell back to `self` would pass every lane on this page and fail only in a browser somewhere
// else. This mirrors `fleetPageOrigins` deliberately; it does not import it, because a surface may
// not import another surface (ADR-001) and three lines is not a shared layer.
export function homePageOrigins(page) {
  const origin = nonEmpty(page?.origin);
  return Object.freeze({ self: origin, fleet: origin });
}

// THE AXIS IS TAKEN OR DERIVED, AND AN UNREADABLE ONE IS NEITHER.
//
// A caller that has already computed the axis for the whole poll (the ordinary production path,
// because `roster-gone` needs BOTH polls) hands it in; a caller that has only the row lets this
// module derive it. Both must answer identically for the same fact, so the derivation is the
// axis module's own function rather than a second copy of its arithmetic.
//
// AND AN UNRECOGNISED STATED AXIS IS NOT A MISSING ONE. `producer_known`, `PRODUCER-KNOWN`, the
// posture word smuggled into the axis slot, a boolean — each is a caller who thinks they said
// something. Falling back to the row's own derivation would let a malformed axis silently PROMOTE
// a pane to typeable; returning `null` fails closed, and the reason stays null because a cause
// nobody stated may not be reported as one.
function axisFor(row, options) {
  const stated = options?.axis;
  if (stated != null) return FEED_AXIS_VALUES.includes(stated) ? stated : null;
  return feedAxisFor(row, options?.context ?? null);
}

// The mount that renders NOTHING — not an empty frame, not a disabled toggle, and NOT an
// `unavailable` pane (V1 / ADR-014 invariant 4). The thirteen keys are the same thirteen a bound
// mount returns: one shape, whatever the answer.
//
// IT IS BUILT FRESH EVERY CALL rather than returned from a module constant, so no caller can
// ever be handed the same object twice and mistake identity for equality.
function noPanel(noStream) {
  return Object.freeze({
    bound: false,
    rendersPanel: false,
    noStream,
    source: null,
    params: Object.freeze({}),
    // THE DECLARATION FAILS CLOSED EVEN WHERE THERE IS NOTHING TO TYPE INTO. A half-tuple is
    // exactly the shape a later refactor would hand a socket by accident.
    posture: POSTURE_READ_ONLY,
    ref: null,
    farEnd: null,
    detail: null,
    command: null,
    spawnedHere: false,
    reason: null,
    unavailable: null,
  });
}

/**
 * homeSessionMount(row, { axis, context, host }) — the home's mount declaration for ONE row of
 * milestone 48's session index.
 *
 * `row` is a `MeshSession` as the fleet already polls it: `nodeId`, `sessionId`, `workspaceId`,
 * `repo`, `assistant`, `lastPingAt`, `workspaceHasRun`, `workItem`.
 *
 * `host` is ACCEPTED AND IGNORED. See the header: one posture serves both hosts because
 * changing it costs the session.
 */
export function homeSessionMount(row, options = {}) {
  if (row == null || typeof row !== "object" || Array.isArray(row)) return noPanel(HOME_NO_STREAM.NO_ROW);

  // THE FULL TUPLE OR NOTHING (ADR-014 invariant 4, unchanged since m38). Routing is by the
  // whole `(nodeId, sessionId)` pair — never a guessed, defaulted or sibling session, and never
  // a node-only subscription that would bleed another session's bytes into this tile. The
  // NON-EMPTY-STRING test is m48's inherited obligation and is never `!= null` and never
  // truthiness: the index skips anonymous sessions by its own construction, so a half-tuple
  // should be unreachable — and this module still answers honestly for one.
  const nodeId = nonEmpty(row.nodeId);
  const sessionId = nonEmpty(row.sessionId);
  if (nodeId == null) return noPanel(HOME_NO_STREAM.NO_NODE);
  if (sessionId == null) return noPanel(HOME_NO_STREAM.NO_SESSION);

  // V1 — "a terminal with no visible owner is never rendered" — honoured WITHOUT inventing one.
  // An assignment's session is owned by its work item; a free session's owner is its REPO, which
  // is a fact on the wire (and DESIGN §S2 then drops the repo from the status row, because it is
  // already the owner). A row with neither names nobody, and a bare session hash on screen is
  // precisely what V1 exists to keep off it.
  const ref = nonEmpty(row.workItem?.ref) ?? nonEmpty(row.repo);
  if (ref == null) return noPanel(HOME_NO_STREAM.NO_OWNER);

  const lookup = sessionSourceFor(HOME_SESSION_SOURCE_KIND);
  if (!lookup.resolved) return noPanel(HOME_NO_STREAM.NO_ROW);

  const axis = axisFor(row, options);
  const hold = options?.hold ?? null;

  return Object.freeze({
    // ═══ WHETHER ANYTHING BINDS, THE STRUCTURAL HALF OF "NO SOCKET IS OPENED" ═══
    // A `no-producer` row is addressable and nothing will ever feed it: `sendTerminalFrame` has
    // exactly two call sites, both inside a worker's assignment execution, so `workItem == null`
    // means NO call site anywhere in `src/` will feed this tuple. Spending one of a scarce, capped
    // set of live sockets to re-discover a fact already on the payload is waste, and the socket
    // would prove nothing the wire has not said — so NOTHING BINDS (ADR-003's amendment: the pane
    // is `idle`, the ramp's own word for "no source bound", whose `PANE_EMPTY_HOST` treatment is
    // already a box with one centred line and no terminal).
    //
    // THE SOURCE STILL TRAVELS, and that distinction is the whole of it: `bound` says whether a
    // socket opens; `source` says what this pane is ADDRESSED by, which is what NAMES it on
    // screen. A row that dropped its source would render `no session` for a session that
    // demonstrably exists — V1 refusing a pane it should not refuse.
    bound: axis !== FEED_NO_PRODUCER,
    rendersPanel: true,
    noStream: null,
    source: lookup.source,
    params: Object.freeze({ nodeId, sessionId }),
    // ═══ THE ONE WORD, AND THE ONLY PLACE IT IS DECIDED ═══
    posture: axis === FEED_PRODUCER_KNOWN ? POSTURE_INTERACTIVE : POSTURE_READ_ONLY,
    ref,
    farEnd: nodeId,
    // The identity line's TAIL, and the FIRST thing to yield when the header cannot fit (DESIGN
    // §S2's yield order) — dropped WHOLE with its separator, because half an id names nothing.
    detail: `session ${sessionId}`,
    // A mirror is never spawned from here, so there is no command to type — and there is no
    // input path to type it down that this surface owns (invariant 4).
    command: null,
    // The same fact read from the other side: this host did not spawn that PTY and cannot
    // re-spawn it, so RESTART is ABSENT rather than present-and-refusing.
    spawnedHere: false,
    // The cause that made this pane read-only, as a readable sentence — null for a pane that may
    // receive bytes, which keeps the ramp's own word.
    //
    // A HELD TILE'S LINE WINS OUTRIGHT, and that is ADR-003's composition precedence 1 applied to
    // the one field that carries it: a tile the arbiter did not subscribe holds no socket, so
    // there is no transport fact to report and no read-only cause to explain — what it owes the
    // operator is why it is not watching and how to change that.
    reason: hold?.subscribed === false ? heldPaneLine(hold) : READ_ONLY_CAUSE_REASON[axis] ?? null,
    // DG-49-10: a node that is stale, offline or simply not connected to the relay is NOT
    // `unavailable`. That word means the ORIGIN could not be resolved; the home is served from
    // the fleet origin, so `origins.fleet` always resolves and this surface cannot reach the
    // state at all. `unavailable` still has no production producer after m49, and a build that
    // mapped roster staleness onto it would send an operator after a fault that is not there.
    unavailable: null,
  });
}
