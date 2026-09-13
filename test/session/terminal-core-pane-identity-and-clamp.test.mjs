// Traceability wiring for milestone 46 / story 03 — the two capabilities the shared core was
// missing, both raised at the architect's review of this story and both ruled to belong HERE:
//
//   · PER-PANE IDENTITY (`ui/src/terminal/pane-identity.mjs`) — the multiplex key and
//     m38/ADR-014 invariant 4's V1 rule, "a terminal with no visible owner is never rendered".
//     Its predecessor carried V1 STRUCTURALLY, by returning `null` instead of a header model,
//     and 46/04 deletes that file wholesale. Without a home here the rule would survive only
//     as a comment. The generic half is the core's (a key over the descriptor's own declared
//     params); the fleet-DOMAIN half — resolving an assignment row, and the assignment-derived
//     wording — stays with the fleet and is 46/04's to author.
//   · THE DRAG CLAMP (`ui/src/terminal/clamp.mjs`) — ADR-009's clause that the clamp moves off
//     the viewport and onto the published chrome height, and ADR-001's rule that it may not
//     live in the `.tsx`. 46/04's `04_the-two-terminals-agree.feature` asserts the clamped
//     default `min(280, floor(box/2))` against the shell content box, with the 760x520 desktop
//     window named as THE HIGHEST-RISK CELL. This suite is the value half of that assertion.
//
// THE CHANNEL: `node:test` importing both modules under plain `node` and asserting on RETURNED
// VALUES. No bundler, no DOM, no viewport global, no source read.
import assert from "node:assert/strict";
import {
  NOT_RENDERED,
  terminalPaneKey,
  terminalPaneIdentity,
} from "../../ui/src/terminal/pane-identity.mjs";
import {
  DOCK_MIN_HEIGHT,
  DOCK_DEFAULT_HEIGHT,
  dockHeightBounds,
  clampDockHeight,
  dockDefaultHeight,
} from "../../ui/src/terminal/clamp.mjs";
import { describeTerminalState, TERMINAL_STATES, terminalStateUnavailable, UNAVAILABLE_CAUSES } from "../../ui/src/terminal/state-ramp.mjs";
import { sessionSourceFor, SESSION_SOURCES } from "../../ui/src/terminal/source-table.mjs";

const LOCAL_PTY = sessionSourceFor("local-pty").source;
const MIRROR = sessionSourceFor("mirror").source;

