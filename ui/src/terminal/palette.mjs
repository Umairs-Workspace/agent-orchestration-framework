// The ONE terminal control's DESIGN VALUES (milestone 46 / story 03 — DG-46-2 and DESIGN's
// merged-ramp table). A framework-free ESM module — no React, no DOM — so both consumers
// read the SAME values and `node:test` can drive anything that depends on them.
//
// DG-46-2: THE TERMINAL SURFACE PALETTE IS FIVE HEX LITERALS WITH NO HOME. They were typed
// as literals in two files. They are the one legitimate divergence from the light theme
// (m03/DESIGN documented default 4 — "the xterm viewport is dark; terminals read best dark;
// this is a deliberate, scoped divergence"), and after this milestone they are painted by
// ONE component, so a second copy is a second product.
//
// TWO RULES ON THIS FILE, both fixed by DG-46-2 so whoever reads it is not re-deciding them:
//   1. These do NOT become `@theme` tokens. A dark theme is beyond this milestone's ramp and
//      is milestone 45's open question 6 to settle.
//   2. The Tailwind class strings STAY LITERALS THE SCANNER CAN SEE — one constant that both
//      consumers read, and it stays a literal. That is m45's GAP-4 lesson, not an invitation
//      to build class names at runtime.
//
// BOTH CONSUMERS READ FROM HERE: the xterm `theme: { background, foreground }` object and
// the documented class list.

// ─── DG-46-2 — the five hex literals, one home ─────────────────────────────────────────
// The byte area the terminal paints into.
export const TERMINAL_VIEWPORT_BG = "#0b0f14";
// The chrome around it — the header, the footer bar.
export const TERMINAL_CHROME_BG = "#0f1629";
// Every border on the dark surface (and the read-only pill's).
export const TERMINAL_BORDER = "#1e2a44";
// The provider picker's well.
export const TERMINAL_PICKER_WELL_BG = "#0b1120";
// The xterm foreground — the fifth, and it travels with the other four.
export const TERMINAL_FOREGROUND = "#d7dde3";

// CONSUMER 1 — the xterm `theme` object, built from the same two constants.
export const TERMINAL_XTERM_THEME = Object.freeze({
  background: TERMINAL_VIEWPORT_BG,
  foreground: TERMINAL_FOREGROUND,
});

// CONSUMER 2 — the documented class list. Literal strings, so the Tailwind scanner sees
// them exactly as it would in JSX.
export const TERMINAL_VIEWPORT_BG_CLASS = "bg-[#0b0f14]";
export const TERMINAL_CHROME_BG_CLASS = "bg-[#0f1629]";
export const TERMINAL_BORDER_CLASS = "border-[#1e2a44]";
export const TERMINAL_PICKER_WELL_BG_CLASS = "bg-[#0b1120]";
export const TERMINAL_FOREGROUND_CLASS = "text-[#d7dde3]";

// The header controls' hover treatment, and it is here for the SAME reason the four above are:
// it spends the border literal, so a copy typed at a render site would be a second home for one
// of DG-46-2's five values — which is exactly what the gate refuses. `text-zinc-100` is the
// hover-only text step from the design ramp.
export const TERMINAL_HOVER_BG_CLASS = "hover:bg-[#1e2a44] hover:text-zinc-100";

// The read-only pill, as it ships — the existing quiet pill, carrying the border literal above
// (DESIGN §Read-only is a posture, point 3), with the committed mock's tracking (`0.08em`).
export const TERMINAL_READ_ONLY_PILL_CLASS =
  "rounded border border-[#1e2a44] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400";

// ─── The chrome type ramp (committed mock) ─────────────────────────────────────────────────
// The `▣ TERMINAL` lockup: 11px / 600 / 0.1em on `text-zinc-300` (`#d4d4d8`). The tracking is
// the mock's; DESIGN's checklist said `tracking-wide` (0.025em), which is a quarter of it.
export const TERMINAL_LOCKUP_CLASS = "text-[11px] font-semibold tracking-[0.1em] text-zinc-300";

// THE TERMINAL'S OWN TYPE, and the pair is what fixes the mirror's intrinsic screen box. A
// 13px/17px mono cell is 8x17px, so the worker's 80x24 screen is exactly the 640x408 the mock
// draws and scales. xterm takes the line height as a MULTIPLE of the font size, so it is derived
// here rather than typed twice — the two numbers stay a pair.
export const TERMINAL_FONT_SIZE = 13;
export const TERMINAL_LINE_HEIGHT_PX = 17;
export const TERMINAL_LINE_HEIGHT = TERMINAL_LINE_HEIGHT_PX / TERMINAL_FONT_SIZE;
export const TERMINAL_FONT_FAMILY = "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)";

