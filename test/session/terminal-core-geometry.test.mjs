// Traceability wiring for milestone 46 / story 03 / task 02 —
// tasks/02_fit-or-scale-is-derived-from-the-source.feature (@executable).
//
// THE CHANNEL. `ui/src/terminal/geometry.mjs` is PURE, so geometry is tested as ARITHMETIC
// and as a derived PLAN: the mode a descriptor yields, the frames a fit emits, the scalar a
// box yields. `node:test` under plain `node` — no bundler, no DOM, no xterm, no
// `ResizeObserver`, no clock.
//
// THIS SUITE CLOSES A COVERAGE HOLE THAT WAS BELIEVED CLOSED. The predecessor
// `ui/src/fleet/terminal-view/geometry.mjs:20-23` states in terms that its 80x24 tie and its
// scale math are held by `test/fleet-terminal-view-geometry.test.mjs`. THAT FILE HAS NEVER
// EXISTED — confirmed on the codebase graph (no test importer at all) and by grep. So the
// mirror lane's entire scale math, and the cross-build constant whose drift produces an
// unreadable overlapping screen, were untested AND BELIEVED TESTED. Everything below is
// `terminalFitScale`'s first coverage.
//
// The CROSS-FILE TIE itself is NOT here and is not Gherkin: that the descriptor's
// `mirror.fixedGeometry` EQUALS the worker's own `ptySpawn` geometry is
// `acd-terminal-mirror-geometry-pinned`'s, because it is a structural assertion across two
// builds that cannot import each other. What IS here is the observable consequence: a mirror
// pane shows all 80 columns and all 24 rows, unwrapped and uncropped, at every documented box.
//
//   Scenario Outline: the geometry mode is derived from the descriptor's resize control
//     frame, and from nothing else (4 rows, two of them synthesized on purpose)
//   Scenario Outline: a fit source tells the far end its new size exactly once (9 rows)
//   Scenario Outline: a scale source is transformed by the smaller of the two ratios (6 rows)
//   Scenario Outline: a zero, absent, negative or unmeasurable dimension degrades to the
//     identity scale rather than to NaN (14 rows)
//   Scenario: the identity guard is not sticky
//   Scenario Outline: a mirror pane shows all 80 columns and all 24 rows at every documented
//     box (5 rows)
//   Scenario Outline: the resize emitter exists only for a source that declares a resize
//     control frame (2 rows)
import assert from "node:assert/strict";
import {
  GEOMETRY_FIT,
  GEOMETRY_SCALE,
  SCALED_DOWN,
  SCALED_UP,
  UNSCALED,
  ANCHOR_TOP_LEFT,
  geometryModeFor,
  geometryPlanFor,
  emitFit,
  resizeMessage,
  terminalFitScale,
} from "../../ui/src/terminal/geometry.mjs";
import { sessionSourceFor, RESIZE_CONTROL_FRAME, ORIGIN_ROLE_SELF, ORIGIN_ROLE_FLEET } from "../../ui/src/terminal/source-table.mjs";

const LOCAL_PTY = sessionSourceFor("local-pty").source;
const MIRROR = sessionSourceFor("mirror").source;

// 640x408 is 80x24 at `fontSize: 13`, and it is the CALLER's measurement handed in as an
// argument — the module invents no intrinsic size of its own, which is what keeps it testable
// with no DOM at all.
const INTRINSIC = { intrinsicWidth: 640, intrinsicHeight: 408 };

function collector() {
  const frames = [];
  return { frames, send: (frame) => frames.push(frame) };
}

