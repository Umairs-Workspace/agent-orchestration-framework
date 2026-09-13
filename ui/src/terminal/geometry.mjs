// Adapted from elirantutia/vibeyard (MIT) — the fit → resize signal (vibeyard's fitAddon.fit()
// followed by a {cols,rows} resize over the carrier), reached here through
// ui/src/board/terminal/resize.mjs, which ported it first and which milestone 46 / story 04
// deletes. vibeyard is MIT-licensed; see the repo NOTICE file. THE ATTRIBUTION TRAVELS WITH THE
// DERIVATION (ADR-001; a licence obligation, not housekeeping): `resizeMessage`, `resizeFrame`
// and `emitFit`'s single-emission contract below are that helper, re-homed, so the notice moves
// with them and `test/arch/ui/acd-vibeyard-attribution.test.mjs` names this file. The SCALE half
// (`terminalFitScale`) is this product's own, from m38's two-machine soak.
//
// The ONE terminal control's GEOMETRY (milestone 46 / story 03 / task 02 — ADR-003). A
// framework-free ESM module — no React, no DOM, no xterm, no `ResizeObserver` — so the fit
// math, the scale math and the plan they produce are all unit-testable headlessly.
//
// ═══ WHEN A `fit` SOURCE RE-FITS: WHENEVER ITS BOX CHANGES, AND THE BOX CHANGES FOR THREE
// REASONS. The rule lives here rather than at the React call site because it is a property of the
// GEOMETRY, not of any one effect — and it was split across two effects and a socket guard, which
// is how two of the three shipped broken. All three measured on the running system, 2026-08-09:
//
//   1. THE DOCK IS DRAGGED. A ResizeObserver on the inline host. This one always worked.
//   2. FULLSCREEN PRESENTS. The box that changed was the OVERLAY's, which an observer on the
//      INLINE host cannot see — the dock is still sitting there at its own size underneath. The
//      overlay adopted the live node, grew to 1264x739 and kept the dock's 15 rows / 210px:
//      529px of dead black under the one source kind this file guarantees has no band.
//   3. THE NON-LIVE BAR APPEARS — which IS the session ending, and that is why it was missed: the
//      fit sat behind `if (ws.readyState !== WebSocket.OPEN) return`, so once the stream closed
//      there was nobody to tell and therefore no re-fit either. Measured on `exited (0)`: the byte
//      area shrank by exactly the bar's 29px, the terminal kept all 15 rows, and 26px of the last
//      row rendered UNDER an opaque bar with `overflow: visible`. `04/00`'s scenario forbids
//      exactly that — "a non-live message never overprints the bytes".
//
// FITTING THE PANE AND TELLING THE FAR END ARE DIFFERENT ACTS. A pane whose stream has ended
// still has a box; there is simply no longer anyone to send a resize frame to. `emitFit` below
// already suppresses an unchanged pair, so fitting more often than strictly needed is silent.
//
// THE ONE RULE: `fit` iff the source declares a resize control frame; `scale` otherwise.
// Keyed on the source's OWN DECLARED CAPABILITY — never on transport, never on an origin,
// never on an `isRemote` boolean, never on which host it is rendered in. Spike 44 measured a
// `resize(143, 41)` reaching a board PTY over a CROSS-ORIGIN socket, so resizability is a
// property of the far end and not of which origin served the page. The forbidden spellings,
// named so a reviewer can grep for them: `if (remote`, `isRemote`, `kind === "mirror"`,
// `origin ===`, or any test of the socket URL. The descriptor is the only input.
//
// WHY A `scale` SOURCE MUST NOT REFLOW, paid for in a live two-machine soak. The worker
// spawns its interactive `claude` at a FIXED 80x24 and the TUI paints every line for THAT
// screen size with absolute cursor addressing. Fitting the pane to a card's ~46x10 made
// every absolutely-positioned line land at the wrong column and the screen overlapped itself
// into an unreadable scatter. The fix: render at EXACTLY the worker's geometry and scale the
// fixed-size result to whatever box is available. xterm's DOM renderer scales crisply in
// BOTH directions off the SAME instance — which is why ADR-003 forbids a canvas/webgl addon
// on this surface.
//
// THIS MODULE IS ALSO A COVERAGE HOLE BEING CLOSED. Its predecessor's header stated in terms
// that its 80x24 tie and its scale math were held by `test/fleet-terminal-view-geometry.test.mjs`.
// That file had NEVER existed, so the mirror lane's entire scale math and the cross-build
// constant whose drift produces an unreadable screen were untested AND BELIEVED TESTED —
// worse than untested, because the comment stopped anyone looking. The false comment dies
// with the file it is written on; this one names tests that exist.