// The byte area's own frame inside the chrome: an 8px gutter on the sides and the bottom, 4px
// radius. Read off the mock's `margin:0 8px 8px; border-radius:4px` on S1 and S2.
export const TERMINAL_BYTE_AREA_FRAME_CLASS = "mx-2 mb-2 rounded";

// THE TILE'S BYTE BOX IS THE SOURCE'S OWN ASPECT (m49/DESIGN §S2's C2), and it is a fix rather
// than a preference: the control's non-dock box was a hard-coded `h-48` — the FLEET CARD's
// constant 192px panel — which inside a ≈394px grid track leaves a visible letterbox band above
// and below the mirror's 640×408 picture. A band in a TILE is a design gap (the one in the
// fullscreen overlay is expected, because there the aspect is the viewport's). 640/408 is the
// SAME pair the geometry rule scales, derived from 80×24 at this file's own 13px/17px cell, so
// the box and the picture cannot drift apart — and it is what makes the mock's 394×318 tile
// arithmetic rather than a number anybody typed.
export const TERMINAL_TILE_BOX_CLASS = "aspect-[640/408] w-full";

// THE FOCUS RING IS THE HOUSE'S, NOT THE USER AGENT'S (DESIGN §focus model 5, designer's GAP-2).
// Measured on the deployed build: the tile's ring computed to the UA default — 1px, no offset, no
// token — which is the IDENTICAL treatment a nav text link gets, so a focused tile was
// indistinguishable from an unfocused one across a grid, and on the expanded pane's `#0b0f14` a UA
// ring is invisible by construction. `--color-ring` is `index.css`'s own token; 2px and an offset
// are what make it unmistakable at a glance, which is the rule's own words.
export const TERMINAL_FOCUS_RING_CLASS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]";
// …and INSET on the expanded byte area, whose box is the viewport's edge: an outward offset there
// would be clipped. BASELINE §S3's own value (`outline-offset: -2px`), which DESIGN is silent on.
export const TERMINAL_FOCUS_RING_INSET_CLASS =
  "focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-[var(--color-ring)]";
// The fleet card's own panel height, named where every other measurement of this control lives
// rather than typed at a render site (it was `h-48`, at the one place that could not tell whose
// number it was).
export const TERMINAL_CARD_BOX_CLASS = "h-48";

// terminalPaneBoxClass(paneBox) — the host's declared box SHAPE, as this module's own class. The
// shape is `host-model.mjs`'s decision and the CLASS is this file's, so the `.tsx` asks once and
// renders the answer instead of holding a three-way ternary over two vocabularies.
export function terminalPaneBoxClass(paneBox) {
  if (paneBox === "fill") return "flex-1";
  return paneBox === "aspect" ? TERMINAL_TILE_BOX_CLASS : TERMINAL_CARD_BOX_CLASS;
}

// ─── C1's yield order, and it is keyed to the HEADER, never the viewport ───────────────────
// DESIGN §S2 fixes the order as DISCRETE DROPS, never a shrink factor — the m38 DG-13/DG-16
// lesson that "no two elements may occupy the same pixels, and a lower-priority element gives up
// space rather than being overprinted": (1) the `· session <id>` tail, whole, with its separator;
// (2) the `▣ TERMINAL` word, glyph kept; (3) the header wraps. Step 3 is S2's alone — S1's C1
// "never wraps to two rows" at any documented width.
//
// EVERY THRESHOLD IS A CONTAINER QUERY (`@container` sits on the header), and that is a fix
// rather than a preference. These were VIEWPORT breakpoints (`sm:`, `md:`), which ask how wide
// the WINDOW is when the box that runs out of room is the HEADER. Both halves measured on the
// running system, 2026-08-09:
//   · the fleet card is ~395px wide inside a 1280 viewport, so `md:` read TRUE: the header kept
//     the whole session tail and truncated the REF instead — CONFORMANCE C13 exactly inverted;
//   · the 390 dock header measured `scrollWidth 451` against `clientWidth 390`, so `✕ Close
//     terminal dock` laid out at `x 423–451` in a 390-wide frame — THE DOCK COULD NOT BE CLOSED —
//     while the identity collapsed to width 0 beneath `provider:`, the overprint the rule forbids.
//
// The dock's intrinsic header is that 451px: `▣ TERMINAL` 79 · identity · provider picker 139 ·
// state chip 38 · controls 124 · `px-4` 32 · four `gap-x-3.5` 56. Dropping the word frees ~68 and
// clears the overflow — but leaves the ref at ~7px, so S1 needs a step where S2 has its wrap.
export const TERMINAL_YIELD_TAIL_CLASS = "@xl:inline"; // ≥576px — first to go: half an id names nothing
export const TERMINAL_YIELD_WORD_CLASS = "@lg:inline"; // ≥512px — the glyph never yields with it
// S1'S STEP 3, IN PLACE OF S2'S WRAP — FLAGGED, NOT CLAIMED AS CONTRACT. DESIGN gives S1 no third
// step while forbidding it the wrap that is S2's third, so at 390 the dock runs out of ORDER
// before it runs out of OVERFLOW. What yields is the muted FIELD LABELS (`item`, `provider:`) —
// decoration by DESIGN's own words ("`item` is a muted FIELD LABEL, never part of the identity"),
// each with an accessible name that survives the drop (the identity carries `title`, the picker
// carries `aria-label="Agent provider"`). It frees ~84px, which is what buys the ref its ~91px.
// THE OWNER REF, THE STATE CHIP AND THE CONTROLS NEVER YIELD. Carried to `aof-designer` with the
// conformance renders: S1's yield order is a genuine contract gap, recorded rather than invented.
export const TERMINAL_YIELD_FIELD_LABEL_CLASS = "@md:inline"; // ≥448px

