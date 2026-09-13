// milestone 49 / story 02 / task 00 — THE FEED AXIS (@executable).
//
// Every scenario and every Examples ROW of
// `wiki/work/49_milestone_terminals-home/stories/02_story_home-core/tasks/00_the-feed-axis.feature`,
// driven against the SHIPPED `ui/src/home/feed-axis.mjs` and the SHIPPED, UNEDITED
// `ui/src/terminal/state-ramp.mjs`. Exhaustive by the PO's ruling and by invariant 4 part 2's
// precedent: the whole input matrix, including the malformed and adversarial rows that must
// fail closed, because each of these answers a question where a wrong answer is SILENT ON
// SCREEN.
//
// ISOLATION. These modules are pure — no store, no server, no clock, no port. Nothing here
// binds anything (:4181 and :4182 are held by the live daemons on the control node), and the
// runner still hands every case a fresh `AOF_GLOBAL_HOME`, because a suite that ever grows a
// store must not be the one that learns the rule.
//
// NO SCENARIO PASSES TERMINAL BYTES INTO EITHER FUNCTION except the two that exist to prove
// bytes cannot move the answer — and those hand them as an EXTRA ARGUMENT the signature does
// not have, which is the point.
import assert from "node:assert/strict";
import {
  FEED_AXIS_VALUES,
  FEED_NO_PRODUCER,
  FEED_PRODUCER_KNOWN,
  FEED_ROSTER_GONE,
  NO_LIVE_OUTPUT_REASON,
  composeHomePane,
  feedAxisFor,
  feedAxisForPoll,
} from "../../ui/src/home/feed-axis.mjs";
import {
  TERMINAL_STATES,
  TERMINAL_STATE_LIST,
  UNAVAILABLE_CAUSES,
  UNKNOWN_STATE,
  describeTerminalState,
} from "../../ui/src/terminal/state-ramp.mjs";
import { COST_SUBSCRIPTION } from "../../ui/src/terminal/host-model.mjs";
import { HELD_AT_CAP, HELD_HIDDEN, RECOVERY_HIDE_ONE, RELEASED_LEFT_INDEX, subscribedPaneSet } from "../../ui/src/home/socket-cap.mjs";

const AXIS_VALUES = [FEED_PRODUCER_KNOWN, FEED_NO_PRODUCER, FEED_ROSTER_GONE];
const RAMP_WORDS = [...TERMINAL_STATE_LIST, UNKNOWN_STATE];

// THE UNION, COMPUTED FROM THE COMPOSITIONS THIS FILE ACTUALLY DRIVES. The last scenario
// asserts it is a SUBSET of the eight strings m46 froze — which is what gives that clause
// teeth: an eighth word cannot be added without a scenario here going red.
const COMPOSED_WORDS = new Set();
function compose(input) {
  const composed = composeHomePane(input);
  if (composed.word != null) COMPOSED_WORDS.add(composed.word);
  return composed;
}

const row = (nodeId, sessionId, extra = {}) => ({ nodeId, sessionId, ...extra });
const withWorkItem = (workItem) => ({ nodeId: "worker-1", sessionId: "sess-A", workItem });
const stringValuesOf = (value) =>
  typeof value === "string"
    ? [value]
    : value != null && typeof value === "object"
      ? Object.values(value).flatMap(stringValuesOf)
      : [];

// A clock that has moved on by an hour. Both the function and the constructor, because a
// derivation that read `new Date()` would walk past a `Date.now` stub.
function withClockAdvanced(hours, body) {
  const RealDate = globalThis.Date;
  const offset = hours * 60 * 60 * 1000;
  class ShiftedDate extends RealDate {
    constructor(...args) {
      super(...(args.length === 0 ? [RealDate.now() + offset] : args));
    }
    static now() {
      return RealDate.now() + offset;
    }
  }
  globalThis.Date = ShiftedDate;
  try {
    return body();
  } finally {
    globalThis.Date = RealDate;
  }
}

