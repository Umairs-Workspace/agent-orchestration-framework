// The terminals home's FEED AXIS (milestone 49 / story 02 / task 00 — ARCHITECTURE ADR-003,
// DESIGN DG-49-2 and §The connection ramp is UNCHANGED). A SECOND axis, composed BESIDE m46's
// connection ramp, so that a pane nothing will ever feed can stop claiming forever that bytes
// are plausibly next.
//
// FRAMEWORK-FREE BY CONTRACT (ADR-001): no React, no DOM, no global, no clock, no store, no
// socket. It is imported by no component in this story — the grid lands later — because this
// repo has no React test harness, and a rule that can only be exercised through a component is
// a rule with no test.
//
// ───────────────────────────────────────────────────────────────────────────────────────
// WHY THIS IS AN AXIS AND NOT AN EIGHTH WORD, which is the load-bearing negative.
//
// The ramp's seven words are TRANSPORT facts a browser can OBSERVE. "Nothing will ever feed
// this" is a claim about a PRODUCER on another machine — the exact class of assertion
// `streaming` beat `running` for refusing to make. A second vocabulary is the defect milestone
// 46 spent itself deleting, and it grows one word at a time. So this module DEFINES NO STATE
// WORD: it imports the frozen list and returns members of it.
//
// THE DERIVATION IS ARITHMETIC, NOT A HEURISTIC — AND SINCE m50 IT IS A DISJUNCTION OF TWO
// POSITIVE STATEMENTS (50/ADR-008 decision 8):
//
//     producer-known  ⟺  establishedProducer(workItem)   OR   row.relaying === true
//     no-producer     ⟺  neither                                  (still fails CLOSED)
//
// The FIRST statement is m49's and is unchanged: the session index joins `workItem` onto a
// session on `(target_node_id, session_id)`, so an established `workItem` means an assignment
// execution owns this tuple and one of its two `.sendTerminalFrame(` call sites feeds it.
//
// The SECOND arrived with the session launcher, and it exists because the reverse implication
// stopped holding. `workItem == null ⟹ nothing will ever feed this` was true only while every
// producer in `src/` was assignment-bound; m50's spawn handler is a THIRD producer that is
// deliberately NOT (a launched session has no assignment by construction). So the wire now
// STATES the fact instead: `relaying` is a boolean the WORKER writes onto its own session
// record — "something is bridging this session's PTY output up this worker's stream" — and it
// travels the same four hops every other session fact does.
//
// WHY A STATED FACT AND NOT THE OBVIOUS INFERENCE. Reading "no work item, therefore launched"
// is the same guess `streaming` beat `running` for refusing to make, with the opposite sign,
// and it is WRONG for the population `no-producer` was built for: an operator running `claude`
// by hand on a worker is also a free session, and nothing relays it. That guess would light up
// every one of those panes with a socket that never delivers a byte.
//
// STRICT `=== true`, exactly as `workspaceHasRun` is read: an older node that states nothing —
// or states the STRING `"true"`, or a `1` — has not stated this, and reads `false`.
// `acd-terminal-output-signal-source`'s shrink-only ceiling survives as the TRIPWIRE that
// forces a human to check a new producer STATES itself, which is what it was always really
// doing.
//
// NEVER FROM BYTES, AND THERE IS NO BYTE PARAMETER — optional or otherwise. Client-side
// content-sniffing of terminal output is forbidden and gated: the browser writes these bytes
// STRAIGHT into xterm, so sniffing them would turn a dumb painter into a parser, and a
// worker's own PTY output could FORGE the pane's state by printing it.
//
// AND `roster-gone` HAS NO PRIOR ART ANYWHERE IN THIS PRODUCT. Its input is not a field on a
// row; it is the ABSENCE of a row that was there before, which is why the derivation is handed
// BOTH polls. A stale node's worker can genuinely keep relaying — `buildSessionIndex` drops
// every session from a node whose freshness is not `live`, while the relay subscription is
// per-tuple and the stream is untouched — so this value ANNOTATES the transport word and never
// replaces it. Mapping roster staleness onto `unavailable` is a GAP in terms (DG-49-10): that
// word means the ORIGIN could not be resolved, which is false here and sends the operator
// after a fault that is not there.
// ───────────────────────────────────────────────────────────────────────────────────────
import { TERMINAL_STATES, TERMINAL_STATE_LIST, UNKNOWN_STATE } from "../terminal/state-ramp.mjs";
import { COST_SUBSCRIPTION } from "../terminal/host-model.mjs";
import { HELD_AT_CAP, HELD_HIDDEN, paneKeyOf, paneTuple } from "./socket-cap.mjs";

// THE CLOSED SET. Three values, exposed as a frozen list so a consumer can prove it is closed
// rather than trust a comment.
export const FEED_PRODUCER_KNOWN = "producer-known";
export const FEED_NO_PRODUCER = "no-producer";
export const FEED_ROSTER_GONE = "roster-gone";
export const FEED_AXIS_VALUES = Object.freeze([FEED_PRODUCER_KNOWN, FEED_NO_PRODUCER, FEED_ROSTER_GONE]);