export const GEOMETRY_FIT = "fit";
export const GEOMETRY_SCALE = "scale";

// A scaled screen is anchored TOP-LEFT on every surface. A terminal's origin is its top-left
// and that is where a reader starts; a screen centred in one host and anchored in another
// would be a second geometry rule for one control.
export const ANCHOR_TOP_LEFT = "top-left";

export const SCALED_DOWN = "scaled down";
export const SCALED_UP = "scaled up";
export const UNSCALED = "unscaled";

// geometryModeFor(source) — ADR-003's rule, as one pure function of one input.
export function geometryModeFor(source) {
  return source != null && source.resizeControlFrame != null ? GEOMETRY_FIT : GEOMETRY_SCALE;
}

// The frozen m03/ADR-003 client→server control envelope for a fit to cols x rows.
export function resizeMessage(cols, rows) {
  return { type: "resize", cols: toDim(cols), rows: toDim(rows) };
}

// The wire form the socket sends.
export function resizeFrame(cols, rows) {
  return JSON.stringify(resizeMessage(cols, rows));
}

// emitFit(cols, rows, send, last) — EXACTLY ONE resize frame per fit, and a fit that changes
// nothing says nothing. Returns `{ sent, message, reason }` so a caller (and a test) can
// assert both the dimensions and the single emission.
//
// TWO SUPPRESSIONS, and they are different facts:
//   · `no-change` — the fitted dimensions equal the last emitted pair, on BOTH axes. A guard
//     that compared one axis would pass a wider box and lose a real resize.
//   · `unmeasured` — a dimension normalises to 0. `toDim`'s normalisation is unchanged (a
//     non-positive or unparseable dimension still becomes 0), but 0 is the SIGNAL that the
//     box was never measured, and AN UNMEASURED BOX IS NOT A FIT. This stopped being
//     academic with the server-side pre-session frame queue: before it, an on-open fit was
//     discarded by the server anyway, so a 0-column frame was harmless; now that first fit
//     genuinely LANDS, so a 0x0 "fit" would reach a real PTY. It is the same species as the
//     scale lane's zero-box guard and is ruled the same way.
export function emitFit(cols, rows, send, last) {
  const message = resizeMessage(cols, rows);
  if (message.cols === 0 || message.rows === 0) {
    return { sent: false, message: last ?? null, reason: "unmeasured" };
  }
  if (last && last.cols === message.cols && last.rows === message.rows) {
    return { sent: false, message: last, reason: "no-change" };
  }
  send(JSON.stringify(message));
  return { sent: true, message, reason: null };
}