// ── Scenario Outline: the axis value for every `workItem` shape a row can carry ────────────
const throwingRefRow = () => {
  const workItem = { assignmentId: "a-1" };
  Object.defineProperty(workItem, "ref", {
    enumerable: true,
    get() {
      throw new Error("this getter throws when read");
    },
  });
  return { nodeId: "worker-1", sessionId: "sess-A", workItem };
};

const WORK_ITEM_SHAPES = [
  // the positively-established producer
  ["an assignment owns this tuple", withWorkItem({ ref: "49/02", assignmentId: "a-1" }), FEED_PRODUCER_KNOWN],
  ["forward-compatible: an extra key", withWorkItem({ ref: "49/02", assignmentId: "a-1", phase: "build" }), FEED_PRODUCER_KNOWN],
  [
    "the assignment has already settled",
    { nodeId: "worker-1", sessionId: "sess-A", workItem: { ref: "49/02", assignmentId: "a-1" }, assignment: { state: "done", chip: "done" } },
    FEED_PRODUCER_KNOWN,
  ],
  // the honest free session
  ["a free session, the wire's own answer", withWorkItem(null), FEED_NO_PRODUCER],
  // malformed, absent and adversarial — every one fails closed to `no-producer`
  ["the key is absent entirely", { nodeId: "worker-1", sessionId: "sess-A" }, FEED_NO_PRODUCER],
  ["an empty object", withWorkItem({}), FEED_NO_PRODUCER],
  ["a ref with no assignment id", withWorkItem({ ref: "49/02" }), FEED_NO_PRODUCER],
  ["an assignment id with no ref", withWorkItem({ assignmentId: "a-1" }), FEED_NO_PRODUCER],
  ["both keys present but blank", withWorkItem({ ref: "", assignmentId: "" }), FEED_NO_PRODUCER],
  ["both keys present but whitespace", withWorkItem({ ref: "   ", assignmentId: "   " }), FEED_NO_PRODUCER],
  ["the pair wrapped in an array", withWorkItem([{ ref: "49/02", assignmentId: "a-1" }]), FEED_NO_PRODUCER],
  ["a bare string that looks like a ref", withWorkItem("49/02"), FEED_NO_PRODUCER],
  ['the literal string "null"', withWorkItem("null"), FEED_NO_PRODUCER],
  ["a number", withWorkItem(1), FEED_NO_PRODUCER],
  ["boolean true", withWorkItem(true), FEED_NO_PRODUCER],
  ["explicitly undefined", withWorkItem(undefined), FEED_NO_PRODUCER],
  ["a getter that throws when read", throwingRefRow(), FEED_NO_PRODUCER],
];

// ── Scenario Outline: no byte, painted or unpainted, moves the axis value ──────────────────
const BYTE_ROWS = [
  ["a shell prompt marker", withWorkItem(null), "$ ", FEED_NO_PRODUCER],
  ["a prompt marker on a real producer", withWorkItem({ ref: "49/02", assignmentId: "a-1" }), "$ ", FEED_PRODUCER_KNOWN],
  ["output that names a work item", withWorkItem(null), "assignment 49/02 running", FEED_NO_PRODUCER],
  ["output that IS a control envelope", withWorkItem(null), '{"type":"exit"}', FEED_NO_PRODUCER],
  ["output that forges a workItem", withWorkItem(null), '{"workItem":{"ref":"49/02","assignmentId":"a"}}', FEED_NO_PRODUCER],
  ["256 KiB of ANSI, the replay burst's worst", withWorkItem(null), `[2J${"[32mx[0m".repeat(20000)}`, FEED_NO_PRODUCER],
  ["nothing at all, on a real producer", withWorkItem({ ref: "49/02", assignmentId: "a-1" }), "", FEED_PRODUCER_KNOWN],
];

