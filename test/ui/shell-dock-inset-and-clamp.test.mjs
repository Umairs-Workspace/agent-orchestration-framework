// Traceability wiring for milestone 46 / story 05, task 01 —
// `stories/05_story_dock-shell-host/tasks/01_the-dock-inset-is-published-and-the-content-box-honours-it.feature`
// (@executable).
//
// WHY THIS TASK EXISTS (DG-46-1). Task 00 moved the dock out of flow, and the overlay region
// contributes zero to the height of anything — so without this task an open dock at its default
// 280px covers the bottom 280px of the detail panel, which is exactly where its action strip
// lives. **An extraction that takes the operator's buttons away is not an extraction.**
//
// THE CHANNEL: every Then below is a returned VALUE from a framework-free `.mjs` loaded under
// plain `node` — `ui/src/app/shell-layout.mjs` (the published names, the chrome model, the content
// modes) and `ui/src/terminal/clamp.mjs`, which per ADR-001 touches no `window` and RECEIVES its
// box. No bundler, no DOM, no browser. The arithmetic is therefore checkable to the pixel without
// rendering anything, which is the entire reason the chrome height became a published contract in
// m45 rather than a number each surface re-derived.
//
// NOT ASSERTED HERE: that the RENDERED page honours the arithmetic — whether an open dock at
// 760×520 really leaves the action strip visible. Those are pixel facts and they are task 03's
// `@uat` verdict. This is the m43/m45 split: the model half here, the pixel half there.
//
// THE DOCUMENTATION OBLIGATION THIS TASK CARRIES is a build obligation rather than a scenario:
// DG-46-1's close condition requires the inset to AMEND 45/ARCHITECTURE ADR-005 and 45/DESIGN
// DG-45-2 in the same change, because both still said an open dock OVERLAYS the content region
// and does not shrink it. Landed with this suite; a document left contradicting the shipped
// primitive is a defect, not a nuance.
//
// ISOLATION: `AOF_GLOBAL_HOME=$(mktemp -d) node --test test/<file>` — FOCUSED, never the full
// suite (`global-work-propagation.test.mjs` binds :4182, which the live control daemon holds).
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CHROME_HEIGHT_PROPERTY,
  CONTENT_FIXED_HEIGHT_CLASS,
  CONTENT_FIXED_HEIGHT_EXPRESSION,
  CONTENT_HEIGHT_EXPRESSION,
  DOCK_INSET_PROPERTY,
  chromeModel,
  contentModeFor,
} from "../../ui/src/app/shell-layout.mjs";
import {
  DOCK_DEFAULT_HEIGHT,
  DOCK_MIN_HEIGHT,
  clampDockHeight,
  dockDefaultHeight,
  dockHeightBounds,
} from "../../ui/src/terminal/clamp.mjs";

