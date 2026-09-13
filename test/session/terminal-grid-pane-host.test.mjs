// milestone 49 / story 03 / task 00 — THE CONTROL'S FOURTH HOST (@executable).
//
// Every scenario and every Examples ROW of
// `wiki/work/49_milestone_terminals-home/stories/03_story_pane-declaration-and-invariant-4/tasks/00_the-fourth-host.feature`,
// driven against the SHIPPED `ui/src/terminal/host-model.mjs`. No React, no DOM, no socket, no
// clock, no store, no port — every scenario imports the framework-free `.mjs` and reads returned
// values.
//
// EVERY PLANT GOES TO THE SHIPPED `affordanceFormViolations`, never to a copy defined in this
// file, and each plant asserts it LANDED — that it differs from the clean table — before the
// detector is asserted to trip on it. That is the PO's ruling and it is this module's own
// recorded history: m46's mutation review found the one plant here being fed to a locally
// re-implemented copy, so the shipped detector had never once been driven to a violation and
// `return []` would have read green everywhere.
import assert from "node:assert/strict";
import {
  AFFORDANCES,
  AFFORDANCE_FORMS,
  AFFORDANCE_CLOSE,
  AFFORDANCE_COLLAPSE,
  AFFORDANCE_DRAG_RESIZE,
  AFFORDANCE_EXIT_FULLSCREEN,
  AFFORDANCE_FULLSCREEN,
  AFFORDANCE_PROVIDER_PICKER,
  AFFORDANCE_RESTART,
  AFFORDANCE_WATCH_HIDE,
  CHANGE_CATALOGUE,
  COST_LAYOUT,
  COST_SESSION,
  COST_SUBSCRIPTION,
  FORM_CHEVRON,
  FORM_ICON_CONTROL,
  FORM_PANE_ACTIVATION,
  FORM_WORDED_TOGGLE,
  HIDE_LABEL,
  HOST_BOARD_DOCK,
  HOST_CHANGES,
  HOST_FLEET_CARD,
  HOST_FULLSCREEN,
  HOST_GRID_PANE,
  NON_IDENTITY_FIELDS,
  REST_PANE_NONE,
  SESSION_IDENTITY_FIELDS,
  TERMINAL_HOSTS,
  WATCH_LABEL,
  affordanceFormViolations,
  changeForAffordance,
  changeOutcome,
  declaresAffordance,
  hostAffordances,
  hostRestPane,
} from "../../ui/src/terminal/host-model.mjs";
import { PANE_EMPTY_HOST } from "../../ui/src/terminal/state-ramp.mjs";
import { sessionSourceFor } from "../../ui/src/terminal/source-table.mjs";
import { POSTURE_INTERACTIVE, POSTURE_READ_ONLY } from "../../ui/src/terminal/input-policy.mjs";

const GRID = () => hostAffordances(HOST_GRID_PANE);
const CARD = () => hostAffordances(HOST_FLEET_CARD);

// A hand-written COPY of the delivered table — the only way a plant can be applied without
// touching the frozen shipped one, and the reason `affordanceFormViolations` takes a TABLE.
const copyOfGrid = () => Object.fromEntries(Object.entries(GRID()).map(([name, entry]) => [name, { ...entry }]));

// The control state every posture-cost scenario starts from: bound to the `mirror` source,
// addressed by (node-a, sess-1), interactive, subscribed, with bytes already painted.
const boundState = () => ({
  source: sessionSourceFor("mirror").source,
  params: { nodeId: "node-a", sessionId: "sess-1" },
  posture: POSTURE_INTERACTIVE,
  subscribed: true,
  painted: true,
});