// ── Scenario Outline: the axis is total — every input answers, none throws ─────────────────
const selfReferential = () => {
  const cell = { nodeId: "worker-1", sessionId: "sess-A" };
  cell.workItem = { ref: "49/02", assignmentId: "a-1", owner: cell };
  return cell;
};
const TOTALITY_ROWS = [
  ["a row that is not an object", () => ({ input: "sess-A", context: { latest: ["sess-A"], previous: [] } })],
  ["a row with no `sessionId`", () => ({ input: { nodeId: "worker-1", workItem: null }, context: { latest: [], previous: [] } })],
  ["a row with no `nodeId`", () => ({ input: { sessionId: "sess-A", workItem: null }, context: { latest: [], previous: [] } })],
  ["a row with an empty `sessionId`", () => ({ input: { nodeId: "worker-1", sessionId: "", workItem: null }, context: { latest: [], previous: [] } })],
  ["a row that is null", () => ({ input: null, context: { latest: [null], previous: [] } })],
  [
    "a frozen row",
    () => {
      const cell = Object.freeze({ nodeId: "worker-1", sessionId: "sess-A", workItem: Object.freeze({ ref: "49/02", assignmentId: "a-1" }) });
      return { input: cell, context: Object.freeze({ latest: Object.freeze([cell]), previous: Object.freeze([]) }) };
    },
  ],
  [
    "a row with a self-referential value",
    () => {
      const cell = selfReferential();
      return { input: cell, context: { latest: [cell], previous: [] } };
    },
  ],
  ["a previous poll that is not an array", () => ({ input: withWorkItem(null), context: { latest: [], previous: null } })],
  ["no previous poll at all", () => ({ input: withWorkItem(null), context: { latest: [] } })],
];