// STEP 4 — AND IT IS THE HEADER'S OWN CHROME, NEVER ITS CONTENT (design GAP G4, ruled by
// `aof-designer` 2026-08-09). After step 3 the 390 dock was still ~10px short in its two WIDEST
// states — `waiting` (whose `waiting for output` is the longest word in the ramp) and `ended`
// (which gains the `↻` control) — and the only element in the row that could give was the
// identity's own `min-w-0 truncate`. So CSS acted as an unowned fourth step and ate the OWNER REF,
// which DESIGN's yield order names as never dropped at any width: measured `46…` and `46/_`.
//
// The authorised step 4 is therefore to tighten the gaps and the side padding, which costs a
// reader nothing and recovers ~30px against a ~10px shortfall. It is mock-sanctioned rather than
// invented — the committed mock's own 390 sample tightens S2's header to `gap:8px 10px` for
// exactly this reason. The pair with `TerminalIdentity`'s dropped `truncate` is what makes the
// rule hold BY CONSTRUCTION: with nothing left to silently shrink, an overflow that survives all
// four steps surfaces as a visible layout bug instead of a corrupted name.
export const TERMINAL_HEADER_CHROME_CLASS = "gap-x-2 px-2 @md:gap-x-3.5 @md:px-4";

// ─── The state ramp's non-colour + colour classes ──────────────────────────────────────
// THE SOURCE OF THESE VALUES IS `DESIGN.md` §The merged ramp, whose table names the Dot class
// and Label class for every state. They are read out of that table and TYPED HERE AS
// LITERALS — they are NOT resolved at runtime through the run chip's / assignment chip's
// class map, and that non-derivation is deliberate:
//   · this module must stay framework-free and import-free (ADR-001), and that map lives
//     inside a surface folder the shared set may not import (ADR-005);
//   · the Tailwind scanner must see every class as a literal (DG-46-2 / m45's GAP-4).
// THE CONSEQUENCE, STATED SO IT IS NOT DISCOVERED: these are a SECOND WRITING of the ramp's
// tokens, not a second SOURCE for them. If DESIGN's table changes, this changes with it, and
// nothing here will notice on its own. They are also not byte-identical to every chip
// elsewhere in the product — the board's detail panel and the fleet's own chips use
// `bg-muted-foreground/50` where DESIGN's terminal table rules `bg-muted-foreground` — and
// DESIGN is what this control follows.
// (Written out rather than left implied because the false comment this milestone exists to
// kill — "the tie is held by test/fleet-terminal-view-geometry.test.mjs", a file that never
// existed — was exactly a comment claiming a mechanism that was not there.)
export const TERMINAL_DOT_CLASS_MUTED = "bg-muted-foreground";
export const TERMINAL_DOT_CLASS_SECONDARY = "bg-secondary";
export const TERMINAL_DOT_CLASS_PRIMARY = "bg-primary";
export const TERMINAL_DOT_CLASS_DESTRUCTIVE = "bg-destructive";
// The house's absent/not-yet primitive — dashed and hollow, NOT a failure treatment.
// MOCK-CORRECTED (2026-08-08, `mocks/Terminal Panel Spec.dc.html`): the committed mock draws the
// dashed ring at FULL `hsl(218 9% 38%)`, not at /40. On `#0b0f14` the 40% ring was barely a shape
// at 7px, and the dot's SHAPE is the second of DESIGN's four non-colour signals — a hollow dash
// nobody can see is colour travelling alone.
export const TERMINAL_DOT_CLASS_ABSENT = "border border-dashed border-muted-foreground bg-transparent";

