// The fleet slot's two VIEWPORT-KEYED decisions, as pure functions (milestone 47 / story 03;
// DESIGN §DG-47-4 and §Surface 1's S1-C clamp, both as amended 2026-08-11 at verify).
//
// WHY THIS MODULE EXISTS AND WHY IT IS NOT A SECOND HOME. `scope.mjs` owns ONE question — "what
// is this view narrowed to" (ADR-001). Neither decision here is a narrowing: one is what the
// slot's two reader's AIDS look like at a given width, the other is where a popover may sit
// without leaving the viewport. Putting layout arithmetic in the narrowing home would be the
// same "half of an existing concept" mistake ADR-001 refuses, pointed the other way. This file
// exports no narrowing vocabulary, names no query key, and is not named for the filter — the
// three things `acd-fleet-filter-single-home` actually tests.
//
// WHY PURE FUNCTIONS RATHER THAN CSS MEDIA QUERIES. Both rules were BROKEN in the build verified
// on 2026-08-11 (F-47-V-2, F-47-V-3) and neither break was visible to any lane: the harness is a
// mini-React tree with no layout and no stylesheet, so a `hidden sm:inline` would have been
// asserted — if at all — by reading class names out of the source, which is the "source grep
// wearing a behavioural suite's clothes" defect this milestone already carries as a finding. A
// pure function is executable, so the DECISION is pinned headlessly and the RENDER only has to
// prove the wiring.

// DG-47-4's breakpoint — `sm` (640), the SAME boundary S1-B's fixed 150px slot binds at.
//
// [MOVED 390 -> 640 on 2026-08-13 (verify pass 3), DG-47-4's F-47-V-23 ruling.] It was `<= 390`,
// keyed there to match the nav's `shell-nav.mjs` NAV_DISCLOSURE_BREAKPOINT "so the bar's two
// viewport-keyed behaviours change form at the same width". Two things were wrong with that:
//
//   1. **They are not one bar's behaviours.** The nav lives in the 48px TOP bar; these aids live in
//      the 40px SURFACE bar below 1024. Different bars, different occupants, different budgets.
//      Keying one bar's degradation to another bar's breakpoint is a hand-computed ceiling wearing
//      different clothes — a number only ever correct for occupants it was never measured against.
//      Coherence is not a budget. The coupling is deliberately BROKEN, and `shell-nav.mjs` keeps
//      its own 390 unchanged.
//   2. **It left 391..639 inverted.** F-47-V-19 moved the fixed slot to `sm` (>=640) and did not
//      move this, so in that band the two UNPROTECTED aids kept their words while the PROTECTED
//      repo filter had no reserved width — the protected element paying for the unprotected ones,
//      which is the exact inversion of DG-47-4's ruling. Measured on the live build before this
//      change, the trigger's residual was NON-MONOTONE: **167.77px at 390, 92.73px at 480, 212.73px
//      at 600** — 75px NARROWER one designed drop above the width where it was in full. A
//      viewport-keyed form whose protected element gets worse as the viewport gets wider is not a
//      degradation ladder; it is a cliff at a boundary nobody chose.
//
// ONE BAR, ONE BOUNDARY: below `sm` the aids are glyphs and the trigger takes the residual; at and
// above it the aids carry words and the trigger takes its fixed 150px. No new breakpoint is
// introduced — `sm` is already this page's `px-4 sm:px-8`. The boundary MOVES; it does not become
// dynamic: keying the drop to remaining space would make the aids' form a covert signal about the
// freshness string's length, which the rule below forbids in terms.
export const SLOT_AID_DROP_WIDTH = 640;

// The gutter the popover keeps between itself and the viewport edge (DESIGN S1-C, amended).
export const POPOVER_GUTTER = 8;

// slotAidForm(viewportWidth) -> "glyph" | "words"
//
// DG-47-4's rule: at <= 390 `⟳ refreshed Ns ago` and `◷ legend` give up their WORDS, whole,
// keeping their pinned glyphs, with the words moving into `title` and `aria-label`. The two drops
// are TAKEN TOGETHER — one call, one answer, two consumers — because DESIGN rules them together
// and a bar that dropped one aid and not the other would be a third form nobody specified.
//
// KEYED TO THE VIEWPORT, NEVER TO THE DATA. A drop that came and went with the freshness string's
// length would make the bar's form a covert signal about how long ago the last poll was. An
// unknown width answers "words": the wide form is the one that loses nothing, so it is the safe
// default when there is nothing to key on (a headless host, a first paint before measurement).
export function slotAidForm(viewportWidth) {
  if (typeof viewportWidth !== "number" || !Number.isFinite(viewportWidth)) return "words";
  // STRICTLY BELOW, so the constant IS the `sm` boundary rather than one pixel under it — the same
  // number S1-B's fixed slot starts at, spelled once and compared the way Tailwind's `sm:` does.
  return viewportWidth < SLOT_AID_DROP_WIDTH ? "glyph" : "words";
}

// clampedPopover({ anchorRight, popoverWidth, viewportWidth, gutter }) -> { right, maxWidth }
//
// Where a right-anchored popover may actually sit. `right` is the offset to apply against the
// anchor's own right edge (0 = the natural right-aligned position, negative = shifted rightwards
// to stay on screen); `maxWidth` caps it to the content rail.
//
// THE DEFECT THIS EXISTS TO STOP (F-47-V-3, measured 2026-08-11). The picker is `w-72` (288px)
// anchored `right-0` to a trigger whose right edge at 390 sits at x≈225 — so its left edge landed
// at **x = −62.9**, and because the page root is `overflow-x: clip` (D1's own backstop) the
// overflow was not scrolled to but SILENTLY CUT. Every repo name lost its head. Note that a
// `max-width` alone does NOT fix it: 288 is already less than the available 359, so the cap never
// binds — the ANCHOR is what is wrong, not the width. That is why this returns an offset.
//
// The principle, and it generalises past this popover: truncation announces itself, clipping does
// not. A control may shorten what it shows; it may not silently hide that it has.
//
// DEGRADES TO THE NATURAL POSITION when it has nothing to measure — an unknown anchor or viewport
// yields `{ right: 0, maxWidth: null }`, i.e. exactly today's behaviour. A headless host has no
// layout, and a clamp computed from guesses would be a fiction dressed as a measurement.
export function clampedPopover({ anchorRight, popoverWidth, viewportWidth, gutter = POPOVER_GUTTER } = {}) {
  const known = (value) => typeof value === "number" && Number.isFinite(value);
  if (!known(anchorRight) || !known(popoverWidth) || !known(viewportWidth)) {
    return { right: 0, maxWidth: null };
  }
  // Never wider than the rail between the two gutters.
  const maxWidth = Math.max(0, viewportWidth - gutter * 2);
  const width = Math.min(popoverWidth, maxWidth);

  // At `right: 0` the popover's left edge sits at `anchorRight - width`. If that is inside the
  // left gutter, shift it rightwards by making `right` negative — exactly enough to land ON the
  // gutter and no further, so the popover stays as close to its anchor as the viewport allows.
  let right = 0;
  const naturalLeft = anchorRight - width;
  if (naturalLeft < gutter) right = naturalLeft - gutter;

  // ...and having shifted right, it must not now run off the RIGHT edge. This second clamp only
  // engages when the anchor itself is near the right edge on a viewport too narrow for both, and
  // it wins: a popover that overflowed right would be cut by the same `overflow-x: clip`.
  const rightEdge = anchorRight - right;
  if (rightEdge > viewportWidth - gutter) right = anchorRight - (viewportWidth - gutter);

  return { right, maxWidth };
}