// THE ONE INJECTED SENTENCE, WITH EXACTLY ONE AUTHOR (ADR-003 precedence 4). DESIGN DG-49-2
// fixes the copy; `describeTerminalState` turns an injected reason into the `no live output`
// chip through the seam m46 already built and the fleet already uses. The home is the THIRD
// injector through that same seam and the shared state set does not change.
export const NO_LIVE_OUTPUT_REASON = "no live output — no assignment is relaying this session";

const EMPTY = Object.freeze([]);

function nonBlank(value) {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

// A PRODUCER MUST BE POSITIVELY ESTABLISHED, and anything else fails closed to `no-producer`.
//
// ADR-003 derives `producer-known` from `workItem != null`, which taken literally makes
// `{ ref: "", assignmentId: "" }` a known producer. It is ruled `no-producer` here on ADR-007's
// own direction — anything other than a positively-established `producer-known` is read-only —
// and on a second, concrete reason: a blank `ref` cannot be joined into `items[]`, which is the
// only reason the entry carries the pair at all. A producer that cannot be named is not
// positively established, and story 49/03 turns `producer-known` into a TYPEABLE pane: a
// malformed row that read `producer-known` would be an operator typing into a session nothing
// will deliver to.
//
// LIFECYCLE IS NOT FOLDED IN. A producer EXISTING is not a promise of bytes, and terminal-ness
// is the assignment chip's reading with an author of its own. A settled assignment still owns
// its tuple, so it is still `producer-known`.
function establishedProducer(workItem) {
  try {
    if (workItem == null || typeof workItem !== "object" || Array.isArray(workItem)) return false;
    return nonBlank(workItem.ref) != null && nonBlank(workItem.assignmentId) != null;
  } catch {
    // A getter that throws when read is a malformed row, not an exception the grid may take:
    // a pane whose axis threw would be a blank tile in a grid of sixteen and the operator
    // would read it as a rendering bug.
    return false;
  }
}

// THE DISJUNCTION (50/ADR-008 decision 8). Two POSITIVE statements, either of which
// establishes a producer; neither is `no-producer`, and that direction still fails CLOSED.
//
// An assignment session keeps its existing statement via `workItem`, so the assignment driver
// needs no edit at all — which is what keeps `src/mesh/worker-execution.mjs` (47 dependents)
// out of this milestone. A launched session gets the new one. A hook-registered free session
// has NEITHER and stays `no-producer`, correctly: nothing is relaying it.
//
// The name of the field is the WIRE's (`relaying`, a transport fact) and the name of the
// answer is the BROWSER's (`producer-known`). This module still DEFINES NO STATE WORD, and no
// vocabulary crosses in either direction.
function workItemAxis(row) {
  try {
    if (row == null || typeof row !== "object" || Array.isArray(row)) return FEED_NO_PRODUCER;
    if (establishedProducer(row.workItem)) return FEED_PRODUCER_KNOWN;
    return row.relaying === true ? FEED_PRODUCER_KNOWN : FEED_NO_PRODUCER;
  } catch {
    // A throwing getter on either input is a malformed row, not an exception the grid may
    // take — the same reason `establishedProducer` carries its own catch.
    return FEED_NO_PRODUCER;
  }
}

function keysOf(rows) {
  const keys = new Set();
  if (!Array.isArray(rows)) return keys;
  for (const row of rows) {
    const key = paneKeyOf(paneTuple(row));
    if (key != null) keys.add(key);
  }
  return keys;
}

/**
 * The axis value for ONE row, read against both polls.
 *
 * `context.previous` absent or unreadable means NOTHING can be `roster-gone` — the cold-start
 * rule, and it decides a real behaviour: treating "absent from the previous poll" as "the
 * previous poll was empty" would mark every pane `roster-gone` on page load, a whole grid
 * claiming the mesh had dropped every session, on the one screen built to stop exactly that
 * lie.
 *
 * There is no third parameter. Bytes cannot reach this function, so no byte can move its
 * answer — the gated invariant, held as a signature rather than as a promise.
 */
export function feedAxisFor(row, context) {
  const latest = Array.isArray(context?.latest) ? context.latest : null;
  const previous = Array.isArray(context?.previous) ? context.previous : EMPTY;
  const tuple = paneTuple(row);
  const key = paneKeyOf(tuple);
  if (key != null && latest != null && previous.length > 0) {
    if (!keysOf(latest).has(key) && keysOf(previous).has(key)) return FEED_ROSTER_GONE;
  }
  return workItemAxis(row);
}

/**
 * The whole-poll answer, and the shape production reads: an ENTRY per addressable row in the
 * latest poll, plus the DEPARTED tuples — those the previous poll listed and this one does not.
 *
 * `departed` carries TUPLES and never rows, deliberately: a previous poll is not a source of
 * panes. A caller may only use it to ANNOTATE a pane it already holds (one whose socket is
 * open), which is precedence 3's whole point. A tuple in NEITHER poll appears in neither list —
 * there is nothing to compose and the axis is asked nothing.
 */
export function feedAxisForPoll(context) {
  const latest = Array.isArray(context?.latest) ? context.latest : EMPTY;
  const previous = Array.isArray(context?.previous) ? context.previous : EMPTY;

  const entries = [];
  const seen = new Set();
  for (const row of latest) {
    const tuple = paneTuple(row);
    const key = paneKeyOf(tuple);
    if (key == null || seen.has(key)) continue;
    seen.add(key);
    entries.push(
      Object.freeze({ nodeId: tuple.nodeId, sessionId: tuple.sessionId, axis: workItemAxis(row), row }),
    );
  }

  const departed = [];
  const departedSeen = new Set();
  for (const row of previous) {
    const tuple = paneTuple(row);
    const key = paneKeyOf(tuple);
    if (key == null || seen.has(key) || departedSeen.has(key)) continue;
    departedSeen.add(key);
    departed.push(Object.freeze({ nodeId: tuple.nodeId, sessionId: tuple.sessionId, axis: FEED_ROSTER_GONE }));
  }

  return Object.freeze({ entries: Object.freeze(entries), departed: Object.freeze(departed) });
}

/**
 * THE COMPOSITION PRECEDENCE, FIXED IN ONE PLACE because one pane has one header and one pane
 * line — and sixteen panes composing their own precedence is sixteen chances to disagree, in
 * JSX no test in this repo can reach.
 *
 *   1. NOT SUBSCRIBED WINS OUTRIGHT. There is no socket, therefore no transport fact to
 *      report, therefore no ramp word to borrow. The pane says WHY it is not watching and
 *      carries the subscription toggle's own declared cost — never a connection word.
 *   2. OTHERWISE THE RAMP'S WORD IS THE PANE'S WORD, with exactly ONE narrowing: on `waiting`
 *      alone, a `no-producer` axis supplies the `reason`. That is not a new mechanism; it is
 *      the seam m46 built and the fleet already uses, and `describeTerminalState` rewrites the
 *      CHIP while leaving the STATE `waiting`.
 *   3. `roster-gone` ANNOTATES, NEVER REPLACES. A stale node's worker can genuinely keep
 *      relaying, so the transport fact stays true and the annotation travels on the SAME
 *      composition as the word — no render site has to join them.
 *
 * A `roster-gone` pane that is also `waiting` injects NO reason: DG-49-2's sentence is keyed
 * explicitly on a free session, ADR-003 says `roster-gone` annotates rather than replaces, and
 * no document fixes a sentence for the pair. Inventing one here would put a copy decision in a
 * logic module. AT MOST ONE reason is ever injected and it has exactly one author.
 */
export function composeHomePane(input) {
  const axis = FEED_AXIS_VALUES.includes(input?.axis) ? input.axis : FEED_NO_PRODUCER;
  const annotation = axis === FEED_ROSTER_GONE ? FEED_ROSTER_GONE : null;
  const cap = Number.isInteger(input?.cap) ? input.cap : null;

  // THE HOLD CAUSE IS ACCEPTED OR IT IS `null`; IT IS NEVER COERCED. The arbiter states two
  // (ADR-006/DG-49-4) and `null` for a row that is not addressable at all. Anything else is a
  // fact nobody stated — and the wrong-but-plausible call is one import away, because
  // `RELEASED_LEFT_INDEX` is an exported constant of the very module this one imports from.
  // Defaulting it to `hidden` would tell the operator they hid a pane they did not hide, on the
  // one screen built so they do not lose track of an agent. `slotFree` already fails closed to
  // `false` and `cap` is honestly `null` when unstated; this is the same rule, applied to the
  // one field that was inventing.
  const cause = input?.cause === HELD_AT_CAP || input?.cause === HELD_HIDDEN ? input.cause : null;

  if (input?.subscribed !== true) {
    return Object.freeze({
      subscribed: false,
      // NOT a ramp word, and not `unknown` either: `terminalSessionIdentity` already returns
      // `null` for an unsubscribed pane, so there is no session here to have a state about.
      word: null,
      reason: null,
      annotation,
      axis,
      notWatching: Object.freeze({
        cause,
        cost: COST_SUBSCRIPTION,
        slotFree: input?.slotFree === true,
        cap,
      }),
    });
  }

  // An unrecognised state word is `unknown` — the ramp's own deliberate NON-member — so the
  // union of every word this composition can return stays a subset of the eight strings m46
  // froze. The home contributes no word of its own.
  const word = TERMINAL_STATE_LIST.includes(input?.state) ? input.state : UNKNOWN_STATE;
  const reason = word === TERMINAL_STATES.WAITING && axis === FEED_NO_PRODUCER ? NO_LIVE_OUTPUT_REASON : null;

  return Object.freeze({
    subscribed: true,
    word,
    reason,
    annotation,
    axis,
    notWatching: null,
  });
}
