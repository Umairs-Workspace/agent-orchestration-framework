// The ONE terminal control's DRAG CLAMP (milestone 46 / story 03 — ADR-009's clause that the
// clamp moves off the viewport and onto the published chrome height; ADR-001's rule that a
// decision may not live in the `.tsx`). A framework-free ESM module — no React, no DOM, and
// in particular NO VIEWPORT GLOBAL. It takes the content box as an ARGUMENT.
//
// THE DEFECT THIS REPLACES, measured. The dock clamps its drag to
// `Math.round(window.innerHeight / 2)` — a clamp against the VIEWPORT, which under a shell is
// wrong by exactly the chrome height. `ui/src/app/shell-layout.mjs` publishes that number as
// `--aof-shell-chrome-height` precisely so a height-constrained surface has a named number to
// subtract, and it names this clamp as the caller it was promoted for.
//
// THE BUG IT ALSO FIXES, and it is the higher-risk half: the DEFAULT height was never clamped
// at all. The dock opens at a fixed 280px. In the desktop app's 760x520 window the content box
// is 432px, so the maximum is 216px — and the dock opens at 280, A HEIGHT THE OPERATOR IS NOT
// ALLOWED TO DRAG IT TO. The default is a clamped value like any other:
// `min(DEFAULT, floor(box / 2))`.
//
// AN UNMEASURED BOX IS NOT A BOX. An absent, negative or unparseable content box degrades to
// the UNCLAMPED default and says so (`measured: false`) — never to a height of 0, which would
// open the dock as a sliver, and never to NaN. This is the same species as the geometry
// helper's zero-box guard and the fit emitter's unmeasured-box suppression, and it is ruled
// the same way in all three: a box measured before layout is an ordinary frame, not an error,
// and the next tick re-clamps once the real box is known.
//
// A MEASURED ZERO IS A DIFFERENT FACT FROM AN UNMEASURED BOX, and 46/05's task 01 separates
// them in two adjacent rows (`760×88` with 88px of chrome IS a content box of exactly 0; a
// viewport and a chrome height nobody has measured yet is not a box at all). The first has a
// ceiling of 0 and a dock that cannot open; the second must not resize the dock AT ALL, because
// snapping to 0 or to the minimum on the first frame is a visible jump on every mount that the
// next tick undoes. Reading 0 as "unmeasured" collapses the two and answers the first with the
// unclamped 280 — a dock taller than a box with no room in it.
//
// WHEN THE MINIMUM CANNOT FIT, THE MINIMUM YIELDS TO THE CEILING (PO ruling, 2026-08-08, on
// QA finding 3). DESIGN §S1 gives `min 48` and `max floor(box/2)` and does not say which wins
// when `min > max`. The two compositions give different answers — `min(max(x, 48), 16) → 16`
// versus `max(min(x, 16), 48) → 48` — and only the first honours DG-46-1: the second puts the
// dock's own drag handle and header ABOVE the content region and covers the very content the
// inset exists to protect. So the floor is `min(DOCK_MIN_HEIGHT, ceiling)`, and a box too small
// to hold the minimum yields a dock that is at most half of it.

// The bounds, as values. The minimum is roughly the collapsed-header height — a dock dragged
// below it is a sliver with no terminal in it. It is a CEILING-BOUNDED minimum; see above.
export const DOCK_MIN_HEIGHT = 48;
export const DOCK_DEFAULT_HEIGHT = 280;

// The share of the content box the dock may occupy. Half, so the surface the dock is docked
// OVER always keeps at least half of the region.
export const DOCK_MAX_SHARE = 0.5;

