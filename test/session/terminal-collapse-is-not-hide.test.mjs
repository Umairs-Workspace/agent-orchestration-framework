// Traceability for milestone 46 / story 04 / task 01 —
// `01_collapse-keeps-the-session-hide-ends-it.feature`, the `@executable` half.
//
// TWO OPERATIONS THAT LOOK ALIKE AND COST DIFFERENTLY. COLLAPSE hides the byte area with CSS and
// keeps the WebSocket, the PTY, the running agent and the scrollback. HIDE closes the socket and
// ends the subscription. This suite asserts the TWO COSTS SEPARATELY, because a unified control is
// exactly the circumstance under which two operations quietly acquire one button.
//
// WHY THE MODEL HALF IS A VALUE AND NOT A DEPENDENCY ARRAY. The rule was already earned, in a
// comment, on the file this milestone deletes: *"collapsing must NOT tear the session down … So
// `collapsed` is deliberately NOT a dependency."* A dependency array is a thing only React can
// read, and this repo has no React test — so the rule survived as prose beside its mechanism, and
// a naive union of two components is exactly the diff that re-derives the effect's identity and
// quietly adds `collapsed` to it. Here the identity is a STRING, the `.tsx` uses THAT string as
// its session effect's dependency, and the property stops depending on nobody editing a comment.
//
// NOT ASSERTED HERE, deliberately: the dependency ARRAY itself (a `.feature` that pins a deps list
// has pinned the mechanism instead of the property); and the LIVE half — that the agent really
// kept running, that the socket really closed, that nothing leaked across ten cycles — which needs
// a real browser, a real xterm and a real far end and is `@manual` with named evidence.
//
// ISOLATION: run focused, with `AOF_GLOBAL_HOME=$(mktemp -d)`. Never the full suite.
import assert from "node:assert/strict";

import { sessionSourceFor } from "../../ui/src/terminal/source-table.mjs";
import {
  AFFORDANCES,
  AFFORDANCE_CHANGE,
  CHANGE_CATALOGUE,
  affordanceFormViolations,
  applyHostChange,
  changeForAffordance,
  changeOutcome,
  declaresAffordance,
  hostAffordances,
  terminalControlState,
  terminalSessionIdentity,
  AFFORDANCE_CLOSE,
  AFFORDANCE_COLLAPSE,
  AFFORDANCE_DRAG_RESIZE,
  AFFORDANCE_EXIT_FULLSCREEN,
  AFFORDANCE_WATCH_HIDE,
  COST_LAYOUT,
  COST_PAGE_LOAD,
  COST_SESSION,
  COST_SUBSCRIPTION,
  FORM_CHEVRON,
  FORM_ICON_CONTROL,
  FORM_SEPARATOR,
  FORM_WORDED_TOGGLE,
  HIDE_LABEL,
  HOST_BOARD_DOCK,
  HOST_CHANGES,
  HOST_FLEET_CARD,
  HOST_FULLSCREEN,
  NON_IDENTITY_FIELDS,
  SCROLLBACK_EMPTY,
  SCROLLBACK_GONE,
  SCROLLBACK_INTACT,
  SESSION_SURVIVES,
  SESSION_TEARS_DOWN,
  TERMINAL_HOSTS,
  WATCH_LABEL,
} from "../../ui/src/terminal/host-model.mjs";
import { POSTURE_INTERACTIVE, POSTURE_READ_ONLY } from "../../ui/src/terminal/input-policy.mjs";
import { TERMINAL_STATE_LIST, applyTerminalEvent, bindSource, describeTerminalState, TERMINAL_EVENTS, TERMINAL_STATES } from "../../ui/src/terminal/state-ramp.mjs";

const LOCAL_PTY = sessionSourceFor("local-pty").source;
const MIRROR = sessionSourceFor("mirror").source;

// A bound, streaming local session — the state every row below starts from unless it says
// otherwise. `painted: true` is what makes "intact and CONTINUOUS" different from "empty".
function localSession(extra = {}) {
  return terminalControlState({
    source: LOCAL_PTY,
    params: { ref: "46/04", provider: "claude" },
    posture: POSTURE_INTERACTIVE,
    painted: true,
    ...extra,
  });
}