export const terminalGridPaneHostTests = [
  // ══ Scenario: the fourth host is a member of the frozen list and owns a whole table of its own
  {
    name: "49/03 task00 — the fourth host is a member of the frozen list and owns a whole table of its own",
    run: async () => {
      assert.equal(TERMINAL_HOSTS.length, 4, "exactly four members");
      assert.equal(TERMINAL_HOSTS[3], "grid-pane", "…and the fourth is the string `grid-pane` (DESIGN §S2's value)");
      assert.equal(HOST_GRID_PANE, "grid-pane", "…which is also the constant's value: name↔value matched, as both m46 hosts are");
      assert.ok(Object.isFrozen(TERMINAL_HOSTS), "the list is frozen");
      assert.deepEqual([...TERMINAL_HOSTS].slice(0, 3), ["board-dock", "fleet-card", "fullscreen"], "…and the first three are untouched, in order");

      const table = GRID();
      assert.deepEqual(Object.keys(table).sort(), [...AFFORDANCES].sort(), "the key set is EXACTLY `AFFORDANCES` — all eight present, and no key that is not one of them");
      assert.equal(AFFORDANCES.length, 8, "…and `AFFORDANCES` still has exactly eight members: this host invents no ninth affordance");
      assert.ok(Object.isFrozen(table), "the table is frozen");
      assert.equal(GRID(), table, "…and two calls return the SAME object rather than two equal copies — `hostAffordances` hands out the module's own table by reference");
      assert.notEqual(table, CARD(), "…and it is NOT the object the fleet card's lookup returns");
    },
  },

  // ══ Scenario Outline: an affordance declared ON names its FORM and its COST. 2 rows.
  ...[
    {
      case: "spending the subscription budget",
      affordance: AFFORDANCE_WATCH_HIDE,
      form: FORM_WORDED_TOGGLE,
      cost: COST_SUBSCRIPTION,
      extra: (entry) => {
        assert.equal(entry.onLabel, HIDE_LABEL, "`onLabel` is exactly `HIDE_LABEL` — the shipped constant by identity, not a re-typed string");
        assert.equal(entry.offLabel, WATCH_LABEL, "…and `offLabel` is exactly `WATCH_LABEL`");
        assert.equal(HIDE_LABEL, "Hide terminal");
        assert.equal(WATCH_LABEL, "Watch terminal →");
      },
    },
    {
      case: "expand is where the words are",
      affordance: AFFORDANCE_FULLSCREEN,
      form: FORM_ICON_CONTROL,
      cost: COST_LAYOUT,
      extra: (entry) => {
        assert.ok(!("alwaysVisible" in entry), "there is no `alwaysVisible` flag on it — an always-visible EXIT belongs to the FULLSCREEN host, never to the opener");
        assert.equal(hostAffordances(HOST_FULLSCREEN)[AFFORDANCE_EXIT_FULLSCREEN].alwaysVisible, true, "…and the overlay's own exit still carries it");
      },
    },
  ].map((row) => ({
    name: `49/03 task00 — an affordance declared ON names its FORM and its COST — ${row.case}`,
    run: async () => {
      const entry = GRID()[row.affordance];
      assert.equal(entry.declared, true, "declared ON");
      assert.equal(declaresAffordance(HOST_GRID_PANE, row.affordance), true, "…and `declaresAffordance` agrees");
      assert.equal(entry.form, row.form, "the FORM the operator sees");
      assert.equal(entry.cost, row.cost, "…and what it costs them");
      row.extra(entry);
    },
  })),

  // ══ Scenario Outline: an affordance declared OFF carries no form, no cost, and a reason. 6 rows.
  ...[
    { case: "a hole in a uniform grid", affordance: AFFORDANCE_COLLAPSE, says: [/grid track/, /EXPAND/] },
    { case: "there is no honest third meaning", affordance: AFFORDANCE_CLOSE, says: [/cannot end another machine's session/, /unsubscribes/, /worded toggle/] },
    { case: "one tile's width is every tile's width", affordance: AFFORDANCE_DRAG_RESIZE, says: [/grid track/, /reflows every sibling/] },
    { case: "it never started this PTY", affordance: AFFORDANCE_RESTART, says: [/cannot re-spawn another machine's PTY/] },
    { case: "the session already exists elsewhere", affordance: AFFORDANCE_PROVIDER_PICKER, says: [/nothing to pick/, /on another machine/] },
    { case: "the overlay owns its own door", affordance: AFFORDANCE_EXIT_FULLSCREEN, says: [/only the fullscreen host offers its own exit/] },
  ].map((row) => ({
    name: `49/03 task00 — an affordance declared OFF carries no form, no cost, and a reason a reviewer can read — ${row.case}`,
    run: async () => {
      const entry = GRID()[row.affordance];
      assert.equal(entry.declared, false, "declared OFF");
      assert.equal(declaresAffordance(HOST_GRID_PANE, row.affordance), false, "…and `declaresAffordance` agrees");
      assert.equal(entry.form, null, "no form");
      assert.equal(entry.cost, null, "…and no cost");
      assert.ok(typeof entry.reason === "string" && entry.reason.length > 20, "…and a non-empty reason: the `notDeclared` discipline is what lets a reviewer tell a ruling from a forgotten line");
      for (const says of row.says) assert.match(entry.reason, says, `…and it says, in substance: ${says}`);
    },
  })),

  // ══ Scenario: the verdicts coincide with the fleet card's and the reasons are this host's own
  {
    name: "49/03 task00 — the verdicts coincide with the fleet card's and the reasons are this host's own",
    run: async () => {
      for (const name of AFFORDANCES) {
        assert.equal(
          declaresAffordance(HOST_GRID_PANE, name),
          declaresAffordance(HOST_FLEET_CARD, name),
          `${name}: the same verdict for both hosts — ADR-007's coincidence, PINNED so a future divergence is deliberate rather than accidental`,
        );
      }
      assert.notDeepEqual(GRID(), CARD(), "…and the two tables are NOT deep-equal: a table byte-identical throughout would be evidence the fourth host was COPIED rather than decided");

      assert.match(CARD()[AFFORDANCE_DRAG_RESIZE].reason, /192px/, "the fleet card's `drag-resize` reason names the panel's constant height");
      assert.ok(!/192px/.test(GRID()[AFFORDANCE_DRAG_RESIZE].reason), "…and the grid pane's does NOT — that number is false about a tile");
      assert.match(GRID()[AFFORDANCE_DRAG_RESIZE].reason, /grid track/, "…it names the grid track instead");
      assert.notEqual(GRID()[AFFORDANCE_COLLAPSE].reason, CARD()[AFFORDANCE_COLLAPSE].reason, "…and the `collapse` reasons are not byte-identical either");

      // Two of the six ARE carried over verbatim by DESIGN, and that is fine: the ones that must
      // differ are the ones whose substance differs.
      for (const name of [AFFORDANCE_RESTART, AFFORDANCE_PROVIDER_PICKER]) {
        assert.equal(GRID()[name].reason, CARD()[name].reason, `${name}: verbatim from the fleet card, and doubly true here`);
      }
    },
  },

  // ══ Scenario: the shipped form/cost detector reports nothing against the delivered table
  {
    name: "49/03 task00 — the shipped form/cost detector reports nothing against the delivered table, through BOTH doors, for every one of the four hosts",
    run: async () => {
      assert.deepEqual(affordanceFormViolations(HOST_GRID_PANE), [], "by host NAME — the door the component reads");
      assert.deepEqual(affordanceFormViolations(GRID()), [], "…and by TABLE — the door a test reads");
      for (const host of TERMINAL_HOSTS) {
        assert.deepEqual(affordanceFormViolations(host), [], `${host}: a chevron means layout-only; a worded toggle means subscribe/unsubscribe`);
      }

      let checked = 0;
      for (const name of AFFORDANCES) {
        const entry = GRID()[name];
        if (entry.declared !== true) continue;
        for (const engaged of [false, true]) {
          const kind = changeForAffordance(name, engaged);
          assert.ok(kind != null, `${name}: a declared affordance dispatches a NAMED change`);
          assert.equal(CHANGE_CATALOGUE[kind].cost, entry.cost, `${name} (${engaged ? "engaged" : "idle"}): the declared cost IS the dispatched change's cost`);
          checked += 1;
        }
      }
      assert.equal(checked, 4, `non-vacuous, as a NUMBER rather than a claim: ${checked} affordance/side pairs on this host`);
    },
  },

  // ══ Scenario Outline: a planted declaration on this host trips the SHIPPED detector. 6 rows.
  ...[
    {
      case: "DG-49-9's ✕ — an icon that quietly unsubscribes",
      affordance: AFFORDANCE_CLOSE,
      plant: (table) => {
        table[AFFORDANCE_CLOSE] = { declared: true, form: FORM_ICON_CONTROL, cost: COST_SUBSCRIPTION, glyph: "✕" };
      },
      clause: /declares cost subscription but dispatches `close`, which costs session/,
      why: "clause 3 — it declares `subscription` but dispatches `close`, which the catalogue prices at `session`. Clauses 1 and 2 are BLIND to it: an `✕` is an icon-control, not a chevron and not a worded toggle.",
    },
    {
      case: "the chevron that takes the stream away",
      affordance: AFFORDANCE_WATCH_HIDE,
      plant: (table) => {
        table[AFFORDANCE_WATCH_HIDE] = { declared: true, form: FORM_CHEVRON, cost: COST_SUBSCRIPTION };
      },
      clause: /a chevron means LAYOUT ONLY/,
      why: "clause 1 — a chevron means LAYOUT ONLY",
    },
    {
      case: "the worded toggle that merely tidies",
      affordance: AFFORDANCE_WATCH_HIDE,
      plant: (table) => {
        table[AFFORDANCE_WATCH_HIDE] = { declared: true, form: FORM_WORDED_TOGGLE, cost: COST_LAYOUT };
      },
      clause: /a worded subscribe\/unsubscribe toggle may not cost merely layout/,
      why: "clause 2",
    },
    {
      case: "a chevron that ends the session",
      affordance: AFFORDANCE_COLLAPSE,
      plant: (table) => {
        table[AFFORDANCE_COLLAPSE] = { declared: true, form: FORM_CHEVRON, cost: COST_SESSION };
      },
      clause: /a chevron means LAYOUT ONLY/,
      why: "clause 1",
    },
    {
      case: "expand that secretly re-dials",
      affordance: AFFORDANCE_FULLSCREEN,
      plant: (table) => {
        table[AFFORDANCE_FULLSCREEN] = { declared: true, form: FORM_ICON_CONTROL, cost: COST_SUBSCRIPTION };
      },
      clause: /dispatches `present-fullscreen`, which costs layout/,
      why: "clause 3 — `present-fullscreen` costs `layout`",
    },
    {
      case: "a NINTH affordance smuggled in",
      affordance: "pin-pane",
      plant: (table) => {
        table["pin-pane"] = { declared: true, form: FORM_WORDED_TOGGLE, cost: COST_LAYOUT };
      },
      clause: /a worded subscribe\/unsubscribe toggle may not cost merely layout/,
      why: "clause 2, reached because the detector loops the table's OWN keys rather than the eight this module names",
    },
  ].map((row) => ({
    name: `49/03 task00 — a planted declaration on this host trips the SHIPPED detector — ${row.case}`,
    run: async () => {
      const clean = GRID();
      assert.deepEqual(affordanceFormViolations(clean), [], "precondition: the delivered table is the clean baseline, with zero violations");

      const planted = copyOfGrid();
      row.plant(planted);
      assert.notDeepEqual(planted, { ...clean }, "the planted table differs from the clean baseline — the plant LANDED");

      const fired = affordanceFormViolations(planted);
      assert.ok(fired.length >= 1, `the SHIPPED detector returns at least one violation (${row.why})`);
      assert.ok(fired.some((violation) => violation.startsWith(`${row.affordance}:`)), `…and the message names \`${row.affordance}\` — got ${JSON.stringify(fired)}`);
      assert.ok(fired.some((violation) => row.clause.test(violation)), `…and the violation is ${row.why}`);

      assert.deepEqual(affordanceFormViolations(GRID()), [], "…and the delivered table, in this same lane, still reports none");
    },
  })),

  // ══ Scenario: an HONEST ✕ trips nothing, and the table's own refusal is what stops it
  {
    name: "49/03 task00 — an HONEST ✕ trips nothing, and the table's own refusal is what stops it",
    run: async () => {
      const honest = copyOfGrid();
      honest[AFFORDANCE_CLOSE] = { declared: true, form: FORM_ICON_CONTROL, cost: COST_SESSION, glyph: "✕" };
      assert.deepEqual(
        affordanceFormViolations(honest),
        [],
        "ZERO violations — the declared cost and the dispatched cost agree. The form rule polices HOW an affordance is spelled, never WHETHER this host may have it.",
      );
      assert.equal(honest[AFFORDANCE_CLOSE].cost, hostAffordances(HOST_BOARD_DOCK)[AFFORDANCE_CLOSE].cost, "…it is the board dock's own honest spelling");

      const delivered = GRID()[AFFORDANCE_CLOSE];
      assert.equal(delivered.declared, false, "and the delivered grid-pane table nonetheless declares `close` OFF");
      assert.ok(typeof delivered.reason === "string" && delivered.reason.length > 20, "…with its reason");
      for (const name of AFFORDANCES) {
        if (GRID()[name].declared !== true) continue;
        for (const engaged of [false, true]) {
          assert.notEqual(changeForAffordance(name, engaged), HOST_CHANGES.CLOSE, `${name}: no affordance the grid pane declares ON dispatches \`close\``);
        }
      }
    },
  },

  // ══ Scenario Outline: a host the model does not know declares nothing, and inherits nothing. 8 rows.
  ...[
    { case: "the constant's name used as the value", host: "home-pane" },
    { case: "camel-cased", host: "gridPane" },
    { case: "a trailing space from a template literal", host: "grid-pane " },
    { case: "the empty string", host: "" },
    { case: "nothing passed", host: undefined },
    { case: "an explicit null", host: null },
    { case: "a number", host: 42 },
    { case: "an object where a name was expected", host: {} },
  ].map((row) => ({
    name: `49/03 task00 — a host the model does not know declares nothing, and inherits nothing — ${row.case}`,
    run: async () => {
      const table = hostAffordances(row.host);
      for (const name of AFFORDANCES) {
        assert.equal(table[name]?.declared, false, `${name}: declared OFF`);
        assert.equal(table[name].form, null, "…no form");
        assert.equal(table[name].cost, null, "…no cost");
        assert.match(table[name].reason, /unrecognised host/, "…and the reason says `unrecognised host`, so the absence is legible");
        assert.equal(declaresAffordance(row.host, name), false, "…and the predicate agrees");
      }
      for (const known of TERMINAL_HOSTS) {
        assert.notDeepEqual(table, hostAffordances(known), `…and it is NOT deep-equal to ${known}'s table — nothing falls open to a neighbour's controls`);
      }
      assert.deepEqual(affordanceFormViolations(row.host), [], "…and a table of pure absences violates nothing");

      // NON-VACUITY: each of the four known hosts declares at least one affordance, so "declares
      // nothing" is a discrimination rather than what this function always answers.
      for (const known of TERMINAL_HOSTS) {
        assert.ok(AFFORDANCES.some((name) => declaresAffordance(known, name)), `${known} declares at least one control`);
      }
    },
  })),

  // ══ Scenario Outline: changing the posture costs the SESSION. 5 rows.
  ...[
    { case: "opening the pane fullscreen", change: HOST_CHANGES.PRESENT_FULLSCREEN, cost: COST_LAYOUT, verdict: "survives", scrollback: "intact", identity: "same" },
    { case: "returning it home", change: HOST_CHANGES.DISMISS_FULLSCREEN, cost: COST_LAYOUT, verdict: "survives", scrollback: "intact", identity: "same" },
    { case: "the host re-renders on a poll", change: HOST_CHANGES.HOST_RERENDER, cost: COST_LAYOUT, verdict: "survives", scrollback: "intact", identity: "same" },
    { case: "the operator stops watching", change: HOST_CHANGES.HIDE, cost: COST_SUBSCRIPTION, verdict: "tears-down", scrollback: "gone", identity: "null" },
    {
      case: "flipping the posture on expand",
      change: { kind: HOST_CHANGES.SET_POSTURE, posture: POSTURE_READ_ONLY },
      cost: COST_SESSION,
      verdict: "tears-down",
      scrollback: "gone",
      identity: "different",
    },
  ].map((row) => ({
    name: `49/03 task00 — changing the posture costs the SESSION, so the tile and its expanded twin must share one — ${row.case}`,
    run: async () => {
      const outcome = changeOutcome(boundState(), row.change);
      assert.equal(outcome.cost, row.cost, "the catalogue's cost");
      assert.equal(outcome.verdict, row.verdict, "…the session's verdict");
      assert.equal(outcome.scrollback, row.scrollback, "…and what happened to the scrollback");
      assert.ok(outcome.identityBefore != null, "precondition: there was a session before");
      if (row.identity === "same") assert.equal(outcome.identityAfter, outcome.identityBefore, "the session identity is identical to before");
      if (row.identity === "null") assert.equal(outcome.identityAfter, null, "…there is no session after");
      if (row.identity === "different") {
        assert.ok(outcome.identityAfter != null && outcome.identityAfter !== outcome.identityBefore, "…it is a DIFFERENT session: the xterm is rebuilt and the socket reopens");
      }
      if (row.change === HOST_CHANGES.PRESENT_FULLSCREEN) {
        assert.equal(
          CHANGE_CATALOGUE[HOST_CHANGES.SET_POSTURE].why,
          "stdin is fixed at xterm construction — UNREACHABLE in m46, named so m49 does not discover it",
          "the catalogue's own `why` still names this milestone — the naming worked, and DG-49-5 is what it bought",
        );
      }
    },
  })),

  // ══ Scenario: no host can reach SET_POSTURE
  {
    name: "49/03 task00 — no host can reach SET_POSTURE, and the posture is part of what makes a session a session",
    run: async () => {
      let pairs = 0;
      for (const host of TERMINAL_HOSTS) {
        for (const name of AFFORDANCES) {
          if (hostAffordances(host)[name].declared !== true) continue;
          for (const engaged of [false, true]) {
            assert.notEqual(changeForAffordance(name, engaged), HOST_CHANGES.SET_POSTURE, `${host}/${name}: no affordance dispatches \`set-posture\``);
            pairs += 1;
          }
        }
      }
      assert.ok(pairs >= 20, `non-vacuous: ${pairs} host/affordance/side triples checked across all four hosts`);
      assert.ok(SESSION_IDENTITY_FIELDS.includes("posture"), "`posture` is part of the session's IDENTITY — which is WHY a posture change is a new session rather than a restyle");
      assert.ok(NON_IDENTITY_FIELDS.includes("collapsed"), "…while `collapsed` is not");
      assert.ok(NON_IDENTITY_FIELDS.includes("expanded"), "…and neither is `expanded`: a layout fact is still not identity");
    },
  },

  // ══ ADR-007 AMENDMENT (A) — the SECOND declaration beyond the eight (this story declares it;
  //    story 05 observes it). Not in the task's Examples because it is not an affordance: it is
  //    the byte area's PRESENCE, which the control used to decide with `{subscribed ? … : null}`.
  {
    name: "49/03 task00 — the fourth host also declares whether it shows a byte-area BOX when nothing is bound, valued from the ramp's own PANE_* set plus an explicit `no pane`",
    run: async () => {
      assert.equal(hostRestPane(HOST_GRID_PANE), PANE_EMPTY_HOST, "the grid pane shows a BOX with one centred line — a uniform grid must not have holes (DG-49-4), and it is where the held tile and the never-fed pane render their line");
      assert.equal(hostRestPane(HOST_BOARD_DOCK), PANE_EMPTY_HOST, "the dock keeps m46's behaviour: open, nothing bound, one line");
      assert.equal(hostRestPane(HOST_FULLSCREEN), PANE_EMPTY_HOST, "the overlay is the whole viewport; an occupant with nothing bound must still be a box");
      assert.equal(
        hostRestPane(HOST_FLEET_CARD),
        REST_PANE_NONE,
        "AND THE FLEET CARD DECLARES NO PANE — m46's deliberately header-only rest state, preserved byte-for-byte. An unconditional byte area would have given it one it does not want, which is why this is a host DECLARATION rather than a `subscribed` test.",
      );
      for (const unknown of ["home-pane", "", null, undefined, 42, {}]) {
        assert.equal(hostRestPane(unknown), REST_PANE_NONE, `${JSON.stringify(unknown)}: an unrecognised host renders no box rather than inventing one — the same fail-closed reading as the affordance table`);
      }
      assert.ok([PANE_EMPTY_HOST, REST_PANE_NONE].includes(hostRestPane(HOST_GRID_PANE)), "the value comes from the ramp's existing closed set plus `no pane`; the home invents no treatment");
    },
  },

  // ══ ADR-007 AMENDMENT (B) — the presentation seam is a FORM, not a prop.
  {
    name: "49/03 task00 — the grid pane's `fullscreen` carries the pane-activation FORM beside its icon control, and no other host does",
    run: async () => {
      assert.equal(FORM_PANE_ACTIVATION, "pane-activation", "a new VALUE in the existing closed form vocabulary");
      const entry = GRID()[AFFORDANCE_FULLSCREEN];
      assert.equal(entry.form, FORM_ICON_CONTROL, "the icon control STAYS — it is the discoverable affordance, and m46's rule that a visible control implies this surface can act is not relaxed by adding a second way in");
      assert.equal(entry.activation, FORM_PANE_ACTIVATION, "…and the tile's own pane region activates it too: `Enter`/`Space` on the tile, a click into the byte area (DG-49-5 rule 3)");
      assert.equal(entry.cost, COST_LAYOUT, "…at layout cost, which is what makes it safe: the live node is ADOPTED, nothing is rebuilt");
      assert.equal(CHANGE_CATALOGUE[changeForAffordance(AFFORDANCE_FULLSCREEN, false)].cost, COST_LAYOUT, "…and the shipped cost clause polices the pairing on arrival, by a detector that already exists");

      // PER-HOST FOR A MEASURED REASON: on the DOCK a byte-area click must focus xterm to TYPE,
      // and converting that into a present would take typing away from the surface m42
      // deliberately made typeable.
      for (const host of [HOST_BOARD_DOCK, HOST_FLEET_CARD, HOST_FULLSCREEN]) {
        for (const name of AFFORDANCES) {
          assert.equal(hostAffordances(host)[name].activation, undefined, `${host}/${name}: no pane-activation form — it is the grid tile's alone`);
        }
      }
    },
  },

  // ══ THE TENTH OBLIGATION (49/03, architect's review) — the form vocabulary is CLOSED IN FACT.
  //    `AFFORDANCE_FORMS` shipped as a list nothing read: `affordanceFormViolations` keyed on
  //    `FORM_CHEVRON`/`FORM_WORDED_TOGGLE` and on declared-vs-dispatched cost, so a host could
  //    invent a form and the detector said nothing — while ADR-007 AMENDMENT (B) rests its whole
  //    "no prop, no new mechanism" argument on the sixth form being policed by a detector that
  //    already exists. Now it is, and the seventh is policed the same way on arrival.
  {
    name: "49/03 task00 — the form vocabulary is CLOSED IN FACT: the SHIPPED detector fires on an invented `form` and on an invented `activation`, and every form the four delivered tables declare is a member of `AFFORDANCE_FORMS`",
    run: async () => {
      assert.ok(AFFORDANCE_FORMS.includes(FORM_PANE_ACTIVATION), "the sixth form is a member of the list");
      assert.equal(AFFORDANCE_FORMS.length, 6, "…and the list is exactly six: chevron, worded-toggle, icon-control, separator, segmented, pane-activation");
      assert.ok(Object.isFrozen(AFFORDANCE_FORMS), "…frozen, so the vocabulary cannot be pushed onto at runtime");

      // THE DELIVERED TREE IS CLEAN, through both doors.
      for (const host of TERMINAL_HOSTS) {
        assert.deepEqual(affordanceFormViolations(host), [], `${host}: every declared form is a member`);
        for (const name of AFFORDANCES) {
          const entry = hostAffordances(host)[name];
          if (entry.declared !== true) continue;
          assert.ok(AFFORDANCE_FORMS.includes(entry.form), `${host}/${name}: \`${entry.form}\` is in the vocabulary`);
          if (entry.activation !== undefined) assert.ok(AFFORDANCE_FORMS.includes(entry.activation), `${host}/${name}: \`${entry.activation}\` is too`);
        }
      }

      // …AND IT GENUINELY FIRES. The exact table the review measured returning ZERO violations.
      const invented = copyOfGrid();
      invented[AFFORDANCE_FULLSCREEN] = { declared: true, form: "double-click", cost: COST_LAYOUT, activation: "hold-meta" };
      assert.notDeepEqual(invented, { ...GRID() }, "the plant LANDED");
      const fired = affordanceFormViolations(invented);
      assert.ok(fired.some((violation) => /declares the form `double-click`/.test(violation)), `an invented FORM is reported — got ${JSON.stringify(fired)}`);
      assert.ok(fired.some((violation) => /declares the activation `hold-meta`/.test(violation)), "…and an invented ACTIVATION beside it, independently");
      assert.ok(fired.every((violation) => violation.startsWith(`${AFFORDANCE_FULLSCREEN}:`)), "…both naming the affordance");

      // ONE AT A TIME, so neither clause is riding on the other.
      const formOnly = copyOfGrid();
      formOnly[AFFORDANCE_WATCH_HIDE] = { declared: true, form: "swipe", cost: COST_SUBSCRIPTION, onLabel: HIDE_LABEL, offLabel: WATCH_LABEL };
      assert.ok(affordanceFormViolations(formOnly).some((violation) => /declares the form `swipe`/.test(violation)), "an invented form alone fires");
      const activationOnly = copyOfGrid();
      activationOnly[AFFORDANCE_FULLSCREEN] = { declared: true, form: FORM_ICON_CONTROL, cost: COST_LAYOUT, activation: "long-press" };
      assert.ok(affordanceFormViolations(activationOnly).some((violation) => /declares the activation `long-press`/.test(violation)), "…and an invented activation alone fires");

      // …and the delivered table, in this same lane, still reports none — so "fires" is a
      // discrimination rather than a constant.
      assert.deepEqual(affordanceFormViolations(GRID()), [], "the delivered grid-pane table stays quiet");
      assert.deepEqual(
        affordanceFormViolations({ [AFFORDANCE_FULLSCREEN]: { declared: false, form: null, cost: null, reason: "…" } }),
        [],
        "…and an UNDECLARED entry's `form: null` is not an invented form: absence stays a legitimate answer, or `notDeclared` becomes unsayable",
      );
    },
  },
];