// The state dot's SIZE. 7px, from the committed mock (DESIGN's checklist implied the house's 8px
// `h-2 w-2`); it is here rather than at the render site because it is a design value and this is
// their one home.
export const TERMINAL_STATE_DOT_CLASS = "h-[7px] w-[7px]";

export const TERMINAL_LABEL_CLASS_MUTED = "text-zinc-400";
// THE SIXTH NAMED VALUE, AND IT IS A MEASURED ACCESSIBILITY FIX RATHER THAN A PREFERENCE.
// PO ruling, 2026-08-08, on the committed mock (`mocks/CONFORMANCE.md` §3a / PO-1) — RAISED before
// it was painted, which is what `04/04.feature:264` requires of any value outside DESIGN's five.
//
// THE MEASUREMENT, which is the whole argument:
//   · DESIGN §The merged ramp and this file both said `text-primary` — `@theme` resolves it to
//     `hsl(174 72% 27%)` (≈ `#13766D`). On the terminal chrome `#0f1629` that is **3.29:1**, and
//     it FAILS WCAG 2.1 AA (4.5:1) for an 11px state word.
//   · The mock's `hsl(174 58% 52%)` (≈ `#3ECCBD`) on the same chrome is **9.06:1**.
// So the LIVE state — the one word DESIGN ranks first among its four non-colour signals — was the
// only word in the ramp not carrying its own contrast.
//
// THE DOT DELIBERATELY DOES NOT MOVE. A non-text indicator needs 3:1 (SC 1.4.11) and the darker
// token clears it at 3.29:1, so `TERMINAL_DOT_CLASS_PRIMARY` stays on-token and only the WORD
// lightens. Two values, two contrast rules, one hue.
//
// IT ADDS NO `@theme` TOKEN. A dark theme is beyond this milestone's ramp (45/DESIGN open question
// 6); this is a second TEAL on the dark surface only, living in DG-46-2's own one home, and it
// stays a literal the Tailwind scanner can see.
export const TERMINAL_LABEL_CLASS_PRIMARY = "text-[hsl(174_58%_52%)]";
export const TERMINAL_LABEL_CLASS_FAILURE = "text-red-400";

// MOTION is the third of DESIGN's four ranked non-colour signals, and it gets its class home
// here beside the other three columns of that table. Without it a consumer would map
// `"pulse"` to `animate-pulse` by hand at the render site — which is the second home this
// milestone exists to prevent, arriving one column at a time.
//
// `none` is the EMPTY string on purpose: motion is on exactly the two states that mean
// "expect this to change" — `connecting…` and `streaming`, and no other row — and every other
// state must emit no animation class at all rather than an inert one. An inert class would be a
// second thing to keep true.
//
// THE REDUCED-MOTION ESCAPE IS ONE CSS RULE, AND IT IS READABLE FROM TWO ARTEFACTS WITHOUT
// RUNNING ANYTHING. `ui/src/index.css`'s `@media (prefers-reduced-motion: reduce)` block names
// `.animate-pulse` — the selector for the very utility `pulse` resolves to on the next line —
// beside the `.aof-pending` shimmer it has always named, and sets `animation: none`. Read this
// map's value and that block's selector side by side: the escape is either there or it is not.
// The class stays the house's own utility rather than a terminal-local animation precisely so
// that one block can carry it (49/ARCHITECTURE §Fitness functions, MECHANISM RULING).
//
// THIS COMMENT WAS FALSE UNTIL 49/06 AND IS CORRECTED RATHER THAN DELETED. It pointed at
// `ui/src/index.css` as the escape's home while that file's reduce block reached `.aof-pending`
// alone — a different class over a different animation — so both pulses kept animating for
// operators who had asked their system to stop them. One pulsing dot on one card hid it; a grid
// of a dozen is what exposed it. A defect plus a comment asserting it is handled is worse than
// an unhandled defect, because it stops the next reader looking — which is why
// `acd-motion-has-an-escape` reads COMMENT-STRIPPED source and takes no sentence's word for it.
export const TERMINAL_MOTION_CLASS = Object.freeze({
  none: "",
  pulse: "animate-pulse",
});

// The unavailable pane's centred dashed block — the house's absent primitive re-homed onto
// the dark chrome (DESIGN §The unavailable pane).
export const TERMINAL_UNAVAILABLE_BLOCK_CLASS =
  "rounded-md border border-dashed border-[#1e2a44] px-4 py-3 text-center";