export const terminalCorePaneIdentityAndClampTests = [
  // ======================================================================
  // The multiplex key — generic over the descriptor's declared params.
  // ======================================================================
  {
    name: "terminal-core/identity the pane key is built from the SOURCE's own declared params, so a third source needs no edit here",
    run() {
      // The key names the kind and every declared param, in declaration order.
      assert.equal(terminalPaneKey(MIRROR, { nodeId: "aof-wsl", sessionId: "7f3a" }), "mirror::aof-wsl::7f3a");
      assert.equal(terminalPaneKey(LOCAL_PTY, { ref: "46/03", provider: "claude" }), "local-pty::46%2F03::claude");

      // It is TOTAL over the frozen table — every entry yields a key when addressed.
      for (const source of SESSION_SOURCES) {
        const params = Object.fromEntries(source.params.map((name) => [name, `value-${name}`]));
        assert.equal(typeof terminalPaneKey(source, params), "string", `${source.kind} is keyable`);
      }

      // And it keys on the FIELDS, not the kind string's meaning: a disguised descriptor keys
      // by its new kind and its own params, with nothing else changing.
      const disguised = { ...MIRROR, kind: "some-future-source" };
      assert.equal(terminalPaneKey(disguised, { nodeId: "aof-wsl", sessionId: "7f3a" }), "some-future-source::aof-wsl::7f3a");
    },
  },

  {
    name: "terminal-core/identity two panes on the SAME node with different sessions get DIFFERENT keys, and a half-tuple gets no key at all",
    run() {
      // V8, preserved verbatim through the move: two cards can never cross-wire.
      const one = terminalPaneKey(MIRROR, { nodeId: "aof-wsl", sessionId: "7f3a" });
      const two = terminalPaneKey(MIRROR, { nodeId: "aof-wsl", sessionId: "9c11" });
      assert.notEqual(one, two, "same node, different sessions → different keys");
      assert.equal(terminalPaneKey(MIRROR, { nodeId: "aof-wsl", sessionId: "7f3a" }), one, "…and the key is stable");

      // A missing half yields NO key — never an accidental `aof-wsl::undefined` that would
      // match a real subscription and bleed another session's bytes into this pane.
      for (const params of [
        { nodeId: "aof-wsl" },
        { sessionId: "7f3a" },
        { nodeId: "aof-wsl", sessionId: "" },
        { nodeId: "", sessionId: "7f3a" },
        { nodeId: "aof-wsl", sessionId: null },
        { nodeId: "aof-wsl", sessionId: 7 },
        {},
        undefined,
      ]) {
        const key = terminalPaneKey(MIRROR, params);
        assert.equal(key, null, `${JSON.stringify(params) ?? "(absent)"} yields no key`);
      }
      assert.equal(terminalPaneKey(null, { nodeId: "a", sessionId: "b" }), null, "no source, no key");

      // A value carrying the separator cannot forge another pane's key.
      const forged = terminalPaneKey(MIRROR, { nodeId: "aof-wsl::7f3a", sessionId: "x" });
      const real = terminalPaneKey(MIRROR, { nodeId: "aof-wsl", sessionId: "7f3a" });
      assert.notEqual(forged, `${real}::x`, "a value containing the separator is encoded, not concatenated");
      assert.ok(!forged.includes("aof-wsl::7f3a"), `the separator is escaped inside a value: ${forged}`);
    },
  },

  // ======================================================================
  // V1 — a terminal with no visible owner is never rendered.
  // ======================================================================
  {
    name: "terminal-core/identity a pane with no nameable owner is NOT RENDERED, structurally — not rendered quietly, not rendered with a bare id",
    run() {
      const params = { nodeId: "aof-wsl", sessionId: "7f3a" };

      // Rendered: an addressed pane whose owner is named.
      const identity = terminalPaneIdentity({ source: MIRROR, params, ref: "46/03", farEnd: "aof-wsl" });
      assert.equal(identity.rendered, true);
      assert.equal(identity.ref, "46/03");
      assert.equal(identity.label, "46/03 → aof-wsl", "the identity line names the owner and the far end");
      assert.equal(identity.key, "mirror::aof-wsl::7f3a");
      assert.deepEqual(identity.address.map(([name]) => name), ["nodeId", "sessionId"], "the address is data, so a caller can render a tail without this module owning that sentence");

      // NOT rendered, each with its cause named.
      assert.deepEqual(
        { ...terminalPaneIdentity({ source: MIRROR, params }) },
        { rendered: false, reason: NOT_RENDERED.NO_OWNER, key: null, ref: null, label: null },
        "no owner → nothing is rendered, and no key is handed out either",
      );
      assert.equal(terminalPaneIdentity({ source: MIRROR, params, ref: "" }).reason, NOT_RENDERED.NO_OWNER);
      assert.equal(terminalPaneIdentity({ source: MIRROR, params, ref: 46 }).reason, NOT_RENDERED.NO_OWNER, "an owner that is not a string is not an owner");
      assert.equal(terminalPaneIdentity({ source: MIRROR, params: { nodeId: "aof-wsl" }, ref: "46/03" }).reason, NOT_RENDERED.UNADDRESSED, "a half-tuple is unaddressed");
      assert.equal(terminalPaneIdentity({ ref: "46/03" }).reason, NOT_RENDERED.NO_SOURCE);
      assert.equal(terminalPaneIdentity().reason, NOT_RENDERED.NO_SOURCE);

      // And nothing partial leaks out of a refusal — no key, no ref, no label to render.
      for (const refused of [
        terminalPaneIdentity({ source: MIRROR, params }),
        terminalPaneIdentity({ source: MIRROR, params: {}, ref: "46/03" }),
        terminalPaneIdentity(),
      ]) {
        assert.equal(refused.rendered, false);
        assert.equal(refused.key, null);
        assert.equal(refused.label, null);
        assert.ok(!JSON.stringify(refused).includes("7f3a"), "a refusal borrows no value it does have");
      }

      // A source whose far end IS its own origin needs no far-end name.
      const local = terminalPaneIdentity({ source: LOCAL_PTY, params: { ref: "46/03", provider: "claude" }, ref: "46/03" });
      assert.equal(local.rendered, true);
      assert.equal(local.label, "46/03", "no far end named, so the label is the owner alone");
      assert.equal(local.farEnd, null);
    },
  },

  {
    name: "terminal-core/identity the state descriptor can express a HEADERLESS render, and an unavailable pane still renders its header in full",
    run() {
      // The gap this closes: the descriptor used to answer `rendersHeader: true`
      // unconditionally, so it could not express V1's "render nothing" at all.
      const nameless = describeTerminalState(TERMINAL_STATES.STREAMING);
      assert.equal(nameless.rendersPane, false, "a pane nothing can name is not a quieter pane; it is no pane");
      assert.equal(nameless.rendersHeader, false);
      assert.equal(nameless.owner, null);

      const named = describeTerminalState(TERMINAL_STATES.STREAMING, { owner: "46/03 → aof-wsl" });
      assert.equal(named.rendersPane, true);
      assert.equal(named.rendersHeader, true);
      assert.equal(named.owner, "46/03 → aof-wsl");

      // DESIGN §The unavailable pane: an unavailable pane still HAS an owner, and its header
      // renders IN FULL — "a pane that goes blank including its header is the failure mode this
      // state exists to prevent". Both halves now come off one derivation.
      const unavailable = describeTerminalState(
        terminalStateUnavailable({ cause: UNAVAILABLE_CAUSES.ORIGIN_UNREACHABLE }),
        { owner: "46/03 → aof-wsl" },
      );
      assert.equal(unavailable.rendersHeader, true);
      assert.equal(unavailable.rendersPane, true);
      assert.equal(unavailable.text, "unavailable");
      assert.equal(unavailable.cause, "board unreachable");

      // An empty owner is not an owner.
      assert.equal(describeTerminalState(TERMINAL_STATES.WAITING, { owner: "" }).rendersHeader, false);
      assert.equal(describeTerminalState(TERMINAL_STATES.WAITING, { owner: 46 }).rendersHeader, false);

      // The identity model and the descriptor agree — a caller feeds one into the other.
      const identity = terminalPaneIdentity({ source: MIRROR, params: { nodeId: "aof-wsl", sessionId: "7f3a" }, ref: "46/03", farEnd: "aof-wsl" });
      assert.equal(describeTerminalState(TERMINAL_STATES.STREAMING, { owner: identity.label }).rendersHeader, identity.rendered);
      const refused = terminalPaneIdentity({ source: MIRROR, params: { nodeId: "aof-wsl" }, ref: "46/03" });
      assert.equal(describeTerminalState(TERMINAL_STATES.STREAMING, { owner: refused.label }).rendersHeader, refused.rendered);
    },
  },

  // ======================================================================
  // The drag clamp — 46/04's `min(280, floor(box/2))`, as values.
  // ======================================================================
  ...[
    { case: "the primary judgement width — the content box is roomy, so the shipped default stands", box: 712, max: 356, defaultHeight: 280 },
    { case: "THE HIGHEST-RISK CELL: the 760x520 desktop window", box: 432, max: 216, defaultHeight: 216 },
    { case: "exactly the boundary — the box at which 280 is still reachable", box: 560, max: 280, defaultHeight: 280 },
    { case: "one pixel under the boundary", box: 559, max: 279, defaultHeight: 279 },
    { case: "an odd box floors rather than rounds up", box: 433, max: 216, defaultHeight: 216 },
    // RE-RULED AT 46/05 (PO ruling, 2026-08-08, on QA finding 3 — and the row that raised it is
    // `05/tasks/01`'s "a box too small to hold the minimum"). DESIGN §S1 gives `min 48` and
    // `max floor(box/2)` and does not say which wins when `min > max`; the two compositions give
    // different answers, and ONLY `min(max(x, 48), ceiling)` honours DG-46-1. The other one
    // returns 48 in a 60px box and puts the dock's own drag handle and header ABOVE the content
    // region — covering the very content the published inset exists to protect. So: THE CEILING
    // WINS, and the floor is `min(48, ceiling)`.
    { case: "a box so short the ceiling BEATS the floor", box: 60, max: 30, defaultHeight: 30 },
  ].map((row) => ({
    name: `terminal-core/clamp a ${row.box}px content box gives max ${row.max} and a clamped default of ${row.defaultHeight} (${row.case})`,
    run() {
      const bounds = dockHeightBounds(row.box);
      assert.equal(bounds.measured, true);
      assert.equal(bounds.contentRegionHeight, row.box);
      assert.equal(bounds.min, Math.min(DOCK_MIN_HEIGHT, row.max), "the floor yields to the ceiling when the box cannot hold it");
      assert.equal(bounds.max, row.max, "the ceiling is half the CONTENT box, floored — not half the viewport");
      assert.equal(bounds.defaultHeight, row.defaultHeight);
      assert.equal(dockDefaultHeight(row.box), row.defaultHeight);

      // THE BUG THIS FIXES: the default must never exceed a height the operator is not allowed
      // to drag the dock to.
      assert.ok(bounds.defaultHeight <= bounds.max, `the default (${bounds.defaultHeight}) is reachable by dragging (max ${bounds.max})`);
      assert.equal(bounds.defaultHeight, Math.min(DOCK_DEFAULT_HEIGHT, bounds.max), "the default is `min(280, floor(box/2))`");

      // And the clamp agrees with its own bounds in both directions.
      assert.equal(clampDockHeight(10_000, row.box), row.max, "a drag past the ceiling stops at the ceiling");
      assert.equal(clampDockHeight(0, row.box), bounds.min, "a drag below the floor stops at the floor");
      assert.equal(clampDockHeight(row.max, row.box), row.max, "the ceiling itself is reachable");
      assert.equal(clampDockHeight(bounds.min, row.box), bounds.min, "…and so is the floor");
    },
  })),

  {
    name: "terminal-core/clamp the clamp reads no viewport global — it is a pure function of the content box it is handed",
    run() {
      assert.equal(typeof globalThis.window, "undefined", "the harness genuinely has no viewport global");
      const clean = dockHeightBounds(432);

      const decoy = { innerHeight: 4000, innerWidth: 4000 };
      let withDecoy;
      try {
        Object.defineProperty(globalThis, "window", { value: decoy, configurable: true, writable: true });
        withDecoy = dockHeightBounds(432);
      } finally {
        delete globalThis.window;
      }
      assert.deepEqual(withDecoy, clean, "a viewport twice the size changes nothing — the CONTENT box is the only input");
      assert.equal(withDecoy.max, 216);
    },
  },

  {
    // A MEASURED ZERO LEFT THIS LIST AT 46/05, and the distinction is a locked Examples row
    // (`05/tasks/01` scenario 4, rows 6 and 7): `760×88` with 88px of chrome IS a content box of
    // exactly 0 — a real, degenerate, KNOWN box whose ceiling is 0 — where "nobody has measured
    // yet" is not a box at all. Reading 0 as unmeasured answered the first with the UNCLAMPED
    // 280: a dock taller than a box with no room in it.
    name: "terminal-core/clamp an unmeasured content box degrades to the unclamped default and SAYS SO — never to zero, never to NaN (a MEASURED zero is a different fact; see the zero-box lane below)",
    run() {
      for (const box of [-1, NaN, Infinity, null, undefined, "", "auto", {}]) {
        const bounds = dockHeightBounds(box);
        assert.equal(bounds.measured, false, `${JSON.stringify(box) ?? "(absent)"} is not a measurement`);
        assert.equal(bounds.max, null, "…so there is no ceiling to report");
        assert.equal(bounds.defaultHeight, DOCK_DEFAULT_HEIGHT, "…and the default is the unclamped one");
        assert.equal(bounds.contentRegionHeight, null);
        // The value a caller would render is a real height, never 0 and never NaN.
        assert.ok(Number.isFinite(bounds.defaultHeight) && bounds.defaultHeight > 0);
        assert.ok(Number.isFinite(clampDockHeight(300, box)));
        assert.equal(clampDockHeight(300, box), 300, "an unmeasured box clamps nothing — it does not clamp to zero");
        assert.equal(clampDockHeight(10, box), DOCK_MIN_HEIGHT, "…but the floor still holds, because it does not depend on the box");
      }

      // AND THE GUARD IS NOT STICKY: the very next measured tick returns the real ceiling.
      assert.equal(dockHeightBounds(null).max, null);
      assert.equal(dockHeightBounds(432).max, 216);
      assert.equal(dockHeightBounds(null).max, null, "…and back again, with no memory either way");

      // THE MEASURED ZERO, stated here so the two facts sit side by side rather than one
      // swallowing the other. A box of exactly 0 has a ceiling of 0, a floor of 0 and a default
      // of 0 — nothing fits in it — and it is `measured: true`, so a caller can tell it apart
      // from a box nobody has measured.
      const zero = dockHeightBounds(0);
      assert.equal(zero.measured, true, "zero is a MEASUREMENT, not an absence");
      assert.deepEqual({ min: zero.min, max: zero.max, defaultHeight: zero.defaultHeight }, { min: 0, max: 0, defaultHeight: 0 });
      assert.equal(clampDockHeight(280, 0), 0);

      // A request that is not a number at all falls back to the box's own default rather than
      // to NaN.
      assert.equal(clampDockHeight("tall", 432), 216, "an unparseable request opens at the clamped default");
      assert.equal(clampDockHeight(undefined, 432), 216);
      assert.equal(clampDockHeight(NaN, 432), 216);
      assert.equal(clampDockHeight("300", 432), 216, "a numeric string is honoured, then clamped");
      assert.equal(clampDockHeight("200", 432), 200);
      assert.equal(clampDockHeight(200.7, 432), 200, "a fractional drag floors to whole pixels");
    },
  },
];