export const terminalCoreGeometryTests = [
  // ======================================================================
  // Scenario Outline: the geometry mode is derived from the descriptor's resize control frame
  // ======================================================================
  ...[
    {
      case: "the board server's own PTY — the frozen table's `local-pty`",
      source: LOCAL_PTY,
      declares: "declares a `resize` frame",
      originRole: ORIGIN_ROLE_SELF,
      mode: GEOMETRY_FIT,
    },
    {
      case: "a worker's mirrored TUI — the frozen table's `mirror`",
      source: MIRROR,
      declares: "declares no control frame",
      originRole: ORIGIN_ROLE_FLEET,
      mode: GEOMETRY_SCALE,
    },
    {
      case: "a resizable far end reached across an origin (synthesized)",
      source: { kind: "synthesized-a", path: "/ws/elsewhere", params: [], originRole: ORIGIN_ROLE_FLEET, resizeControlFrame: RESIZE_CONTROL_FRAME, canInput: true, fixedGeometry: null },
      declares: "declares a `resize` frame",
      originRole: ORIGIN_ROLE_FLEET,
      mode: GEOMETRY_FIT,
    },
    {
      case: "a non-resizable far end on the surface's own origin (synthesized)",
      source: { kind: "synthesized-b", path: "/ws/elsewhere", params: [], originRole: ORIGIN_ROLE_SELF, resizeControlFrame: null, canInput: true, fixedGeometry: { cols: 80, rows: 24 } },
      declares: "declares no control frame",
      originRole: ORIGIN_ROLE_SELF,
      mode: GEOMETRY_SCALE,
    },
  ].map((row) => ({
    name: `terminal-core/02 a source that ${row.declares} at the ${row.originRole} origin derives the ${row.mode} mode (${row.case})`,
    run() {
      // When its geometry mode is derived / Then the mode is <mode>
      assert.equal(row.source.originRole, row.originRole, "the row really is at the origin it claims");
      assert.equal(geometryModeFor(row.source), row.mode);

      // And the mode is unchanged when the same descriptor is read against a different
      // origin, host, port or socket URL — NONE of those is an input. (The derivation takes
      // exactly one argument; a second one is ignored, which is the strongest form of "not
      // an input" a black-box test can assert.)
      for (const decoy of [
        { origin: "https://elsewhere.test:9443" },
        { host: "127.0.0.1", port: 4181 },
        { socketUrl: "wss://fleet.internal:8443/ws/terminal-view?nodeId=a&sessionId=b" },
      ]) {
        assert.equal(geometryModeFor(row.source, decoy), row.mode, `the mode ignores ${JSON.stringify(decoy)}`);
      }
      for (const originRole of [ORIGIN_ROLE_SELF, ORIGIN_ROLE_FLEET]) {
        assert.equal(geometryModeFor({ ...row.source, originRole }), row.mode, `the mode is the same at originRole=${originRole}`);
      }

      // And the mode is unchanged when the descriptor's kind string is replaced by a word
      // nothing recognises, every other field held constant. (ADR-003's forbidden spellings —
      // `if (remote`, `isRemote`, `kind === "mirror"`, `origin ===` — expressed as an
      // OBSERVABLE consequence rather than as a grep a reviewer has to remember to run.)
      for (const disguise of ["remote", "local", "some-future-source", "mirror", "local-pty"]) {
        assert.equal(geometryModeFor({ ...row.source, kind: disguise }), row.mode, `the mode ignores kind=${disguise}`);
      }
    },
  })),

  // ======================================================================
  // Scenario Outline: a fit source tells the far end its new size exactly once
  // ======================================================================
  ...[
    { case: "the first fit of a fresh session", previous: null, cols: 80, rows: 24, frames: 1, frame: { type: "resize", cols: 80, rows: 24 } },
    { case: "the operator drags the dock taller", previous: { cols: 80, rows: 24 }, cols: 120, rows: 30, frames: 1, frame: { type: "resize", cols: 120, rows: 30 } },
    { case: "the widest documented fit", previous: { cols: 120, rows: 30 }, cols: 200, rows: 50, frames: 1, frame: { type: "resize", cols: 200, rows: 50 } },
    { case: "a ResizeObserver tick on a box that did not change", previous: { cols: 120, rows: 30 }, cols: 120, rows: 30, frames: 0, frame: null },
    { case: "only the row count changed", previous: { cols: 120, rows: 30 }, cols: 120, rows: 31, frames: 1, frame: { type: "resize", cols: 120, rows: 31 } },
    { case: "only the column count changed", previous: { cols: 120, rows: 30 }, cols: 121, rows: 30, frames: 1, frame: { type: "resize", cols: 121, rows: 30 } },
    { case: "dimensions arriving as numeric strings from a measurement", previous: null, cols: "120", rows: "30", frames: 1, frame: { type: "resize", cols: 120, rows: 30 } },
    { case: "a pane measured before it has a size", previous: null, cols: NaN, rows: 24, frames: 0, frame: null },
    { case: "a negative dimension", previous: null, cols: -80, rows: 24, frames: 0, frame: null },
  ].map((row) => ({
    name: `terminal-core/02 fitting to ${String(row.cols)}x${String(row.rows)} after ${row.previous ? `${row.previous.cols}x${row.previous.rows}` : "(no previous fit)"} emits exactly ${row.frames} resize frame(s) (${row.case})`,
    run() {
      const { frames, send } = collector();
      // Given a fit source whose last emitted fit was <previous fit>
      const last = row.previous == null ? null : resizeMessage(row.previous.cols, row.previous.rows);
      // When the pane is fitted to <cols> columns and <rows> rows
      const result = emitFit(row.cols, row.rows, send, last);

      // Then <frames> resize frame is emitted, and nothing else is sent: a fit produces a
      // resize or it produces silence.
      assert.equal(frames.length, row.frames, `exactly ${row.frames} frame(s) reached the sink`);
      assert.equal(result.sent, row.frames === 1);

      if (row.frames === 1) {
        // And the frame carried is <frame> — the frozen m03/ADR-003 envelope, with integer
        // cols and rows: never strings, never NaN, never absent.
        assert.deepEqual(result.message, row.frame);
        assert.deepEqual(JSON.parse(frames[0]), row.frame, "the wire form carries exactly that envelope");
        assert.equal(typeof result.message.cols, "number");
        assert.equal(typeof result.message.rows, "number");
        assert.ok(Number.isInteger(result.message.cols) && Number.isInteger(result.message.rows));
        assert.ok(Number.isFinite(result.message.cols) && Number.isFinite(result.message.rows));
        assert.equal(result.message.type, "resize");
        assert.deepEqual(Object.keys(result.message).sort(), ["cols", "rows", "type"], "no other key rides the envelope");
      } else {
        // "(nothing — the last frame stands)" for a no-change fit; "(nothing — an unmeasured
        // box is not a fit)" for a dimension that normalises to zero.
        assert.equal(frames.length, 0, "silence");
        if (row.previous != null) {
          assert.equal(result.reason, "no-change");
          assert.deepEqual(result.message, last, "the last frame stands");
        } else {
          assert.equal(result.reason, "unmeasured", "a zero-normalising dimension is an UNMEASURED box, not a fit");
          assert.equal(result.message, null);
        }
      }
    },
  })),

  // ======================================================================
  // Scenario Outline: a scale source is transformed by the smaller of the two ratios
  // ======================================================================
  ...[
    { case: "the fleet card peek — a short box, so height binds", box: [320, 163] },
    { case: "the board dock at its default height — the crop m46 fixes", box: [1264, 280] },
    { case: "the fullscreen overlay at an exactly proportional box", box: [1280, 816] },
    { case: "a wide host — the band lands on the RIGHT", box: [1280, 408] },
    { case: "a tall host — the band lands at the BOTTOM", box: [640, 816] },
    { case: "a box that is exactly the screen", box: [640, 408] },
  ].map((row) => ({
    name: `terminal-core/02 a 640x408 screen in a ${row.box[0]}x${row.box[1]} box scales by the SMALLER of the two ratios (${row.case})`,
    run() {
      const [boxWidth, boxHeight] = row.box;
      const byWidth = boxWidth / 640;
      const byHeight = boxHeight / 408;
      const expected = Math.min(byWidth, byHeight);
      const rejectedMax = Math.max(byWidth, byHeight);

      // When the scale is derived / Then the scale is exactly <the scale>
      const scale = terminalFitScale({ ...INTRINSIC, boxWidth, boxHeight });
      assert.equal(scale, expected, "the min of box÷intrinsic on each axis");

      // And it is not <the rejected max>, which would push the other axis outside the box.
      if (rejectedMax !== expected) {
        assert.notEqual(scale, rejectedMax, "the max would push the other axis outside the box");
        assert.ok(scale < rejectedMax);
      } else {
        assert.equal(scale, rejectedMax, "the two ratios agree, so there is no band at all");
      }

      // And ONE scale applies to both axes, so the screen's proportions are preserved exactly.
      const scaledWidth = 640 * scale;
      const scaledHeight = 408 * scale;
      assert.ok(Math.abs(scaledWidth / scaledHeight - 640 / 408) < 1e-9, "aspect preserved (one scale, both axes)");
      assert.equal(scaledWidth / 640, scaledHeight / 408, "…and it is literally the SAME scalar on both axes");

      // And the scaled screen FITS: no column and no row is cut off.
      assert.ok(scaledWidth <= boxWidth + 1e-9, `${scaledWidth} fits ${boxWidth}`);
      assert.ok(scaledHeight <= boxHeight + 1e-9, `${scaledHeight} fits ${boxHeight}`);

      // And any leftover space is the letterbox band — expected arithmetic, not a gap.
      const bandRight = boxWidth - scaledWidth;
      const bandBottom = boxHeight - scaledHeight;
      assert.ok(bandRight >= -1e-9 && bandBottom >= -1e-9, "the band is leftover space, never a crop");
      assert.ok(bandRight < 1e-9 || bandBottom < 1e-9, "the binding axis has no band, which is what makes it the binding axis");

      // And the scale is a finite number greater than zero.
      assert.equal(typeof scale, "number");
      assert.ok(Number.isFinite(scale) && scale > 0);
    },
  })),

  // ======================================================================
  // Scenario Outline: a zero, absent, negative or unmeasurable dimension → the identity
  // ======================================================================
  ...[
    { case: "a real measurement, so the guard is not swallowing all", input: { intrinsicWidth: 640, intrinsicHeight: 408, boxWidth: 320, boxHeight: 204 }, scale: 0.5 },
    { case: "the pane is measured a frame before it is laid out", input: { intrinsicWidth: 640, intrinsicHeight: 408, boxWidth: 0, boxHeight: 0 }, scale: 1 },
    { case: "the box has width but no height yet", input: { intrinsicWidth: 640, intrinsicHeight: 408, boxWidth: 320, boxHeight: 0 }, scale: 1 },
    { case: "the box has height but no width yet", input: { intrinsicWidth: 640, intrinsicHeight: 408, boxWidth: 0, boxHeight: 163 }, scale: 1 },
    { case: "a collapsed flex child reports a negative width", input: { intrinsicWidth: 640, intrinsicHeight: 408, boxWidth: -320, boxHeight: 163 }, scale: 1 },
    { case: "a collapsed flex child reports a negative height", input: { intrinsicWidth: 640, intrinsicHeight: 408, boxWidth: 320, boxHeight: -163 }, scale: 1 },
    { case: "the xterm has not painted, so it has no intrinsic size", input: { intrinsicWidth: 0, intrinsicHeight: 0, boxWidth: 320, boxHeight: 163 }, scale: 1 },
    { case: "a negative intrinsic width", input: { intrinsicWidth: -640, intrinsicHeight: 408, boxWidth: 320, boxHeight: 163 }, scale: 1 },
    { case: "the box dimensions are absent", input: { intrinsicWidth: 640, intrinsicHeight: 408 }, scale: 1 },
    { case: "the intrinsic dimensions are absent", input: { boxWidth: 320, boxHeight: 163 }, scale: 1 },
    { case: "no argument is supplied at all", input: undefined, scale: 1 },
    { case: "a dimension that is not a number at all", input: { intrinsicWidth: 640, intrinsicHeight: 408, boxWidth: "auto", boxHeight: 163 }, scale: 1 },
    { case: "a dimension that is NaN", input: { intrinsicWidth: 640, intrinsicHeight: 408, boxWidth: NaN, boxHeight: 163 }, scale: 1 },
    { case: "a dimension that is explicitly null", input: { intrinsicWidth: 640, intrinsicHeight: 408, boxWidth: 320, boxHeight: null }, scale: 1 },
  ].map((row) => ({
    name: `terminal-core/02 the scale degrades to ${row.scale} rather than to NaN (${row.case})`,
    run() {
      // When the scale is derived / Then the scale is exactly <scale>, and nothing is thrown:
      // a pane measured before layout is an ordinary frame, not an error.
      let scale;
      assert.doesNotThrow(() => { scale = row.input === undefined ? terminalFitScale() : terminalFitScale(row.input); });
      assert.equal(scale, row.scale);

      // And it is a finite number — never NaN, never Infinity, never a string, never undefined.
      assert.equal(typeof scale, "number");
      assert.ok(Number.isFinite(scale), "finite");
      assert.ok(!Number.isNaN(scale), "not NaN");
      assert.notEqual(scale, Infinity);
      assert.ok(scale > 0);
    },
  })),

  {
    name: "terminal-core/02 the identity guard is not sticky — the very next measured tick returns the real ratio",
    run() {
      // Given a pane whose box measured zero by zero before layout, so its scale was the identity
      const beforeLayout = terminalFitScale({ ...INTRINSIC, boxWidth: 0, boxHeight: 0 });
      assert.equal(beforeLayout, 1);

      // When the same pane is measured again at a real box
      const measured = terminalFitScale({ ...INTRINSIC, boxWidth: 320, boxHeight: 204 });

      // Then the scale is the real ratio for that box, not the identity it returned a frame earlier.
      assert.equal(measured, 0.5);
      assert.notEqual(measured, 1);

      // And nothing about the earlier unmeasured call is remembered — the derivation is PURE
      // over the arguments it is handed. (A guard that latched would leave every mirror pane
      // at natural size forever, which reads exactly like the crop it exists to prevent.)
      assert.equal(terminalFitScale({ ...INTRINSIC, boxWidth: 320, boxHeight: 204 }), 0.5);
      assert.equal(terminalFitScale({ ...INTRINSIC, boxWidth: 0, boxHeight: 0 }), 1, "and back again, with no memory either way");
      assert.equal(terminalFitScale({ ...INTRINSIC, boxWidth: 1280, boxHeight: 816 }), 2);
    },
  },

  // ======================================================================
  // Scenario Outline: a mirror pane shows all 80 columns and all 24 rows
  // ======================================================================
  ...[
    { case: "the fleet card peek at the primary width", box: [320, 163], direction: SCALED_DOWN },
    { case: "the fleet card peek at 390", box: [300, 163], direction: SCALED_DOWN },
    { case: "the board dock at its default height", box: [1264, 280], direction: SCALED_DOWN },
    { case: "the board dock in the 760x520 desktop window", box: [744, 216], direction: SCALED_DOWN },
    { case: "the fullscreen overlay at the primary width", box: [1280, 816], direction: SCALED_UP },
  ].map((row) => ({
    name: `terminal-core/02 a mirror pane in a ${row.box[0]}x${row.box[1]} box keeps all 80 columns and 24 rows, ${row.direction} (${row.case})`,
    run() {
      const [boxWidth, boxHeight] = row.box;
      // Given a `mirror` source at its declared fixed geometry, and a byte area measuring <box>
      const plan = geometryPlanFor(MIRROR, { ...INTRINSIC, boxWidth, boxHeight });

      // Then the terminal is sized to 80 columns and 24 rows BEFORE any transform is applied.
      assert.equal(plan.mode, GEOMETRY_SCALE);
      assert.equal(plan.cols, 80);
      assert.equal(plan.rows, 24);

      // And the geometry does not change with the box — a smaller box scales the PICTURE and
      // never reflows the SCREEN. (The soak lesson: fitting the pane to a card's ~46x10 made
      // every absolutely-positioned line land at the wrong column.)
      for (const other of [[320, 163], [1264, 280], [1280, 816], [744, 216]]) {
        const otherPlan = geometryPlanFor(MIRROR, { ...INTRINSIC, boxWidth: other[0], boxHeight: other[1] });
        assert.equal(otherPlan.cols, 80);
        assert.equal(otherPlan.rows, 24);
        assert.equal(otherPlan.reflows, false, "a scale plan never reflows");
      }

      // And the whole screen is inside the box after scaling: no column and no row is cropped.
      assert.ok(plan.scaledWidth <= boxWidth + 1e-9, `${plan.scaledWidth} <= ${boxWidth}`);
      assert.ok(plan.scaledHeight <= boxHeight + 1e-9, `${plan.scaledHeight} <= ${boxHeight}`);
      assert.equal(plan.anchor, ANCHOR_TOP_LEFT, "anchored top-left on every surface");

      // And the plan is <direction>.
      assert.equal(plan.direction, row.direction);

      // And no resize frame is emitted for this box, or for any other.
      assert.equal(plan.emitsResizeFrame, false);
      assert.equal(plan.emitter, null);
      assert.equal(plan.controlFrame, null);
    },
  })),

  // ======================================================================
  // Scenario Outline: the resize emitter exists only for a source that declares one
  // ======================================================================
  ...[
    { case: "the board server's own PTY", source: LOCAL_PTY, declares: "declares a `resize` frame", frame: "resize", hasEmitter: true },
    { case: "a worker's mirrored TUI", source: MIRROR, declares: "declares no control frame", frame: null, hasEmitter: false },
  ].map((row) => ({
    name: `terminal-core/02 a source that ${row.declares} offers ${row.hasEmitter ? "one resize emitter" : "no emitter at all"} (${row.case})`,
    run() {
      // When its geometry plan is derived
      const plan = geometryPlanFor(row.source, { cols: 120, rows: 30, ...INTRINSIC, boxWidth: 1264, boxHeight: 280 });

      // Then the plan names <frame> / And it offers <emitter>
      assert.equal(plan.controlFrame, row.frame);
      if (row.hasEmitter) {
        assert.equal(plan.mode, GEOMETRY_FIT);
        assert.equal(typeof plan.emitter, "function", "one resize emitter");
        assert.equal(plan.emitsResizeFrame, true);
        const { frames, send } = collector();
        const emitted = plan.emitter(120, 30, send, null);
        assert.equal(emitted.sent, true);
        assert.equal(frames.length, 1);
        assert.deepEqual(JSON.parse(frames[0]), { type: "resize", cols: 120, rows: 30 });
      } else {
        assert.equal(plan.mode, GEOMETRY_SCALE);
        // And a `scale` plan cannot emit a resize EVEN WHEN A CALLER ASKS IT TO — there is
        // nothing wired to emit through, rather than a defensive early return that a later
        // refactor could delete.
        assert.equal(plan.emitter, null, "no emitter at all");
        assert.equal(plan.emitsResizeFrame, false);
        const { frames } = collector();
        assert.throws(() => plan.emitter(120, 30, () => {}), TypeError, "there is nothing to emit through");
        assert.equal(frames.length, 0, "and nothing was sent");
      }
    },
  })),

  {
    name: "terminal-core/02 the fit plan for the board PTY reports the measured geometry and the frozen control frame, and the plan is frozen against a caller",
    run() {
      const plan = geometryPlanFor(LOCAL_PTY, { cols: 200, rows: 50 });
      assert.equal(plan.mode, GEOMETRY_FIT);
      assert.equal(plan.cols, 200);
      assert.equal(plan.rows, 50);
      assert.equal(plan.controlFrame, "resize", "the frozen m03/ADR-003 envelope word, not a new one");
      assert.equal(plan.reflows, true, "a fit source reflows: dragging taller adds rows, wider adds columns");
      assert.equal(plan.scale, 1, "a fit is never transformed — glyphs never change size");
      assert.equal(plan.direction, UNSCALED);
      // A pane measured before it has a size produces no dimensions to fit to.
      const unmeasured = geometryPlanFor(LOCAL_PTY, { cols: 0, rows: 0 });
      assert.equal(unmeasured.cols, null);
      assert.equal(unmeasured.rows, null);
      try { plan.cols = 1; } catch { /* frozen in fact */ }
      assert.equal(geometryPlanFor(LOCAL_PTY, { cols: 200, rows: 50 }).cols, 200, "the plan a caller writes to is not the plan the next caller reads");
    },
  },
];