export const homeFeedAxisTests = [
  // ══ Scenario: a session an assignment owns is the only shape the axis calls a known producer
  {
    name: "49/02 task00 — a session an assignment owns is the only shape the axis calls a known producer, the closed set is exposed, and no clock enters the derivation",
    run: async () => {
      const owned = withWorkItem({ ref: "49/02", assignmentId: "a-1" });
      assert.equal(feedAxisFor(owned, { latest: [owned], previous: [] }), FEED_PRODUCER_KNOWN);

      assert.deepEqual([...FEED_AXIS_VALUES], AXIS_VALUES, "the function exposes the closed set of exactly three values");
      assert.equal(FEED_AXIS_VALUES.length, 3);
      assert.ok(Object.isFrozen(FEED_AXIS_VALUES), "…as a frozen value, not a comment");

      assert.equal(feedAxisFor(owned, { latest: [owned], previous: [] }), FEED_PRODUCER_KNOWN, "reading it again with the identical row returns the identical value");
      assert.equal(
        withClockAdvanced(1, () => feedAxisFor(owned, { latest: [owned], previous: [] })),
        FEED_PRODUCER_KNOWN,
        "…and reading it again after advancing the process clock by an hour returns the identical value",
      );
    },
  },

  // ══ Scenario Outline: the axis value for every `workItem` shape a row can carry
  ...WORK_ITEM_SHAPES.map(([label, input, expected]) => ({
    name: `49/02 task00 — the axis value for a workItem that is: ${label} -> ${expected}`,
    run: async () => {
      let answer;
      assert.doesNotThrow(() => {
        answer = feedAxisFor(input, { latest: [input], previous: [] });
      }, "no error is thrown");
      assert.equal(answer, expected);
    },
  })),

  // ══ Scenario: a tuple that was in the last poll and is not in this one is `roster-gone`
  {
    name: "49/02 task00 — a tuple in the previous poll and not in the latest is `roster-gone`, whatever its previous workItem said; one in BOTH never is; one in NEITHER yields no pane at all",
    run: async () => {
      const gone = withWorkItem({ ref: "49/02", assignmentId: "a-1" });
      const stayed = row("worker-1", "sess-B", { workItem: null });
      const previous = [gone, stayed];
      const latest = [stayed];

      assert.equal(feedAxisFor(gone, { latest, previous }), FEED_ROSTER_GONE);
      assert.equal(
        feedAxisFor({ nodeId: "worker-1", sessionId: "sess-A" }, { latest, previous }),
        FEED_ROSTER_GONE,
        "the value does NOT depend on what the tuple's workItem said in the previous poll",
      );
      assert.equal(feedAxisFor(stayed, { latest, previous }), FEED_NO_PRODUCER, "a tuple present in BOTH polls is never `roster-gone`");

      const poll = feedAxisForPoll({ latest, previous });
      assert.deepEqual(
        poll.departed.map((entry) => `${entry.nodeId}/${entry.sessionId}`),
        ["worker-1/sess-A"],
        "the departed set is exactly the tuple that left",
      );
      assert.ok(poll.departed.every((entry) => entry.axis === FEED_ROSTER_GONE && !("row" in entry)), "a departed TUPLE carries no row — a previous poll is never a source of panes");

      // …and a tuple present in NEITHER poll yields no pane at all: there is nothing to
      // compose, and the axis is asked nothing.
      const named = [...poll.entries, ...poll.departed].map((entry) => `${entry.nodeId}/${entry.sessionId}`);
      assert.ok(!named.includes("worker-9/sess-NEVER"), `a tuple in neither poll appears nowhere: ${JSON.stringify(named)}`);
    },
  },

  // ══ Scenario: a node going stale removes its sessions from the index
  {
    name: "49/02 task00 — a node going stale removes its sessions from the index, so both panes learn it as `roster-gone` and never as a degraded node state",
    run: async () => {
      // `buildSessionIndex` gates on `node.freshness !== \"live\"`, so a stale node contributes
      // ZERO sessions and the rows simply LEAVE. There is no pane-level "node unreachable"
      // state to build, and a build that invented one would have invented a fact.
      const first = row("worker-1", "sess-A", { workItem: { ref: "49/02", assignmentId: "a-1" } });
      const second = row("worker-1", "sess-B", { workItem: null });
      const other = row("worker-2", "sess-C", { workItem: null });
      const previous = [first, second, other];
      const latest = [other];

      for (const cell of [first, second]) {
        const answer = feedAxisFor(cell, { latest, previous });
        assert.equal(answer, FEED_ROSTER_GONE);
        assert.ok(!/stale|freshness|unreachable|address|node/i.test(answer), "the answer names no node-level fact");
      }
      assert.deepEqual([...FEED_AXIS_VALUES].filter((value) => /stale|unavailable|unreachable/.test(value)), [], "no axis value maps roster staleness onto `unavailable` (DG-49-10)");
    },
  },

  // ══ Scenario Outline: an unsubscribed pane borrows no ramp word (8 ramp states x 3 axis values)
  ...[...RAMP_WORDS].map((rampState) => ({
    name: `49/02 task00 — an UNSUBSCRIBED pane whose last known ramp state was \`${rampState}\` borrows no ramp word, for all three axis values`,
    run: async () => {
      for (const axis of AXIS_VALUES) {
        for (const cause of [HELD_AT_CAP, HELD_HIDDEN]) {
          const composed = compose({ subscribed: false, state: rampState, axis, cause, slotFree: cause === HELD_HIDDEN, cap: 16 });
          assert.notEqual(composed.word, rampState, "the composition does not return the ramp state as the pane's word");
          assert.equal(composed.word, null);
          const strings = stringValuesOf(composed);
          for (const word of RAMP_WORDS) {
            assert.ok(!strings.includes(word), `no member of TERMINAL_STATE_LIST (nor \`unknown\`) leaks: found \`${word}\``);
          }
          assert.ok(composed.notWatching != null, "each composition names WHY it is not watching");
          assert.equal(composed.notWatching.cause, cause);
          assert.equal(composed.notWatching.cost, COST_SUBSCRIPTION, "…and carries the subscription toggle's own cost — never a connection word");
          assert.equal(composed.notWatching.cap, 16, "…and the cap as a VALUE, so no render site types the number into its copy");
        }
      }
    },
  })),

  // ══ THE HOLD CAUSE IS ACCEPTED, NEVER COERCED ────────────────────────────────────────────
  // The composition used to read `cause: input?.cause === HELD_AT_CAP ? HELD_AT_CAP : HELD_HIDDEN`,
  // so EVERY unrecognised value composed as `hidden` — and the wrong-but-plausible one is a single
  // import away, because `RELEASED_LEFT_INDEX` is an exported constant of the very module this one
  // imports from. Telling an operator they hid a pane they did not hide is a lie about their own
  // action, on the screen built so they do not lose track of an agent. It was also the odd one out
  // in its own object: `slotFree` fails closed to `false` and `cap` is honestly `null` when
  // unstated — only `cause` invented. The house rule is `buildSessionIndex`'s `stated()`.
  ...[
    ["the arbiter's at-cap frame", HELD_AT_CAP, HELD_AT_CAP],
    ["the arbiter's hidden frame", HELD_HIDDEN, HELD_HIDDEN],
    ["the arbiter's answer for a row that is not addressable at all", null, null],
    ["no cause stated", undefined, null],
    ["a sibling constant from the SAME module — the one-import-away mistake", RELEASED_LEFT_INDEX, null],
    ["the recovery code, misread as a cause", RECOVERY_HIDE_ONE, null],
    ["a word from the connection ramp", TERMINAL_STATES.UNAVAILABLE, null],
    ["an unavailable CAUSE", Object.values(UNAVAILABLE_CAUSES)[0], null],
    ["a plausible invention", "left-the-index-and-came-back", null],
    ["the empty string", "", null],
    ["a number", 1, null],
    ["a boolean", true, null],
    ["an object shaped like a cause", { cause: HELD_AT_CAP }, null],
  ].map(([label, cause, expected]) => ({
    name: `49/02 task00 — an unsubscribed pane's cause is ACCEPTED, never coerced: ${label} -> ${JSON.stringify(expected)}`,
    run: async () => {
      const composed = compose({ subscribed: false, state: TERMINAL_STATES.STREAMING, axis: FEED_NO_PRODUCER, cause, slotFree: true, cap: 16 });
      assert.equal(composed.notWatching.cause, expected, "the composed hold cause");
      if (expected == null) {
        assert.notEqual(composed.notWatching.cause, HELD_HIDDEN, "…and NOTHING unrecognised is silently promoted to `hidden`");
        assert.notEqual(composed.notWatching.cause, HELD_AT_CAP, "…nor to `at-cap`");
      }
      assert.equal(composed.notWatching.cost, COST_SUBSCRIPTION, "the rest of the object is unchanged");
      assert.equal(composed.notWatching.cap, 16);
      assert.equal(composed.subscribed, false);
    },
  })),

  {
    name: "49/02 task00 — the two modules AGREE end to end: every cause the arbiter states composes back as itself, and the one it states for an unaddressable row composes as nothing at all",
    run: async () => {
      const handed = [
        { nodeId: "worker-1", sessionId: "sess-A" },
        { nodeId: "worker-1", sessionId: "sess-B" },
        null,
      ];
      const arbitration = subscribedPaneSet(handed, 1, { hidden: [{ nodeId: "worker-1", sessionId: "sess-B" }] }, []);
      assert.equal(arbitration.decisions.length, 3, "the arbiter decided every handed row");

      const composed = arbitration.decisions.map((decision) =>
        compose({ subscribed: decision.subscribed, state: TERMINAL_STATES.WAITING, axis: FEED_PRODUCER_KNOWN, cause: decision.cause, slotFree: decision.slotFree, cap: decision.cap }),
      );
      assert.equal(composed[0].notWatching, null, "the subscribed pane is watching");
      assert.equal(composed[1].notWatching.cause, HELD_HIDDEN, "the hidden pane says the operator hid it");
      assert.equal(composed[2].notWatching.cause, null, "…and the unaddressable row invents nothing — it is not a pane (ADR-002), so nothing held it");
    },
  },

  // ══ Scenario Outline: a subscribed pane says the ramp's word, unchanged, for every axis value
  ...RAMP_WORDS.filter((rampState) => rampState !== TERMINAL_STATES.WAITING).map((rampState) => ({
    name: `49/02 task00 — a SUBSCRIBED pane whose ramp state is \`${rampState}\` says exactly that word for every axis value, and returns no UNAVAILABLE_CAUSES value it was not handed`,
    run: async () => {
      for (const axis of AXIS_VALUES) {
        const composed = compose({ subscribed: true, state: rampState, axis });
        assert.equal(composed.word, rampState, "the ramp's word is the pane's word, unchanged");
        assert.ok(RAMP_WORDS.includes(composed.word), "…and every word it can return is a ramp word or exactly `unknown`");
        const strings = stringValuesOf(composed);
        for (const cause of Object.values(UNAVAILABLE_CAUSES)) {
          assert.ok(!strings.includes(cause), `no composition returns \`${cause}\` unless the ramp state handed in was \`unavailable\``);
        }
      }
    },
  })),

  // ══ Scenario Outline: on `waiting` alone, the axis supplies the pane's reason
  ...[
    ["an assignment owns this tuple", FEED_PRODUCER_KNOWN, "waiting for output", false],
    ["nothing will ever feed this", FEED_NO_PRODUCER, "no live output", true],
    // ROW 3 IS A QA RULING ROUTED AS A DESIGN GAP, and this test pins only what is safe and is
    // asserted for all three rows: AT MOST ONE reason is injected, it has exactly ONE author,
    // and the state stays `waiting`. The chip word column says `waiting for output`, which is
    // what NOT injecting produces — and ADR-003 precedence 3 says `roster-gone` ANNOTATES
    // rather than replaces, so the annotation carries the roster fact instead.
    ["the mesh no longer lists it", FEED_ROSTER_GONE, "waiting for output", false],
  ].map(([label, axis, chipWord, reasonInjected]) => ({
    name: `49/02 task00 — on \`waiting\`, a ${label} (${axis}) pane's chip reads \`${chipWord}\` and a reason is ${reasonInjected ? "" : "NOT "}injected`,
    run: async () => {
      const composed = compose({ subscribed: true, state: TERMINAL_STATES.WAITING, axis });
      const descriptor = describeTerminalState(TERMINAL_STATES.WAITING, { reason: composed.reason ?? undefined, owner: "worker-1 · sess-A" });
      assert.equal(descriptor.text, chipWord, "the descriptor's chip word");
      assert.equal(composed.reason != null, reasonInjected, "a reason is injected exactly when the table says");
      if (reasonInjected) assert.equal(composed.reason, NO_LIVE_OUTPUT_REASON, "…and it is DG-49-2's sentence, from its ONE author");
      assert.equal(descriptor.state, TERMINAL_STATES.WAITING, "the narrowing rewrites the CHIP, never the state");
      assert.equal(composed.word, TERMINAL_STATES.WAITING);
    },
  })),

  {
    name: "49/02 task00 — at most ONE reason is ever injected, and it has exactly one author: the composition, over the whole 3-axis x 8-state grid",
    run: async () => {
      const injected = new Set();
      for (const axis of AXIS_VALUES) {
        for (const rampState of RAMP_WORDS) {
          const composed = compose({ subscribed: true, state: rampState, axis });
          if (composed.reason != null) injected.add(`${rampState}/${axis}`);
        }
      }
      assert.deepEqual([...injected], [`${TERMINAL_STATES.WAITING}/${FEED_NO_PRODUCER}`], "exactly one cell of the grid injects a reason");
    },
  },

  // ══ Scenario: `roster-gone` ANNOTATES, never replaces
  {
    name: "49/02 task00 — a pane that is streaming when its row leaves the index keeps saying `streaming`, and carries the roster-gone annotation on the SAME composition",
    run: async () => {
      const open = row("worker-1", "sess-A", { workItem: { ref: "49/02", assignmentId: "a-1" } });
      const previous = [open];
      const latest = [row("worker-2", "sess-C", { workItem: null })];
      const axis = feedAxisFor(open, { latest, previous });
      assert.equal(axis, FEED_ROSTER_GONE);

      const composed = compose({ subscribed: true, state: TERMINAL_STATES.STREAMING, axis });
      assert.equal(composed.word, TERMINAL_STATES.STREAMING, "the transport fact is TRUE and the browser observed it");
      assert.equal(composed.annotation, FEED_ROSTER_GONE, "the annotation is a SEPARATE field from the word");
      assert.notEqual(composed.annotation, composed.word, "…and the two travel together on one composition, so no render site has to join them");
      for (const forbidden of [TERMINAL_STATES.ENDED, TERMINAL_STATES.ERROR, TERMINAL_STATES.UNAVAILABLE]) {
        assert.notEqual(composed.word, forbidden, `the composition's word is NOT ${forbidden}`);
      }
    },
  },

  // ══ Scenario Outline: no byte, painted or unpainted, moves the axis value
  ...BYTE_ROWS.map(([label, input, bytes, expected]) => ({
    name: `49/02 task00 — no byte moves the axis value: ${label} -> ${expected}`,
    run: async () => {
      const context = { latest: [input], previous: [] };
      const unpainted = feedAxisFor(input, context);
      const painted = feedAxisFor({ ...input }, context);
      assert.equal(unpainted, painted, "the two axis values are identical");
      assert.equal(unpainted, expected);
      // …and handing the byte content to the axis function as an EXTRA argument returns that
      // same value again. There is no byte parameter, optional or otherwise.
      assert.equal(feedAxisFor(input, context, bytes), expected);
      assert.ok(feedAxisFor.length <= 2, `the signature has no byte parameter: arity ${feedAxisFor.length}`);
    },
  })),

  // ══ Scenario Outline: the axis is total — every input answers, none throws
  ...TOTALITY_ROWS.map(([label, build]) => ({
    name: `49/02 task00 — the axis is total: ${label}`,
    run: async () => {
      const { input, context } = build();
      let answer;
      assert.doesNotThrow(() => {
        answer = feedAxisFor(input, context);
      }, "no error is thrown");
      assert.ok(AXIS_VALUES.includes(answer), `the returned value is one of the three: ${answer}`);

      // …and the answer for every other row in the same poll is unchanged: one bad row never
      // poisons its neighbours.
      const good = [row("worker-1", "sess-GOOD", { workItem: { ref: "49/02", assignmentId: "a-1" } }), row("worker-2", "sess-FREE", { workItem: null })];
      const clean = feedAxisForPoll({ latest: good, previous: [] });
      const poisoned = feedAxisForPoll({ latest: [...good, input], previous: Array.isArray(context?.previous) ? context.previous : [] });
      assert.deepEqual(
        poisoned.entries.filter((entry) => entry.sessionId.startsWith("sess-")).slice(0, 2).map((entry) => [entry.sessionId, entry.axis]),
        clean.entries.map((entry) => [entry.sessionId, entry.axis]),
        "one bad row never poisons its neighbours",
      );
    },
  })),

  {
    name: "49/02 task00 — the FIRST poll after page load marks nothing `roster-gone`: absent-from-the-previous-poll is not the same as the-previous-poll-was-empty",
    run: async () => {
      const latest = [row("worker-1", "sess-A", { workItem: null }), row("worker-2", "sess-B", { workItem: { ref: "49/02", assignmentId: "a-1" } })];
      for (const previous of [undefined, null, []]) {
        const poll = feedAxisForPoll({ latest, previous });
        assert.deepEqual(poll.departed, [], `no pane is roster-gone on the first poll (previous = ${JSON.stringify(previous)})`);
        for (const cell of latest) assert.notEqual(feedAxisFor(cell, { latest, previous }), FEED_ROSTER_GONE);
      }
    },
  },

  // ══ Scenario: the connection vocabulary is exactly what milestone 46 froze — LAST, because it
  //    reads the union of every word the compositions above actually returned.
  {
    name: "49/02 task00 — the connection vocabulary is exactly what milestone 46 froze, and the union of every word this file's compositions returned is a SUBSET of those eight strings",
    run: async () => {
      assert.deepEqual(
        [...TERMINAL_STATE_LIST],
        ["idle", "connecting", "waiting", "streaming", "ended", "error", "unavailable"],
        "seven members, in that order",
      );
      assert.equal(UNKNOWN_STATE, "unknown");
      assert.ok(!TERMINAL_STATE_LIST.includes(UNKNOWN_STATE), "`unknown` is NOT a member of that list");

      assert.ok(COMPOSED_WORDS.size > 0, "the union was actually computed from driven compositions (non-vacuous)");
      const strays = [...COMPOSED_WORDS].filter((word) => !RAMP_WORDS.includes(word));
      assert.deepEqual(strays, [], `the home contributes no word of its own; found ${JSON.stringify(strays)}`);
      assert.equal(COMPOSED_WORDS.size, RAMP_WORDS.length, "…and every one of the eight was actually driven, so the subset assertion is not satisfied by an untouched path");
    },
  },
];