function measuredBox(regionHeight) {
  const n = Number(regionHeight);
  // `>= 0`, not `> 0`: zero is a measurement (see the header). `""` and `null` both coerce to
  // 0 through `Number`, so they are refused by type before the range test.
  if (regionHeight === null || regionHeight === undefined || regionHeight === "") return null;
  if (typeof regionHeight === "boolean") return null;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// contentRegionHeight(viewportHeight, publishedChromeHeight) — the box the bounds below are half
// OF, derived from the two numbers a caller measures. Pure, so the arithmetic the `.tsx` used to
// do inline is drivable by `node:test` and the component keeps only the two DOM reads.
//
// `publishedChromeHeight` is the RAW value of `--aof-shell-chrome-height` as `getComputedStyle`
// returns it — a CSS length string (`"48px"`), or the empty string when no shell published one.
// Parsing it here is the point: a component that parsed it inline was a component whose parsing
// no test could reach, and the one measured defect in this area was exactly a bad read.
//
// NO SHELL, NO CHROME: an unset property means the surface is mounted alone, the content region
// IS the viewport, and the answer is the viewport — which is the same `0px` fallback
// `var(--aof-shell-chrome-height, 0px)` gives the CSS. An unusable VIEWPORT, by contrast, is not
// a box at all and comes back `null`, which `dockHeightBounds` reads as "unmeasured".
//
// THE DOCK INSET IS DELIBERATELY NOT SUBTRACTED, and it is a loop rather than a nuance: the dock
// IS the inset, so a ceiling computed against `viewport - chrome - inset` would shrink the box it
// measures itself against on every frame — 280 → box 472 → ceiling 236 → box 528 → …
export function contentRegionHeight(viewportHeight, publishedChromeHeight) {
  const viewport = Number(viewportHeight);
  if (!Number.isFinite(viewport) || viewport <= 0) return null;
  const chrome = Number.parseFloat(publishedChromeHeight);
  return Number.isFinite(chrome) && chrome > 0 ? viewport - chrome : viewport;
}

// dockHeightBounds(regionHeight) — the bounds for THIS content REGION, as values.
//
// THE ARGUMENT IS THE CONTENT REGION, NEVER THE SURFACE'S BOX, and the two became DIFFERENT
// NUMBERS at m46/05: the region is `100dvh - chrome` (what the dock is docked OVER, and what
// its half-share is half OF) while the shell's `chromeModel().contentBoxHeight` is
// `100dvh - chrome - dock inset` (what a `content:fixed` SURFACE sizes itself to, so its
// buttons are not covered). ONE WORD FOR BOTH FACTS is how a later tidy-up onto the smaller
// number closes a measurement loop: dock 280 -> box 472 -> ceiling 236 -> box 528 -> ... So
// the field is named for the fact it holds, in the milestone that keeps refusing two homes
// for one word.
//
// `measured` is the honest half: a caller can tell "the box is 432px, so the ceiling is 216"
// from "nobody has measured the box yet, so this is the unclamped fallback". A single number
// could not say that, and the caller that cannot tell them apart is the one that renders a
// 0-high dock for one frame.
export function dockHeightBounds(regionHeight) {
  const box = measuredBox(regionHeight);
  if (box == null) {
    return Object.freeze({
      measured: false,
      contentRegionHeight: null,
      min: DOCK_MIN_HEIGHT,
      max: null,
      defaultHeight: DOCK_DEFAULT_HEIGHT,
    });
  }
  // FLOOR, not round: a ceiling that rounds UP is a ceiling half a pixel past the share it
  // promises, and the dock would be draggable one pixel beyond the rule on odd boxes.
  const max = Math.floor(box * DOCK_MAX_SHARE);
  // THE CEILING WINS. `min(48, max)`, never `max(48, …)` — see the header.
  const min = Math.min(DOCK_MIN_HEIGHT, max);
  return Object.freeze({
    measured: true,
    contentRegionHeight: box,
    min,
    max,
    // THE DEFAULT IS CLAMPED LIKE ANY OTHER HEIGHT. An unclamped default opens the dock at a
    // height the operator is not allowed to drag it to.
    defaultHeight: Math.min(DOCK_DEFAULT_HEIGHT, max),
  });
}

// clampDockHeight(requested, contentRegionHeight) — one pure function, both directions.
// A requested height below the floor comes back at the floor; above the ceiling, at the
// ceiling; an unmeasured or unparseable request comes back at the box's own default.
export function clampDockHeight(requested, regionHeight) {
  const bounds = dockHeightBounds(regionHeight);
  const n = Number(requested);
  if (!Number.isFinite(n)) return bounds.defaultHeight;
  const floored = Math.max(Math.floor(n), bounds.min);
  return bounds.max == null ? floored : Math.min(floored, bounds.max);
}

// dockDefaultHeight(contentRegionHeight) — the height the dock OPENS at, clamped.
export function dockDefaultHeight(regionHeight) {
  return dockHeightBounds(regionHeight).defaultHeight;
}