function mirrorSession(extra = {}) {
  return terminalControlState({
    source: MIRROR,
    params: { nodeId: "aof-wsl", sessionId: "7f3a91c" },
    posture: POSTURE_READ_ONLY,
    painted: true,
    ...extra,
  });
}

export const terminalCollapseIsNotHideTests = [
  // ══════════════════════════════════════════════════════════════════════════════════════════
  // Scenario Outline: what ends a session and what does not — the control's session identity, as
  // a value. 15 rows.
  //
  // ROW 1 IS THE ONE THAT REGRESSES. Collapse is free today and it is free ONLY because someone
  // wrote down why; the whole risk of this milestone is that a naive union of two files re-derives
  // the effect's identity and quietly adds `collapsed` to it.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  ...[
    { case: "THE HEADLINE", state: () => localSession(), change: HOST_CHANGES.COLLAPSE, verdict: SESSION_SURVIVES, scrollback: SCROLLBACK_INTACT, continuous: true, cost: COST_LAYOUT },
    { case: "expanding again", state: () => localSession({ collapsed: true }), change: HOST_CHANGES.EXPAND, verdict: SESSION_SURVIVES, scrollback: SCROLLBACK_INTACT, continuous: true, cost: COST_LAYOUT },
    { case: "collapse before the first byte", state: () => localSession({ painted: false }), change: HOST_CHANGES.COLLAPSE, verdict: SESSION_SURVIVES, scrollback: SCROLLBACK_EMPTY, continuous: true, cost: COST_LAYOUT },
    { case: "collapse a mirror", state: () => mirrorSession(), change: HOST_CHANGES.COLLAPSE, verdict: SESSION_SURVIVES, scrollback: SCROLLBACK_INTACT, continuous: true, cost: COST_LAYOUT },
    { case: "dragging the dock taller", state: () => localSession(), change: { kind: HOST_CHANGES.RESIZE, boxHeight: 420 }, verdict: SESSION_SURVIVES, scrollback: SCROLLBACK_INTACT, continuous: true, cost: COST_LAYOUT },
    { case: "the surface re-renders around it", state: () => localSession(), change: HOST_CHANGES.HOST_RERENDER, verdict: SESSION_SURVIVES, scrollback: SCROLLBACK_INTACT, continuous: true, cost: COST_LAYOUT },
    { case: "fullscreen, presented", state: () => mirrorSession(), change: HOST_CHANGES.PRESENT_FULLSCREEN, verdict: SESSION_SURVIVES, scrollback: SCROLLBACK_INTACT, continuous: true, cost: COST_LAYOUT },
    { case: "fullscreen, dismissed", state: () => mirrorSession({ expanded: true }), change: HOST_CHANGES.DISMISS_FULLSCREEN, verdict: SESSION_SURVIVES, scrollback: SCROLLBACK_INTACT, continuous: true, cost: COST_LAYOUT },
    { case: "HIDE", state: () => mirrorSession(), change: HOST_CHANGES.HIDE, verdict: SESSION_TEARS_DOWN, scrollback: SCROLLBACK_GONE, continuous: false, cost: COST_SUBSCRIPTION },
    { case: "close", state: () => localSession(), change: HOST_CHANGES.CLOSE, verdict: SESSION_TEARS_DOWN, scrollback: SCROLLBACK_GONE, continuous: false, cost: COST_SESSION },
    { case: "a different item", state: () => localSession(), change: { kind: HOST_CHANGES.REBIND, params: { ref: "46/05" } }, verdict: SESSION_TEARS_DOWN, scrollback: SCROLLBACK_GONE, continuous: false, cost: COST_SESSION },
    { case: "a different worker session (the sessionId half)", state: () => mirrorSession(), change: { kind: HOST_CHANGES.REBIND, params: { sessionId: "other" } }, verdict: SESSION_TEARS_DOWN, scrollback: SCROLLBACK_GONE, continuous: false, cost: COST_SESSION },
    { case: "a different worker session (the nodeId half)", state: () => mirrorSession(), change: { kind: HOST_CHANGES.REBIND, params: { nodeId: "other" } }, verdict: SESSION_TEARS_DOWN, scrollback: SCROLLBACK_GONE, continuous: false, cost: COST_SESSION },
    { case: "switching provider", state: () => localSession(), change: { kind: HOST_CHANGES.SELECT_PROVIDER, provider: "codex" }, verdict: SESSION_TEARS_DOWN, scrollback: SCROLLBACK_GONE, continuous: false, cost: COST_SESSION },
    { case: "restart", state: () => localSession(), change: HOST_CHANGES.RESTART, verdict: SESSION_TEARS_DOWN, scrollback: SCROLLBACK_GONE, continuous: false, cost: COST_SESSION },
    { case: "the posture flips at runtime (UNREACHABLE in m46)", state: () => mirrorSession(), change: { kind: HOST_CHANGES.SET_POSTURE, posture: POSTURE_INTERACTIVE }, verdict: SESSION_TEARS_DOWN, scrollback: SCROLLBACK_GONE, continuous: false, cost: COST_SESSION },
    { case: "navigating to another surface", state: () => localSession(), change: HOST_CHANGES.NAVIGATE, verdict: SESSION_TEARS_DOWN, scrollback: SCROLLBACK_GONE, continuous: false, cost: COST_PAGE_LOAD },
  ].map((row) => ({
    name: `46/04 task01 what ends a session and what does not — ${row.case}`,
    run() {
      const outcome = changeOutcome(row.state(), row.change);
      assert.equal(outcome.verdict, row.verdict, "the session");
      assert.equal(outcome.scrollback, row.scrollback, "the scrollback");
      assert.equal(outcome.continuous, row.continuous, "…and whether it is CONTINUOUS across the change");
      assert.equal(outcome.cost, row.cost, "and the cost the catalogue declares for it");
      assert.ok(typeof outcome.why === "string" && outcome.why.length > 0, "…with the reason a reviewer needs, beside it");
      if (row.verdict === SESSION_SURVIVES) {
        assert.equal(outcome.identityAfter, outcome.identityBefore, "the identity did not move, which is what 'survives' MEANS");
      } else {
        assert.notEqual(outcome.identityAfter, outcome.identityBefore, "the identity moved, which is what 'tears down' means");
      }
    },
  })),

  {
    // The rule stated once more as a property rather than row by row: NO layout fact is an input
    // to the identity. This is the assertion that catches a future author adding one.
    name: "46/04 task01 NO layout fact is an input to the session's identity — collapse, fullscreen, the box height and the host's own re-render leave it byte-identical",
    run() {
      const base = localSession();
      const identity = terminalSessionIdentity(base);
      assert.ok(typeof identity === "string" && identity.length > 0, "a bound, subscribed session HAS an identity (non-vacuity)");

      for (const field of NON_IDENTITY_FIELDS) {
        assert.ok(!identity.includes(field), `\`${field}\` is not spelled into the identity`);
      }
      const layoutOnly = [
        HOST_CHANGES.COLLAPSE,
        HOST_CHANGES.EXPAND,
        HOST_CHANGES.PRESENT_FULLSCREEN,
        HOST_CHANGES.DISMISS_FULLSCREEN,
        HOST_CHANGES.HOST_RERENDER,
        { kind: HOST_CHANGES.RESIZE, boxHeight: 999 },
      ];
      let state = base;
      for (const change of layoutOnly) {
        state = applyHostChange(state, change);
        assert.equal(terminalSessionIdentity(state), identity, `${typeof change === "string" ? change : change.kind} left the identity untouched`);
      }
      // …and all six together, in sequence, still leave it untouched. A single change surviving is
      // weaker than a session surviving a whole afternoon of them.
      assert.equal(terminalSessionIdentity(state), identity, "six layout changes in a row, one session");

      // A change this module has not learned must not look like a teardown either.
      assert.equal(terminalSessionIdentity(applyHostChange(base, "some-future-host-change")), identity);
      assert.equal(terminalSessionIdentity(applyHostChange(base, undefined)), identity);
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // Scenario Outline: every affordance declares its cost, and no host may offer a form that lies
  // about it. 8 rows.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  ...[
    { case: "the dock's collapse", host: HOST_BOARD_DOCK, affordance: AFFORDANCE_COLLAPSE, declared: true, form: FORM_CHEVRON, cost: COST_LAYOUT },
    { case: "the dock's close", host: HOST_BOARD_DOCK, affordance: AFFORDANCE_CLOSE, declared: true, form: FORM_ICON_CONTROL, cost: COST_SESSION },
    { case: "the dock's drag handle", host: HOST_BOARD_DOCK, affordance: AFFORDANCE_DRAG_RESIZE, declared: true, form: FORM_SEPARATOR, cost: COST_LAYOUT },
    { case: "the card's toggle", host: HOST_FLEET_CARD, affordance: AFFORDANCE_WATCH_HIDE, declared: true, form: FORM_WORDED_TOGGLE, cost: COST_SUBSCRIPTION },
    { case: "the card has no chevron", host: HOST_FLEET_CARD, affordance: AFFORDANCE_COLLAPSE, declared: false },
    { case: "the card has no close", host: HOST_FLEET_CARD, affordance: AFFORDANCE_CLOSE, declared: false },
    { case: "the card has no drag", host: HOST_FLEET_CARD, affordance: AFFORDANCE_DRAG_RESIZE, declared: false },
    { case: "the overlay's exit", host: HOST_FULLSCREEN, affordance: AFFORDANCE_EXIT_FULLSCREEN, declared: true, form: FORM_ICON_CONTROL, cost: COST_LAYOUT },
  ].map((row) => ({
    name: `46/04 task01 every affordance declares its cost — ${row.case}`,
    run() {
      const entry = hostAffordances(row.host)[row.affordance];
      assert.equal(entry.declared, row.declared, "declared, or NOT DECLARED");
      if (row.declared) {
        assert.equal(entry.form, row.form, "the FORM the operator sees");
        assert.equal(entry.cost, row.cost, "…and what it costs them");
      } else {
        // NOT DECLARED carries its own REASON, because two of the card's absences are DESIGN
        // decisions rather than omissions and a reviewer must be able to tell them apart.
        assert.equal(entry.form, null);
        assert.equal(entry.cost, null);
        assert.ok(typeof entry.reason === "string" && entry.reason.length > 20, "…and says WHY it is absent");
      }
      if (row.affordance === AFFORDANCE_DRAG_RESIZE && !row.declared) {
        assert.match(entry.reason, /192px/, "ROW 7 IS NOT AN OMISSION: the panel's total height is a constant, and the affordance for wanting more is EXPAND");
      }
      if (row.affordance === AFFORDANCE_EXIT_FULLSCREEN && row.declared) {
        // ROW 8's "always visible" is BINDING, not stylistic: an interactive occupant CLAIMS
        // `Escape` (it is a live keystroke for the `claude` TUI), so the visible control is then
        // the only way out. Never hover-revealed, never auto-hiding.
        assert.equal(entry.alwaysVisible, true);
      }
      if (row.affordance === AFFORDANCE_WATCH_HIDE && row.declared) {
        assert.equal(entry.onLabel, HIDE_LABEL, "the toggle is WORDED, and the words are the ones that ship");
        assert.equal(entry.offLabel, WATCH_LABEL);
      }
    },
  })),

  {
    // And the two rules, over EVERY host — which is what stops the next host from being the one
    // that merges them.
    name: "46/04 task01 no chevron anywhere carries a cost that ends a session or a subscription, and no worded subscribe/unsubscribe toggle anywhere costs merely layout",
    run() {
      // A LIST, NOT AN INVARIANT (m46/ADR-006, applied verbatim by m49/03): the RULE below is
      // "over EVERY host", and the count is only its non-vacuity. Milestone 49 adds the grid
      // pane, so the LIST moves in the same diff as the code — and nothing this clause asserts
      // is relaxed to let it. Four hosts, and every one of them is still driven.
      assert.equal(TERMINAL_HOSTS.length, 4, "four hosts (non-vacuity) — the m46 three plus m49's grid pane");
      for (const host of TERMINAL_HOSTS) {
        assert.deepEqual(affordanceFormViolations(host), [], `${host}: a chevron means layout-only; a worded toggle means subscribe/unsubscribe`);
      }

      // …AND THE SHIPPED DETECTOR GENUINELY FIRES. The plants go to the REAL
      // `affordanceFormViolations`, not to a copy re-implemented in this file — a mutation review
      // found exactly that shape here, and it meant `if (host) return [];` at the top of the
      // production function left everything green: the detector had only ever been shown to stay
      // QUIET, never to fire. It takes a TABLE as well as a host name for this reason.
      const plants = [
        [
          "a chevron that unsubscribes takes the stream from an operator who asked only for space",
          { [AFFORDANCE_COLLAPSE]: { declared: true, form: FORM_CHEVRON, cost: COST_SUBSCRIPTION } },
        ],
        [
          "a chevron that ends the session is the same lie, one step worse",
          { [AFFORDANCE_COLLAPSE]: { declared: true, form: FORM_CHEVRON, cost: COST_SESSION } },
        ],
        [
          "a worded subscribe/unsubscribe toggle that merely collapses tells an operator they stopped watching a worker when they did not",
          { [AFFORDANCE_WATCH_HIDE]: { declared: true, form: FORM_WORDED_TOGGLE, cost: COST_LAYOUT } },
        ],
        [
          "a control whose DECLARED cost disagrees with the CHANGE it dispatches was decided in two places",
          { [AFFORDANCE_CLOSE]: { declared: true, form: FORM_ICON_CONTROL, cost: COST_LAYOUT } },
        ],
      ];
      for (const [why, table] of plants) {
        const fired = affordanceFormViolations(table);
        assert.ok(fired.length > 0, `self-check: the SHIPPED detector fires — ${why}. Got: ${JSON.stringify(fired)}`);
      }
      // …and stays quiet on a clean table, so "fires" is a discrimination rather than a constant.
      assert.deepEqual(
        affordanceFormViolations({ [AFFORDANCE_COLLAPSE]: { declared: true, form: FORM_CHEVRON, cost: COST_LAYOUT } }),
        [],
        "a chevron that costs layout is exactly what a chevron is for",
      );
      // An UNDECLARED entry is not a violation — absence is a legitimate answer, and a detector
      // that fired on it would make "NOT DECLARED" unsayable.
      assert.deepEqual(affordanceFormViolations({ [AFFORDANCE_COLLAPSE]: { declared: false, form: null, cost: null } }), []);
    },
  },

  {
    // FAIL CLOSED ON AN UNKNOWN HOST. The module states the rule — *"a host the control does not
    // know declares nothing"* — and nothing drove it: `hostAffordances` falling open to the board
    // dock's table survived a mutation review, while the input policy's fail-closed twin is
    // exhaustively driven. Same rule, same milestone, same reasoning: an unrecognised declaration
    // is not a permission.
    name: "46/04 task01 an unrecognised host declares NOTHING — every affordance OFF, with its reason, and no control inherited from a host it is not",
    run() {
      for (const unknown of ["some-future-host", "", null, undefined, 42, {}]) {
        const table = hostAffordances(unknown);
        for (const name of AFFORDANCES) {
          assert.equal(table[name]?.declared, false, `${JSON.stringify(unknown)} / ${name}: declared OFF`);
          assert.equal(declaresAffordance(unknown, name), false, "…and the predicate agrees");
          assert.match(table[name].reason, /unrecognised host/, "…and says WHY, so the absence is legible");
        }
        // It is not the board dock's table wearing another name: the dock declares six.
        assert.notDeepEqual(table, hostAffordances(HOST_BOARD_DOCK), "an unknown host does NOT fall open to a known one's controls");
        assert.deepEqual(affordanceFormViolations(unknown), [], "…and a table of pure absences violates nothing");
      }
      // NON-VACUITY: the three real hosts do declare things, so "declares nothing" is a
      // discrimination rather than what this function always says.
      assert.ok(AFFORDANCES.some((name) => declaresAffordance(HOST_BOARD_DOCK, name)), "the board dock declares controls");
    },
  },

  {
    // THE TIE, and it is what makes both tables more than decoration: the FORM the component
    // renders and the CHANGE it dispatches come from the same row, so a control's appearance and
    // its effect cannot be decided in two places.
    name: "46/04 task01 every declared affordance dispatches a change whose cost IS the cost it declares — a toggle's two sides included",
    run() {
      let checked = 0;
      for (const host of TERMINAL_HOSTS) {
        for (const name of AFFORDANCES) {
          const entry = hostAffordances(host)[name];
          if (entry.declared !== true) continue;
          for (const engaged of [false, true]) {
            const kind = changeForAffordance(name, engaged);
            assert.ok(kind != null, `${host}/${name}: a declared affordance dispatches a NAMED change`);
            assert.equal(CHANGE_CATALOGUE[kind].cost, entry.cost, `${host}/${name} (${engaged ? "engaged" : "idle"}): the declared cost IS the change's cost`);
            checked += 1;
          }
        }
      }
      assert.ok(checked >= 16, `non-vacuous: ${checked} affordance/side pairs checked`);
      // A control this module does not know dispatches NOTHING — an unknown control must do
      // nothing rather than something plausible.
      assert.equal(changeForAffordance("some-future-control"), null);
      assert.equal(changeForAffordance(undefined), null);
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // Scenario: collapsing does not enter the state ramp, and the ramp has no word for it.
  // If `collapsed` ever became a state word, the ramp would have two vocabularies again — the
  // exact defect this milestone deletes.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "46/04 task01 collapsing does not enter the state ramp — the state is the same on the way out as on the way in, in every one of the seven, and `collapsed` is not a state word",
    run() {
      // Given a bound session in each of the ramp's states in turn.
      for (const word of TERMINAL_STATE_LIST) {
        const before = describeTerminalState(word, { owner: "46/04" });
        // When the host collapses and expands the pane — a HOST change, which the ramp cannot
        // even be handed: the state is a value the transitions own and layout is not an event.
        const state = applyHostChange(applyHostChange(localSession(), HOST_CHANGES.COLLAPSE), HOST_CHANGES.EXPAND);
        assert.equal(state.collapsed, false, "the host came back expanded");
        const after = describeTerminalState(word, { owner: "46/04" });
        assert.deepEqual({ ...after }, { ...before }, `${word}: the state is the same on the way out as it was on the way in`);
      }

      // And `collapsed` is not a member of the state vocabulary and never appears as a state word
      // or a chip label.
      assert.ok(!TERMINAL_STATE_LIST.includes("collapsed"), "`collapsed` is not a state");
      assert.ok(!TERMINAL_STATE_LIST.includes("expanded"), "…and neither is `expanded`");
      for (const word of TERMINAL_STATE_LIST) {
        const descriptor = describeTerminalState(word, { owner: "46/04" });
        assert.ok(!/collaps|expand/i.test(descriptor.text), `${word}: no chip label mentions the host's layout`);
      }

      // And a COLLAPSED pane that receives bytes still transitions to `streaming` — the host's
      // layout does not stop the ramp from being honest.
      const collapsed = applyHostChange(localSession({ painted: false }), HOST_CHANGES.COLLAPSE);
      assert.equal(collapsed.collapsed, true, "precondition: the pane is collapsed");
      const streamed = applyTerminalEvent(bindSource(), TERMINAL_EVENTS.BYTES);
      assert.equal(streamed.state, TERMINAL_STATES.STREAMING, "a collapsed pane's bytes still make it streaming");

      // And a collapsed pane whose far end exits still transitions to `ended` carrying its exit
      // code, so EXPANDING SHOWS THE TRUTH rather than the last thing seen.
      const exited = applyTerminalEvent(streamed, { kind: TERMINAL_EVENTS.EXIT_FRAME, exitCode: 0 });
      assert.equal(exited.state, TERMINAL_STATES.ENDED);
      assert.equal(exited.exitCode, 0);
      assert.equal(describeTerminalState(exited, { owner: "46/04" }).text, "exited (0)");
    },
  },
];