// The two viewports every row is expressed against, as the shell's own model sees them.
function published({ viewportHeight, viewportWidth, bars, rail = null, dock = null }) {
  return chromeModel({
    viewportHeight,
    viewportWidth,
    surfaceBar: bars === 2,
    notice: rail === null ? null : { height: rail },
    dock,
  });
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const shellDockInsetAndClampTests = [
  // ======================================================================
  // Scenario: the dock inset is published ONCE, under one name, in dynamic viewport units, and
  // a surface sizes itself against BOTH names
  // ======================================================================
  {
    name: "shell-dock-inset/01 the dock inset is published ONCE under ONE name, of the same species as the chrome height, and the expression a `content:fixed` surface is given subtracts BOTH names from 100dvh in `dvh` (01 scenario 1)",
    run() {
      const model = published({ viewportHeight: 800, viewportWidth: 1280, bars: 1, dock: { height: 280 } });

      // Published ONCE, under ONE name, exactly as the chrome height is.
      assert.equal(model.dockProperty, DOCK_INSET_PROPERTY);
      assert.equal(DOCK_INSET_PROPERTY, "--aof-shell-dock-inset");
      assert.equal(model.property, CHROME_HEIGHT_PROPERTY);
      assert.notEqual(model.dockProperty, model.property, "two names, not one number doing two jobs");
      assert.equal(model.dockValue, "280px", "…and it is published as a value, like the chrome height's");
      assert.equal(model.value, "48px");

      // THE SIZING EXPRESSION A `content:fixed` SURFACE IS GIVEN subtracts BOTH names.
      const fixed = contentModeFor("board");
      assert.equal(fixed.sizingExpression, CONTENT_FIXED_HEIGHT_EXPRESSION);
      assert.equal(model.contentSizingExpression, CONTENT_FIXED_HEIGHT_EXPRESSION);
      assert.ok(CONTENT_FIXED_HEIGHT_EXPRESSION.includes(CHROME_HEIGHT_PROPERTY), "it subtracts the chrome height");
      assert.ok(CONTENT_FIXED_HEIGHT_EXPRESSION.includes(DOCK_INSET_PROPERTY), "…and the dock inset");
      assert.ok(CONTENT_FIXED_HEIGHT_EXPRESSION.startsWith("calc(100dvh"), "…from 100dvh");

      // IT NAMES `dvh`, NEVER `vh` — a mobile browser's collapsing URL bar changes the viewport,
      // and a terminal sized to `vh` overflows the moment it does.
      assert.equal(model.unit, "dvh");
      for (const expression of [CONTENT_FIXED_HEIGHT_EXPRESSION, CONTENT_FIXED_HEIGHT_CLASS]) {
        assert.match(expression, /100dvh/);
        assert.equal(/\d\s*vh\b/.test(expression.replace(/dvh/g, "")), false, `\`${expression}\` names no bare vh`);
      }

      // IT IS NEVER A LITERAL 280 AND NEVER A LITERAL 0 — the published number is measured, so
      // neither constant appears in the expression a surface is handed.
      assert.equal(/\b280\b/.test(CONTENT_FIXED_HEIGHT_EXPRESSION), false, "no literal 280 in the sizing expression");
      assert.equal(/-\s*0px\s*\)/.test(CONTENT_FIXED_HEIGHT_EXPRESSION), false, "and the `0px` present is a FALLBACK, not a subtrahend");
      // …and the fallback really is a fallback: with neither property set the expression is
      // exactly `100dvh`, which is what keeps the surface correct with NO shell around it.
      assert.match(CONTENT_FIXED_HEIGHT_EXPRESSION, /var\(--aof-shell-chrome-height, 0px\)/);
      assert.match(CONTENT_FIXED_HEIGHT_EXPRESSION, /var\(--aof-shell-dock-inset, 0px\)/);

      // A SURFACE CAN DERIVE ITS AVAILABLE HEIGHT FROM THE TWO NAMES WITHOUT MEASURING THE
      // DOCUMENT: the model does exactly that, and its answer is arithmetic on the two numbers.
      assert.equal(model.contentBoxHeight, model.viewportHeight - model.height - model.dockInset);

      // EACH NAME HAS EXACTLY ONE HOME. The class the board wears is the constant, not a calc
      // retyped in a surface — a surface that re-derived either would be free to disagree with
      // the shell about where the content region ends.
      assert.equal(model.contentHeightClass, CONTENT_FIXED_HEIGHT_CLASS);
      assert.equal(fixed.heightClass, CONTENT_FIXED_HEIGHT_CLASS);
      assert.ok(CONTENT_FIXED_HEIGHT_CLASS.includes("--aof-shell-chrome-height"));
      assert.ok(CONTENT_FIXED_HEIGHT_CLASS.includes("--aof-shell-dock-inset"));
      // …AND THE TWO SPELLINGS ARE THE SAME EXPRESSION. The class exists only because Tailwind
      // scans SOURCE TEXT and cannot see a composed value, so it is a second spelling of one fact
      // — and two spellings of one fact drift. Normalised (Tailwind's `_` is the space it cannot
      // carry in a class name), they must be identical, or the CSS a surface actually gets and the
      // expression the model reports are two different sizes.
      const normalise = (expression) => expression.replace(/^h-\[/, "").replace(/\]$/, "").replace(/_/g, " ").replace(/,\s*/g, ", ");
      assert.equal(normalise(CONTENT_FIXED_HEIGHT_CLASS), normalise(CONTENT_FIXED_HEIGHT_EXPRESSION));
      // …and `content:page` keeps the ONE name it always had: a scrolling surface is not covered
      // by a dock in a way subtracting could fix.
      assert.equal(contentModeFor("fleet").sizingExpression, CONTENT_HEIGHT_EXPRESSION);
      assert.equal(contentModeFor("fleet").heightClass, null);
    },
  },

  // ======================================================================
  // Scenario Outline: an open dock costs the content region exactly its own height, and a
  // closed one costs nothing at all — the arithmetic, enumerated
  // ======================================================================
  ...[
    { case: "no dock has ever been opened", viewport: "1280x800", viewportHeight: 800, viewportWidth: 1280, bars: 1, dock: null, chrome: 48, inset: 0, box: 752 },
    { case: "the dock was closed with ✕", viewport: "1280x800", viewportHeight: 800, viewportWidth: 1280, bars: 1, dock: null, chrome: 48, inset: 0, box: 752 },
    { case: "the ordinary open dock, at its default 280", viewport: "1280x800", viewportHeight: 800, viewportWidth: 1280, bars: 1, dock: { height: 280 }, chrome: 48, inset: 280, box: 472 },
    { case: "dragged to its maximum 376", viewport: "1280x800", viewportHeight: 800, viewportWidth: 1280, bars: 1, dock: { height: 376 }, chrome: 48, inset: 376, box: 376 },
    { case: "dragged to its minimum 48", viewport: "1280x800", viewportHeight: 800, viewportWidth: 1280, bars: 1, dock: { height: 48 }, chrome: 48, inset: 48, box: 704 },
    { case: "THE DESKTOP WINDOW, open at its default 216", viewport: "760x520", viewportHeight: 520, viewportWidth: 760, bars: 2, dock: { height: 216 }, chrome: 88, inset: 216, box: 216 },
    // ROW 7 — collapsed is a STEADY STATE, not a variant, and its inset is MEASURED. The header
    // is `px-4 py-2` around an 11px line, so its height is content-driven and is an INPUT to the
    // model; 33 stands in for a measurement here exactly as the rail's height does.
    { case: "collapsed — a steady state, not a variant", viewport: "1280x800", viewportHeight: 800, viewportWidth: 1280, bars: 1, dock: { height: 33 }, chrome: 48, inset: 33, box: 719, measured: true },
    { case: "a notice standing, chrome in BREACH, dock at its maximum 199", viewport: "768x520", viewportHeight: 520, viewportWidth: 768, bars: 2, rail: 33, dock: { height: 199 }, chrome: 121, inset: 199, box: 200, breach: true },
  ].map((row) => ({
    name: `shell-dock-inset/01 ${row.viewport} · ${row.case} → chrome ${row.chrome}, inset ${row.inset}, content box ${row.box} (01 scenario 2)`,
    run() {
      const model = published(row);
      assert.equal(model.height, row.chrome, "the chrome height");
      assert.equal(model.dockInset, row.inset, "the dock inset");
      assert.equal(model.contentBoxHeight, row.box, "the content box a `content:fixed` surface sizes itself to");
      // The board's layout INSIDE that box is what it is today: the lanes and the detail panel
      // shrink and nothing is overlaid — which is the same statement as "the box is smaller by
      // exactly the dock's own height".
      assert.equal(model.contentHeight - model.dockInset, row.box, "an open dock costs the content region EXACTLY its own height");
      if (row.dock === null) {
        // A CLOSED DOCK COSTS NOTHING: no reserved band, no minimum height, no empty border. The
        // notice rail's own rule, restated because the temptation is identical.
        assert.equal(model.dockInset, 0);
        assert.equal(model.dockPresent, false);
        assert.equal(model.contentBoxHeight, model.contentHeight, "the box is exactly what it is with no dock at all");
      } else {
        assert.equal(model.dockPresent, true);
      }
      if (row.measured) {
        // MEASURED, NEVER A CONSTANT: a different measurement gives a different inset, with no
        // number of the model's own anywhere in it.
        assert.equal(published({ ...row, dock: { height: 41 } }).dockInset, 41);
        assert.equal(published({ ...row, dock: { height: 27 } }).dockInset, 27);
      }
      if (row.breach) {
        // THE COMPOSITION EDGE. m45's own budget table predicts this combination BREACHES the
        // 432px content floor (399px), and the rail is exempt and ADDITIVE. The inset composes
        // straight THROUGH the breach — the two numbers are independent, and a clamp that
        // special-cased it would be wrong in the one state the operator most needs their buttons.
        assert.equal(model.verdict, "breach");
        assert.equal(model.contentHeight, 399);
        assert.equal(model.noticeRailExempt, true);
      }
    },
  })),

  // ======================================================================
  // Scenario Outline (@bug): the drag clamp is a pure function of the CONTENT BOX, never of the
  // viewport — `TerminalDock.tsx:120` clamped to `Math.round(window.innerHeight / 2)`
  // ======================================================================
  ...[
    { case: "the primary judgement width", viewport: 800, chrome: 48, asks: 600, clamped: 376, viewportCeiling: 400, tooTallBy: 24 },
    { case: "the same width, a notice standing", viewport: 800, chrome: 81, asks: 600, clamped: 359, viewportCeiling: 400, tooTallBy: 41 },
    { case: "narrow enough for the surface bar", viewport: 800, chrome: 88, asks: 600, clamped: 356, viewportCeiling: 400, tooTallBy: 44 },
    { case: "THE DESKTOP APP'S OWN WINDOW", viewport: 520, chrome: 88, asks: 600, clamped: 216, viewportCeiling: 260, tooTallBy: 44 },
    { case: "the desktop window, a notice standing", viewport: 520, chrome: 121, asks: 600, clamped: 199, viewportCeiling: 260, tooTallBy: 61 },
    { case: "mobile", viewport: 844, chrome: 88, asks: 600, clamped: 378, viewportCeiling: 422, tooTallBy: 44 },
    { case: "a drag below the minimum", viewport: 800, chrome: 48, asks: 12, clamped: 48, viewportCeiling: 400, tooTallBy: 24 },
    { case: "a drag to exactly the ceiling", viewport: 800, chrome: 48, asks: 376, clamped: 376, viewportCeiling: 400, tooTallBy: 24 },
    { case: "a drag one pixel past it", viewport: 800, chrome: 48, asks: 377, clamped: 376, viewportCeiling: 400, tooTallBy: 24 },
    // THE LAST ROW IS THE PROOF THE FIX IS NOT A REGRESSION FOR ANYONE: with no shell the
    // published property is unset, `var(--aof-shell-chrome-height, 0px)` resolves to `0px`, the
    // content box IS the viewport, and the new clamp returns exactly what today's returns.
    { case: "NO SHELL AT ALL — the surface alone", viewport: 800, chrome: 0, asks: 600, clamped: 400, viewportCeiling: 400, tooTallBy: 0 },
  ].map((row) => ({
    name: `shell-dock-inset/01 a ${row.viewport}px viewport with ${row.chrome}px of chrome clamps a drag of ${row.asks} to ${row.clamped} — the viewport ceiling of ${row.viewportCeiling} sits ${row.tooTallBy}px past the bottom of the shell's own box (${row.case}) (01 scenario 3)`,
    run() {
      // The clamp RECEIVES its box; it reads no viewport global of its own.
      const box = row.viewport - row.chrome;
      assert.equal(clampDockHeight(row.asks, box), row.clamped);

      // THE CEILING IT CLAMPED AGAINST IS THE CONTENT BOX'S OWN, and the shipped viewport
      // ceiling is `too tall by` px past the bottom of the box the shell says it owns. That
      // column is the FINDING, not decoration: at the operator's most common window the shipped
      // clamp let the dock be dragged 44px over the board's own footer.
      const bounds = dockHeightBounds(box);
      assert.equal(bounds.max, Math.floor(box / 2), "the ceiling is half the CONTENT box, floored");
      const viewportCeiling = Math.round(row.viewport / 2);
      assert.equal(viewportCeiling, row.viewportCeiling, "today's viewport ceiling");
      assert.equal(viewportCeiling - bounds.max, row.tooTallBy, "…and how far past the box's bottom it sits");

      // THE CLAMPED HEIGHT NEVER EXCEEDS THE CONTENT BOX, so the dock's top edge is never above
      // the content region's top — it cannot slide under the chrome at any viewport.
      assert.ok(row.clamped <= box, `${row.clamped} fits inside the ${box}px content box`);
      for (const ask of [0, 1, 47, 300, 10_000, box, box * 2]) {
        assert.ok(clampDockHeight(ask, box) <= box, `a drag of ${ask} never exceeds the box`);
      }

      // AND IT IS A PURE FUNCTION OF THE BOX: a viewport global twice the size changes nothing.
      assert.equal(typeof globalThis.window, "undefined", "the harness genuinely has no viewport global");
      let withDecoy;
      try {
        Object.defineProperty(globalThis, "window", { value: { innerHeight: 4000 }, configurable: true, writable: true });
        withDecoy = clampDockHeight(row.asks, box);
      } finally {
        delete globalThis.window;
      }
      assert.equal(withDecoy, row.clamped, "the CONTENT box is the only input");
    },
  })),

  // ======================================================================
  // Scenario Outline: the default obeys the same clamp as the drag, and the minimum YIELDS to
  // the ceiling rather than the other way round
  // ======================================================================
  ...[
    { case: "the primary judgement width", viewport: 800, chrome: 48, box: 752, max: 376, min: 48, dflt: 280 },
    { case: "mobile", viewport: 844, chrome: 88, box: 756, max: 378, min: 48, dflt: 280 },
    // ROW 3 IS THE ROW THE HEIGHT RULE EXISTS FOR: `min(280, floor(432/2))` = 216, so default
    // and maximum COINCIDE at the desktop window. A reviewer seeing a 216px dock there is seeing
    // the rule work, not a truncation.
    { case: "THE DESKTOP WINDOW — the derivation", viewport: 520, chrome: 88, box: 432, max: 216, min: 48, dflt: 216 },
    { case: "the desktop window with a notice up", viewport: 520, chrome: 121, box: 399, max: 199, min: 48, dflt: 199 },
    // ROW 5 IS THE CONTESTED BOUNDARY, ruled by the PO (2026-08-08, QA finding 3): when the box
    // cannot hold `DOCK_MIN_HEIGHT` the MINIMUM yields to the ceiling. The other composition
    // returns 48 here and puts the dock's own drag handle and header above the content region —
    // the exact failure DG-46-1 exists to prevent.
    { case: "a box too small to hold the minimum — THE CEILING WINS", viewport: 120, chrome: 88, box: 32, max: 16, min: 16, dflt: 16 },
    { case: "a box of zero height", viewport: 88, chrome: 88, box: 0, max: 0, min: 0, dflt: 0 },
  ].map((row) => ({
    name: `shell-dock-inset/01 a ${row.viewport}px viewport with ${row.chrome}px of chrome gives a ${row.box}px box, a ceiling of ${row.max}, a floor of ${row.min}, and opens at ${row.dflt} (${row.case}) (01 scenario 4)`,
    run() {
      const box = row.viewport - row.chrome;
      assert.equal(box, row.box, "the content box");
      const bounds = dockHeightBounds(box);
      assert.equal(bounds.measured, true, "a measured box — including a measured ZERO");
      assert.equal(bounds.max, row.max, "the ceiling");
      assert.equal(bounds.min, row.min, "the floor");
      assert.equal(bounds.defaultHeight, row.dflt, "the dock opens at");
      assert.equal(dockDefaultHeight(box), row.dflt);

      // THE DEFAULT OBEYS THE SAME CLAMP AS THE DRAG — one rule for both is the fix. At 760×520
      // the shipped 280 EXCEEDS the maximum the operator is allowed to drag to.
      assert.equal(bounds.defaultHeight, Math.min(DOCK_DEFAULT_HEIGHT, bounds.max));
      assert.ok(bounds.defaultHeight <= bounds.max, "the default is a height the operator can drag back to");
      assert.equal(clampDockHeight(DOCK_DEFAULT_HEIGHT, box), row.dflt, "…and clamping the raw default gives the same answer");

      // THE MINIMUM YIELDS TO THE CEILING, never the other way round. Stated as the composition
      // rather than as an outcome, so the row is evidence against the wrong one.
      assert.equal(bounds.min, Math.min(DOCK_MIN_HEIGHT, bounds.max));
      assert.equal(clampDockHeight(1, box), row.min, "a drag below the floor stops at the floor…");
      assert.equal(clampDockHeight(10_000, box), row.max, "…and one past the ceiling stops at the ceiling");
      const wrongComposition = Math.max(Math.min(10_000, bounds.max), DOCK_MIN_HEIGHT);
      if (bounds.max < DOCK_MIN_HEIGHT) {
        assert.notEqual(clampDockHeight(10_000, box), wrongComposition, "the OTHER composition would return 48 here and put the handle above the content region");
      }

      // THE DOCK IS NEVER TALLER THAN ITS OWN CONTENT BOX in any of these rows.
      assert.ok(bounds.max <= box, `${bounds.max} fits inside ${box}`);
      assert.ok(bounds.defaultHeight <= box);
    },
  })),

  {
    // S3 — THE TWO BOXES ARE DIFFERENT NUMBERS, AND ONLY THIS ROW SAYS SO. Every clamp row above
    // computes its box with NO DOCK OPEN, where `contentHeight` and `contentBoxHeight` coincide —
    // so a later "tidy-up" that clamped against the surface's box instead of the content region
    // would pass all ten of them. It is a measurement LOOP, not a rounding difference: at 1280×800
    // with 48px of chrome a 280px dock gives a 472px surface box, whose half is 236 — so the
    // ceiling would fall to 236, the dock would shrink, the box would grow to 528, the ceiling
    // would rise to 264, and the dock would oscillate on every frame it was dragged.
    name: "shell-dock-inset/01 the drag clamp is half the CONTENT REGION and not half the surface's box — with a 280px dock open the ceiling is still 376, because the dock IS the inset (01 scenario 3, the two-box boundary)",
    run() {
      const viewport = { viewportHeight: 800, viewportWidth: 1280, bars: 1 };
      const open = published({ ...viewport, dock: { height: 280 } });
      assert.equal(open.contentHeight, 752, "the content REGION — what the dock is docked over");
      assert.equal(open.contentBoxHeight, 472, "…and the SURFACE's box, which the inset has shrunk");
      assert.notEqual(open.contentHeight, open.contentBoxHeight, "with a dock open these are DIFFERENT numbers");

      // The clamp is a function of the REGION, in every dock state.
      assert.equal(dockHeightBounds(open.contentHeight).max, 376, "the ceiling is half the content region");
      assert.equal(clampDockHeight(600, open.contentHeight), 376);
      // …and the number the wrong box would give, stated so the row is evidence against it.
      assert.equal(dockHeightBounds(open.contentBoxHeight).max, 236, "half the SURFACE box would be 236 — the wrong answer, and the first step of a loop");
      assert.notEqual(dockHeightBounds(open.contentBoxHeight).max, dockHeightBounds(open.contentHeight).max);

      // THE LOOP, RUN. Four iterations of "clamp against the box the last clamp produced" and the
      // ceiling never settles; against the region it is a fixed point immediately.
      let box = open.contentHeight;
      const looping = [];
      for (let step = 0; step < 4; step += 1) {
        const ceiling = dockHeightBounds(box).max;
        looping.push(ceiling);
        box = open.contentHeight - ceiling;
      }
      assert.deepEqual(looping, [376, 188, 282, 235], "clamping against a box the dock itself shrinks never settles");
      assert.equal(dockHeightBounds(open.contentHeight).max, dockHeightBounds(open.contentHeight).max, "the region is a fixed point by construction");

      // AND THE NAMES SAY WHICH IS WHICH, so the two facts cannot be confused by a reader either:
      // the clamp's own field is `contentRegionHeight`, the shell's is `contentBoxHeight`.
      assert.equal(dockHeightBounds(752).contentRegionHeight, 752);
      assert.equal(Object.hasOwn(dockHeightBounds(752), "contentBoxHeight"), false, "one word, one fact");
      assert.equal(Object.hasOwn(open, "contentBoxHeight"), true);
    },
  },

  {
    // N-1 (QA) — three mutants that survived the first cut, each now with a row of its own.
    name: "shell-dock-inset/01 the inset's three guards are asserted rather than assumed: fullscreen zeroes it, a MEASURED value is passed through unrounded-down, and the content box never goes negative (01 scenario 2, the guards)",
    run() {
      // GUARD 1 — a presented occupant covers the dock, so nothing needs an inset while it
      // stands. Removing the zeroing survived every other row because no row presented anything.
      const standing = published({ viewportHeight: 800, viewportWidth: 1280, bars: 1, dock: { height: 280 } });
      const presented = chromeModel({ viewportHeight: 800, viewportWidth: 1280, dock: { height: 280 }, fullscreen: true });
      assert.equal(standing.dockInset, 280);
      assert.equal(presented.dockInset, 0, "a fullscreen occupant covers the dock — the content region owes it nothing");
      assert.equal(presented.dockPresent, false);
      assert.equal(presented.contentBoxHeight, presented.contentHeight, "…and the surface gets its whole box back");
      assert.equal(presented.height, 0, "…as the chrome's own rows already do");

      // GUARD 2 — the inset is the MEASUREMENT, with no floor of the model's own. A floor would be
      // a number the model invented, which is exactly what DG-46-1's "measured, never invented"
      // rules out; a collapsed dock's header is small and its height is content-driven.
      for (const height of [1, 7, 20, 33, 47, 280.4, 280.6]) {
        assert.equal(
          published({ viewportHeight: 800, viewportWidth: 1280, bars: 1, dock: { height } }).dockInset,
          Math.round(height),
          `a measured ${height}px dock publishes ${Math.round(height)}px — no floor, no minimum band`,
        );
      }

      // GUARD 3 — the content box never goes NEGATIVE. A dock taller than the region cannot
      // happen through the clamp, but the model takes its inset as an INPUT and must not answer a
      // negative height to a `calc()`.
      const overlarge = published({ viewportHeight: 520, viewportWidth: 760, bars: 2, dock: { height: 900 } });
      assert.equal(overlarge.contentHeight, 432);
      assert.equal(overlarge.contentBoxHeight, 0, "clamped at zero, never negative");
    },
  },

  {
    name: "shell-dock-inset/01 an UNMEASURED box does not resize the dock at all — it is a designed state, not an edge case, and it is a different fact from a measured ZERO (01 scenario 4, row 7)",
    run() {
      // ROW 7. A clamp against a box it does not know must NOT resize the dock: snapping to 0 or
      // to the minimum on the first frame would be a visible jump on every mount that the next
      // measured tick undoes. Same discipline as the geometry helper's zero-box guard.
      for (const box of [null, undefined, NaN, Infinity, -1, "", "auto", {}, true]) {
        const bounds = dockHeightBounds(box);
        assert.equal(bounds.measured, false, `${JSON.stringify(box) ?? "(absent)"} is not a measurement`);
        assert.equal(bounds.max, null, "…so there is no ceiling to report");
        assert.equal(bounds.contentRegionHeight, null);
        assert.equal(bounds.defaultHeight, DOCK_DEFAULT_HEIGHT, "…and the default is the UNCLAMPED one");
        // The height a caller is already showing comes back UNCHANGED — the dock is not resized.
        for (const current of [280, 216, 500]) {
          assert.equal(clampDockHeight(current, box), current, `a dock at ${current} is left alone`);
        }
        assert.ok(Number.isFinite(clampDockHeight(300, box)), "never NaN");
      }

      // …AND A MEASURED ZERO IS A DIFFERENT FACT. `760x88` with 88px of chrome IS a content box
      // of exactly 0 — a real, degenerate, KNOWN box with a ceiling of 0 — where an unmeasured
      // box is not a box at all. Reading 0 as "unmeasured" would answer the first with the
      // unclamped 280: a dock taller than a box with no room in it.
      const zero = dockHeightBounds(0);
      assert.equal(zero.measured, true, "zero is a measurement");
      assert.equal(zero.max, 0);
      assert.equal(zero.min, 0);
      assert.equal(zero.defaultHeight, 0);
      assert.equal(clampDockHeight(280, 0), 0, "…and nothing fits in it");

      // THE GUARD IS NOT STICKY: the very next measured tick returns the real ceiling.
      assert.equal(dockHeightBounds(null).max, null);
      assert.equal(dockHeightBounds(432).max, 216);
      assert.equal(dockHeightBounds(null).max, null, "…and back again, with no memory either way");
    },
  },

  // ======================================================================
  // Scenario: the two numbers are INDEPENDENT — opening, dragging and closing the dock changes
  // the published chrome height by nothing
  // ======================================================================
  {
    name: "shell-dock-inset/01 opening, dragging to the maximum, collapsing, expanding and closing the dock changes the published CHROME height and the budget verdict by NOTHING — the inset is the only published number that moves, and it returns to zero with no residue (01 scenario 5)",
    run() {
      const viewport = { viewportHeight: 800, viewportWidth: 1280, bars: 1 };
      const before = published({ ...viewport, dock: null });

      const steps = [
        ["opened at its default", { height: 280 }, 280],
        ["dragged to its maximum", { height: 376 }, 376],
        ["collapsed to its header", { height: 33 }, 33],
        ["expanded again", { height: 376 }, 376],
        ["closed", null, 0],
      ];
      const chromeHeights = new Set([before.height]);
      const verdicts = new Set([before.verdict]);
      for (const [label, dock, inset] of steps) {
        const model = published({ ...viewport, dock });
        chromeHeights.add(model.height);
        verdicts.add(model.verdict);
        assert.equal(model.dockInset, inset, `${label}: the inset is the number that changed`);
      }
      assert.deepEqual([...chromeHeights], [before.height], "the chrome height is IDENTICAL at every step — the overlay row contributes zero");
      assert.deepEqual([...verdicts], [before.verdict], "…and so is the budget verdict: a dock can never move the shell into or out of a chrome breach");

      // WITH THE DOCK CLOSED, BOTH NUMBERS RETURN TO EXACTLY THE VALUES THEY HAD before it was
      // ever opened — no residue, no reserved band.
      const after = published({ ...viewport, dock: null });
      assert.deepEqual(
        { height: after.height, value: after.value, inset: after.dockInset, box: after.contentBoxHeight },
        { height: before.height, value: before.value, inset: before.dockInset, box: before.contentBoxHeight },
      );
      assert.equal(after.dockInset, 0);
      assert.equal(after.contentBoxHeight, after.contentHeight, "no band is held back for a dock that is not there");
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // DG-46-1's OTHER HALF — the one the inset cannot express, and the one that actually broke.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "shell-dock-inset/DG-46-1 the detail panel's ORDER OF SACRIFICE is declared: the action strip never shrinks, and the context header does — because a panel clamped shorter than its own header pushes the actions out of the box and under the dock",
    run: async () => {
      // MEASURED ON THE RUNNING SYSTEM, 2026-08-09, at the desktop app's own 760x520 window.
      // Everything this suite already asserts was TRUE and the actions were still unreachable:
      // the dock took exactly its clamped 216px, the inset published 216px, and the panel gave up
      // exactly 216px. The overflow was one level further in —
      //
      //   panel h=216, children total 362
      //     228px  header (shrink-0)   <-- a four-line wrapped title, LARGER than the whole panel
      //      35px  tabs   (shrink-0)
      //      32px  body   (min-h-0 flex-1 overflow-y-auto)  <-- already fully compressed
      //      67px  ACTION STRIP (shrink-0)  <-- pushed to y383..450, outside the panel, under the dock
      //
      // ...and the region is `overflow: hidden`, so it could not be scrolled to either. All three
      // of `+ Add feedback`, `✓ Validate` and `→ Next` failed a hit test.
      //
      // A NUMERIC MODEL CANNOT CATCH THIS — that is why the assertion is over the panel's declared
      // flex behaviour. The inset arithmetic in every lane above was correct throughout.
      const source = await readFile(path.join(repoRoot, "ui", "src", "board", "DetailPanel.tsx"), "utf8");

      const strip = source.match(/<div className="[^"]*border-t border-border[^"]*"/);
      assert.ok(strip, "the detail panel renders its action strip as a top-bordered block");
      assert.match(
        strip[0],
        /(^|[\s"])shrink-0([\s"])/,
        "THE ACTION STRIP NEVER SHRINKS — it is the thing DG-46-1 exists to keep reachable",
      );

      const header = source.match(/<div className="[^"]*border-b border-border[^"]*"/);
      assert.ok(header, "the detail panel renders its context header as a bottom-bordered block");
      assert.doesNotMatch(
        header[0],
        /(^|[\s"])shrink-0([\s"])/,
        "…and the CONTEXT HEADER must be able to yield: `shrink-0` here is what pushed the actions out of a panel shorter than the header itself",
      );
      assert.match(
        header[0],
        /min-h-0/,
        "…with `min-h-0`, or a flex child's automatic minimum size silently restores the floor that `shrink-0` was doing explicitly",
      );
      assert.match(
        header[0],
        /overflow-y-auto/,
        "…and it scrolls what it gives up, so shrinking hides nothing permanently",
      );
    },
  },
];