// A dimension normalises to an INTEGER, so the frame is always well-formed JSON the server
// can parse — never `NaN` (which does not survive `JSON.stringify`) and never a string. A
// numeric string from a measurement becomes the integer; anything non-positive or
// unparseable becomes 0, which the emitter reads as "unmeasured".
export function toDim(value) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// terminalFitScale({ intrinsicWidth, intrinsicHeight, boxWidth, boxHeight }) — the SINGLE
// CSS-transform scale that fits a fixed-geometry screen of `intrinsic` pixel size into an
// available `box`, PRESERVING ASPECT so the whole screen stays visible and is NEVER cropped:
// the MIN of the two ratios, not the max. The min is the only ratio at which the whole screen
// still fits; the max would push the other axis outside the box.
//
// The consequence is arithmetic and must be stated so a reviewer does not report it: at any
// host whose aspect ratio differs from the screen's, the leftover space is empty terminal
// background at the right and/or the bottom. THAT LETTERBOX BAND IS CORRECT. The alternatives
// are cropping (loses output), stretching (illegible glyphs) and re-fitting (the unreadable
// scatter this geometry was built to fix). Paying with empty space is the cheapest of the four.
//
// THE ZERO-BOX GUARD IS A DESIGNED STATE, NOT AN EDGE CASE. A pane may be measured a frame
// before it is laid out, and a divide-by-zero must degrade to "don't scale yet" — the
// IDENTITY, never NaN, never Infinity, never a throw. It is not sticky: the derivation is
// pure over its arguments, so the very next measured tick returns the real ratio. A guard that
// latched would leave every mirror pane at natural size forever, which reads exactly like the
// crop it exists to prevent.
export function terminalFitScale({ intrinsicWidth, intrinsicHeight, boxWidth, boxHeight } = {}) {
  if (!(intrinsicWidth > 0) || !(intrinsicHeight > 0)) return 1;
  if (!(boxWidth > 0) || !(boxHeight > 0)) return 1;
  return Math.min(boxWidth / intrinsicWidth, boxHeight / intrinsicHeight);
}

// geometryPlanFor(source, box) — the whole geometry DECISION for one source in one box, as
// values. A `fit` plan names the frozen control frame and OFFERS an emitter; a `scale` plan
// names no control frame and offers NO EMITTER AT ALL.
//
// ADR-003: "a `scale` source never sends a resize frame — not because of an early return in
// the send path, but because `scale` sources declare no resize control frame and the emitter
// is only wired for sources that do. The guard becomes STRUCTURAL instead of defensive." An
// early return is one refactor away from deletion; a `null` emitter is not.
//
// `box` for a `fit` plan carries the measured `{ cols, rows }`; for a `scale` plan it carries
// `{ intrinsicWidth, intrinsicHeight, boxWidth, boxHeight }` in pixels. The module invents no
// intrinsic size of its own — the caller measures and hands it in, which is what keeps this
// testable with no browser at all.
export function geometryPlanFor(source, box = {}) {
  const mode = geometryModeFor(source);
  if (mode === GEOMETRY_FIT) {
    const cols = toDim(box.cols);
    const rows = toDim(box.rows);
    return Object.freeze({
      mode,
      controlFrame: source.resizeControlFrame,
      emitter: emitFit,
      emitsResizeFrame: true,
      reflows: true,
      cols: cols || null,
      rows: rows || null,
      scale: 1,
      direction: UNSCALED,
      anchor: ANCHOR_TOP_LEFT,
      scaledWidth: null,
      scaledHeight: null,
    });
  }

  const fixed = source?.fixedGeometry ?? null;
  const intrinsicWidth = box.intrinsicWidth;
  const intrinsicHeight = box.intrinsicHeight;
  const scale = terminalFitScale({
    intrinsicWidth,
    intrinsicHeight,
    boxWidth: box.boxWidth,
    boxHeight: box.boxHeight,
  });
  return Object.freeze({
    mode,
    controlFrame: null,
    // NO EMITTER. There is nothing wired to emit through — not a guard that returns early.
    emitter: null,
    emitsResizeFrame: false,
    reflows: false,
    // The terminal is sized to the source's own fixed geometry BEFORE any transform, and it
    // does not change with the box: a smaller box scales the PICTURE and never reflows the
    // SCREEN.
    cols: fixed?.cols ?? null,
    rows: fixed?.rows ?? null,
    scale,
    direction: scale > 1 ? SCALED_UP : scale < 1 ? SCALED_DOWN : UNSCALED,
    anchor: ANCHOR_TOP_LEFT,
    scaledWidth: intrinsicWidth > 0 ? intrinsicWidth * scale : null,
    scaledHeight: intrinsicHeight > 0 ? intrinsicHeight * scale : null,
  });
}
