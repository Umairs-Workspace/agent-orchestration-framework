// The assign affordance's own state machine — milestone 38 / story 04 / task 06
// (DESIGN §Surface 2, "Amendment 2026-07-24 (F22, live soak)"; rules A7/A8/A9/A10
// and the affordance States table).
//
// WHY THIS IS A PURE HELPER. This repo ships no React test harness, so the house
// pattern (ui/src/fleet/scope.mjs, ./assignments.mjs, ../board/runs.mjs) is:
// render-logic that must be node:test-exercisable lives in a pure .mjs helper
// with a .d.mts sibling, and the .tsx is a thin consumer. Fleet.tsx's
// AssignAffordance holds NO transition logic of its own — it calls `runAssign`
// for the click and renders exactly what `assignAffordanceView` returns.
//
// WHAT F22 WAS. The 2026-07-24 two-machine soak clicked `Assign →`, got a
// `200 ok`, and the surface said NOTHING: no transition, no pending indicator,
// no chip. The operator only knew the call had succeeded by reading the raw API
// response. On a monitor that repaints itself every 5s, "nothing changed" is
// indistinguishable from "nothing happened".
//
// THE TWO TREATMENTS, because they do two different jobs (the designer's
// decision, built here verbatim):
//   (a) the DURABLE record arrives promptly — on a 2xx the surface fires EXACTLY
//       ONE additional SILENT, keep-last-good status re-load, so region 5's m35
//       `assigned` chip lands within a round trip instead of up to one poll
//       interval later (A8);
//   (b) the affordance acknowledges the CALL locally and TRANSIENTLY — the SAME
//       button reads `Sent` in the `muted` ramp with the picker frozen on the
//       chosen node, held for exactly one poll interval, then decaying to the
//       terminal resting state with nothing left over (A7).
//
// THE VOCABULARY BOUNDARY THAT KEEPS THIS ONE RAMP (A8). The word is `Sent`, not
// `Assigned`: `assigned` is the m35 ramp's word for the assignment's STATE, and
// region 5 speaks it alone. `Sent` is a DIFFERENT fact no other region reports —
// *the route accepted your request* — so it can neither duplicate nor contradict
// the chip. A dispatch can be sent and the assignment can then fail (which is
// literally what the soak saw at +1.5s) and both statements stay true on screen.
// The affordance reports the CALL; region 5 reports the ASSIGNMENT. No mark is
// borrowed either — `✓` is the m35 ramp's mark for `done`.

// ADR-014 clause 4 — the two pure helpers region 5's ONE ladder ranks. They are
// imported HERE, beside the decision, rather than derived in the component that
// renders them: rung 1 is a rule about the exact length of the chip's tail, and
// a rung whose subject is built in another file is the two-homes shape this ADR
// exists to close. Both are framework-free `.mjs` (no React, no DOM, no I/O),
// which is what keeps this module `node:test`-drivable.
import { assignmentChip } from "./assignments.mjs";
import { relativeTime } from "../board/runs.mjs";

// The client poll cadence (DESIGN default / PRD §7.3): visibility is poll /
// relay-presence, NEVER a push event stream — the client opens no WebSocket/SSE.
// It lives HERE, beside the hold below, because the two are ONE number by design
// and must never drift: the worst case for the next scheduled poll landing after
// a click is exactly one interval, so a hold of one interval guarantees there is
// never a moment between the click and a confirmation in which the surface says
// nothing — even if the success re-load fails silently.
export const POLL_MS = 5000;

// A7/A8 — the `Sent` acknowledgment is held for EXACTLY one poll interval and
// then decays. It doubles as a re-click guard: with the action disabled for the
// window, the operator cannot fire a second dispatch into a projection that has
// not caught up and collect a `destructive` "already active" refusal one second
// after a success.
export const ASSIGN_SENT_HOLD_MS = POLL_MS;

// DG-14 clause 1 (DESIGN §Surface 2, Amendment 2026-07-24 (b)) — a hung POST is
// a REFUSAL, not a limbo. The affordance stops waiting at TWO poll intervals,
// DERIVED from the one constant this surface already speaks in (the `Sent` hold
// is one interval, for the mirror-image reason). One interval is too eager for a
// cross-machine POST; two is past the point any answer is still useful. It is
// pinned exactly the way ASSIGN_SENT_HOLD_MS is: expressed in POLL_MS here, and
// MEASURED at its consumption site on the mounted app's own clock — never a
// second literal anyone could drift.
export const ASSIGN_TIMEOUT_MS = POLL_MS * 2;

// The affordance's own state axis (the story-04 state set). `rest` covers both
// the pristine and the decayed-after-`sent` cases — the design's TERMINAL
// RESTING STATE is the SAME state as the initial one (picker enabled, the same
// node still selected, `Assign →` back in its `primary` tint, message slot
// empty): "nothing of the acknowledgment persists."
export const ASSIGN_PHASE_REST = "rest";
export const ASSIGN_PHASE_SENDING = "sending";
export const ASSIGN_PHASE_SENT = "sent";
export const ASSIGN_PHASE_REFUSED = "refused";

// The two labels the action ever reads besides its rest label. `Assigning…` is
// sub-perceptual for a millisecond-latency local POST — an honest state for a
// slow call, but NEVER the acknowledgment; it flows straight into `Sent`.
export const ASSIGN_LABEL_REST = "Assign →";
export const ASSIGN_LABEL_SENDING = "Assigning…";
export const ASSIGN_LABEL_SENT = "Sent";

// ── DG-13 · the row's BINDING GEOMETRY (A10, amended 2026-07-24) ─────────────
//
// The real-assign render showed A10's "rhythm" is not only a spacing idiom: in
// the refused frame the picker collapsed to a BARE CHEVRON (~26px, from ~284px)
// while the error took the row — the operator could not see which node was
// selected at the exact moment they had to re-aim — and in the success frame the
// action narrowed 67px -> 44px on the `Sent` label swap, so the picker absorbed
// the difference and the row reflowed on every state change.
//
// The three widths below are therefore DERIVED here, once, and handed to the
// component by `assignAffordanceView` — the component holds no geometry of its
// own, exactly as it holds no label and no hold window of its own.

// Every label the action ever reads. The action's reserved width is sized to the
// LONGEST of them (`Assigning…`), so a label swap can never move another element
// (clause 1). Derived, so adding/renaming a label cannot leave the width behind.
export const ASSIGN_ACTION_LABELS = Object.freeze([ASSIGN_LABEL_REST, ASSIGN_LABEL_SENDING, ASSIGN_LABEL_SENT]);
export const ASSIGN_ACTION_WIDTH_CH = Math.max(...ASSIGN_ACTION_LABELS.map((label) => label.length));

// Clause 2 — the picker's FLOOR: at least this many characters of the node id
// must render, in EVERY state, beside the chevron. "A picker collapsed to a bare
// chevron is FORBIDDEN: a control the operator must re-aim may not be anonymous
// at the moment they re-aim it." The picker renders in the `mono` ramp, so `ch`
// here is the exact character advance, not an approximation.
export const ASSIGN_PICKER_FLOOR_CH = 14;

// …and the select's own chrome, which `box-sizing: border-box` counts INSIDE a
// width: its horizontal padding, its border, and the native dropdown chevron.
// The floor is "≥14ch of the node id PLUS the chevron", so the chevron's own
// room is added to the floor rather than eaten out of it.
export const ASSIGN_PICKER_CHROME = "2.5rem";

// ── DG-14 / DG-13 clause 4 · the message slot's copy ─────────────────────────

// DG-14 clause 3 — VERBATIM. NOT "not sent", NOT "failed to assign": a timed-out
// POST may have succeeded server-side. The affordance reports the CALL (A7);
// region 5 stays the sole authority on whether anything was assigned, and the
// poll keeps running underneath, so the chip appears on its own if the record
// landed.
export const ASSIGN_MESSAGE_TIMED_OUT = "no answer — timed out";

// The long form the message slot carries in its native `title` (clause 3's
// idiom, the one DG-10 already uses for the session id) — it says the honest
// thing the short copy has no room for: the outcome is UNKNOWN, not negative.
export const ASSIGN_DETAIL_TIMED_OUT =
  `The dispatch has not answered after ${ASSIGN_TIMEOUT_MS / 1000}s (two poll intervals), so the affordance stopped waiting. `
  + "It reports the CALL only: the request may still have succeeded on the server. "
  + "The board's own poll remains the authority — if the record landed, the assignment chip will appear on this card by itself.";

const ASSIGN_MESSAGE_FALLBACK = "Assign failed";

// DG-13 clause 4 — "the message may not re-state what the card already says".
// The raw server sentence `Item "18" already has an active assignment held by
// "umamis-mac-mini" (state "assigned")` spends its width on the ref, which
// region 1 already shows, and truncates away the only fact NO other region
// carries: the holder. Copy priority is therefore **outcome > holder > all
// else**, and the affordance shapes its own message from the verb's CODED
// envelope (`{ ok:false, code, holder }`, src/commands/mesh-assign.mjs — the
// route forwards its extra fields verbatim) instead of printing the sentence.
//
// The map covers EXACTLY the four verb codes whose sentence leads with a fact
// another region already carries (the ref, or the node id the picker is showing
// two elements to the left). Every other coded refusal — the route's workspace
// and identity codes — already leads with its own outcome, so its sentence
// stands unshaped rather than being re-worded here on a guess. The FULL server
// text is kept in the `title` in every case; nothing is discarded, only ranked.
export const ASSIGN_REFUSAL_COPY = Object.freeze({
  // DESIGN's own worked example, verbatim: `already assigned → umamis-mac-mini`.
  "assignment-already-active": "already assigned",
  "assignment-target-unknown": "unknown node",
  "assignment-repo-unavailable": "no published repo",
  "ref-not-found": "item not found",
});

// The full text the `title` carries — the server's own sentence, untouched.
function refusalDetail(cause) {
  if (typeof cause === "string") return cause.trim() || ASSIGN_MESSAGE_FALLBACK;
  if (cause == null) return ASSIGN_MESSAGE_FALLBACK;
  const message = typeof cause.message === "string" ? cause.message.trim() : "";
  if (message) return message;
  const text = String(cause).trim();
  return text && text !== "[object Object]" ? text : ASSIGN_MESSAGE_FALLBACK;
}

// ── DG-17 · the message slot's copy LADDER (supersedes DG-13 clause 4's single
// string; DESIGN §Surface 2, DG-17, 2026-07-24) ──────────────────────────────
//
// The re-render judged clause 4 CLOSED IN COPY, NOT IN PIXELS: the string was
// exactly `already assigned → umamis-msi` and it still rendered
// `already assigned → uma…`. The arithmetic showed the rule could not be
// satisfied — clause 2's picker floor (14ch + chrome) plus clause 1's fixed
// action plus the gaps leave ~137px of a 360.66px row for the message, while
// clause 4's OWN exemplar (`already assigned → umamis-mac-mini`) needs ~197px.
// Three clauses that cannot coexist. The RULE changed, not the build.
//
// The holder is now an ATOMIC, PROTECTED substring: it renders in FULL or it is
// not shown at all. A three-glyph prefix of a node id is indistinguishable from
// three other node ids on the same roster — strictly worse than saying nothing.
// The `destructive` token plus the mere presence of a message already carries
// "this was refused"; the HOLDER is the fact that must survive.
//
// The slot's character budget, derived from the geometry the row is actually
// built to. Measured on the judged render: the message slot is clamped to
// 136.94px, and `already assigned → umamis-msi` (29ch) has a natural width of
// ~173px in the 10.5px mono ramp — an advance of ~5.97px per character. So the
// slot carries 136.94 / 5.97 ≈ 22.9ch. FLOORED to 22, so the ladder is
// conservative: a rung that "just fits" arithmetically must still fit in pixels.
export const ASSIGN_MESSAGE_BUDGET_CH = 22;

// DG-20 — region 5's workspace-name budget, in the SAME derived-budget idiom.
// DG-16 established "full or nothing"; DG-20 established that the gate must be
// FIT, not the mere presence of a chip (otherwise absence-of-name becomes an
// accidental second signal for "this card has an assignment", which the chip
// already says). Region 5's own row is the same 360.66px, and once the chip
// (~80px), its `→ <target>` and the drill-in have taken theirs, a name has ~8
// characters of room before it would have to stub. A name at or under this
// renders beside a chip (`aof` does); a longer one is dropped WHOLE.
export const REGION5_NAME_BUDGET_CH = 8;

// …and the ONE decision that reads it (milestone 47 / story 04; ADR-008, DG-47-2).
// It lives HERE, beside the budget it consults, rather than as an inline boolean at
// the call site — a geometry contract deserves a decision the suite can drive
// directly instead of inferring from a rendered class name.
//
// THE RULE IS AN EXTENSION OF THE EXISTING GATE, NOT A SECOND GATE: the name is
// dropped when the view is REPO-FILTERED, *or* when DG-20's chip-pressure fit budget
// above says so. One boolean, because the render and DG-22's alignment consequence
// are decided together on purpose and must not be able to disagree.
//
// THE FILTERED HALF IS UNCONDITIONAL, and that is the whole of DG-20's discharge.
// `!!assignment && (repoFiltered || overBudget)` is the cheapest possible edit here
// and ADR-008 REJECTS IT BY NAME: it would make absence-of-name a second signal for
// "this card has an assignment" — DG-20's own defect, re-entered from the other
// direction. DG-47-2 discharges DG-20 only because under a filter the absence is a
// property of the PAGE: it applies to every card equally, the repo is named in full
// in the banner one region above, and it is the same string every card would have
// rendered. Gate it on the chip and all three grounds fail at once.
//
// NO BUDGET MOVES. The filter frees width; the freed width goes where the yield
// ladder already sends it (ADR-008: "no budget is relaxed to collect it"). A
// filtered card simply crosses fewer of the thresholds it already had.
export function region5NameDropped({ assignment, workspaceName, repoFiltered } = {}) {
  if (repoFiltered) return true;
  return !!assignment && String(workspaceName ?? "").length > REGION5_NAME_BUDGET_CH;
}

// ── ADR-014 (2026-08-12) · THE ROW'S MEASURED PX FACTS, AND ITS ONE LADDER ───
//
// WHY THE MODEL WAS RE-MEASURED RATHER THAN PATCHED (BLOCKER F-47-04-QA-8). The
// two budgets below used to be literals — 41 and 31 — derived from the 360.66px
// row this card takes at exactly one viewport. Measured 2026-08-12 with headless
// Chromium against the SHIPPED stylesheet, comparing every region-5 element's
// rendered box to its own content box, the card's row is a 286…368.66px band:
// 1024 yields a WIDER card (438px) than 1056 (286px), because `auto-fill` buys
// COLUMNS. A budget derived from one width is not a budget, it is a description
// of one screenshot — and 41ch (247.97px) needs a row of 428px, wider than this
// card is at ANY viewport, so that constant was never satisfiable.
//
// The same render found the defect the budgets could not express: the attention
// cluster has THREE children, not two, whenever `assignment && (inReview > 0 ||
// isDone)`, and with three nothing fits at any width — `Open board` rendered
// 0.34px of the 65.06 it needs at 286, 324, 360.66 and 368.66 alike, the chip's
// tail was cut to a 0-27px fragment, and the protected `→ <target>` truncated
// while lower-ranked elements still rendered. The ladder was not merely failing
// to engage; it was running backwards.
//
// EVERY THRESHOLD IS NOW DERIVED FROM ONE ROW — the grid's own floor. 286 = 320
// (`minmax(320px, 1fr)`, the narrowest track the page can produce, reached at
// viewport 352, 720 and 1056) − 2 (the card's `border`) − 32 (its `p-4`). The
// coupling between that 320 and this constant is asserted by
// `test/ui/fleet-assign-row-geometry.test.mjs`'s ratchet lane, so the grid cannot
// move without the ladder.
//
// THE INSTRUMENT FOR RE-MEASURING THESE NINE NUMBERS IS A RENDER, NOT THE SUITE.
// The geometry suite is a class/structure gate over a headless mount with no box
// model (it says so in its own header). Each constant therefore carries the
// STRING it was measured from; changing a label without re-measuring its px fact
// is how this row's contract came apart the first time.
export const REGION5_ROW_FLOOR_PX = 286;
// The mono ramp's exact character advance at `text-[11px]` — `→ umamis-mac-mini`
// measured 102.83px over 17 characters. Not an approximation: 41ch = 247.97,
// 31ch = 187.48, 28ch = 169.34, 13ch = 78.63, all confirmed against the render.
export const REGION5_MONO_ADVANCE_PX = 6.048;
// The pill at its widest label (`assigned` / `accepted`): 83.59px, ceiled.
export const REGION5_PILL_PX = 84;
// The chip's inner `gap-1.5` (pill → mono text) and the cluster's own `gap-3`,
// one per boundary between the cluster's children.
export const REGION5_CHIP_GAP_PX = 6;
export const REGION5_CLUSTER_GAP_PX = 12;
// The drill-in's words at their LONGEST — `Opening board...`, 91.13px ceiled —
// never the resting `Open board` (65.06). That is DG-13 clause 1's rule ("the
// reserved width is sized to the longest label") applied one element to the
// right, the same borrowing `BoardDrillIn`'s own floor already makes from clause
// 2, and it is what stops the row reflowing on click. It is also what the
// measurement demands: without it the in-flight state clips at 1280 today.
export const REGION5_DRILLIN_WORDS_PX = 92;
// …and its pinned ` →`, 13.66px — the arrow `BoardDrillIn`'s `min-w-3.5` is
// sized to. It is reserved in EVERY state, because the glyph never drops.
export const REGION5_DRILLIN_GLYPH_PX = 14;
// The THIRD child, unbudgeted anywhere before this ADR: `◔ 18 in review` is
// 76.55px (ceiled 77) and `✓ accepted` 60.22 — the widest is what is reserved.
export const REGION5_SECONDARY_WORDS_PX = 77;
// …and its abbreviated form, `◔ 188` at 32.70px (ceiled 33) — the widest of
// `◔ 18` (26.23), `◔ 188` and `✓` (9). The count survives; only the words go.
export const REGION5_SECONDARY_MARK_PX = 33;

// ch(px) — how many characters of the mono ramp the floor row has left once
// `reservedPx` is spoken for. Px are CEILED into the constants above and ch are
// FLOORED here, both conservatively, in the house idiom
// `ASSIGN_MESSAGE_BUDGET_CH` already uses ("a rung that just fits
// arithmetically must still fit in pixels"). Never negative: a row that is
// already over-subscribed has a budget of zero, not a deficit.
function region5BudgetCh(reservedPx) {
  return Math.max(0, Math.floor((REGION5_ROW_FLOOR_PX - reservedPx) / REGION5_MONO_ADVANCE_PX));
}

// The TWO-CHILD row, whole: pill + chip gap + one cluster gap + the pinned arrow
// + the drill-in's longest words = 208px, leaving 78px ≈ 12ch for the chip's
// mono slot.
const REGION5_TWO_CHILD_RESERVED_PX =
  REGION5_PILL_PX + REGION5_CHIP_GAP_PX + REGION5_CLUSTER_GAP_PX + REGION5_DRILLIN_GLYPH_PX + REGION5_DRILLIN_WORDS_PX;

// DG-19's substance — the chip's mono SLOT, and the number the ladder's first
// live rung fires on. The original finding was that the yield order SQUEEZED
// where it must DROP: at maximum pressure the LOWEST-priority element survived
// as an ellipsised stub (`· just…`) while a HIGHER-priority one (the drill-in's
// words) rendered zero glyphs. Shrink factors, however lopsided, are a squeeze —
// a squeeze cannot express a terminal drop, and a mangled timestamp fragment is
// worth less than the whole words of a navigation control.
//
// ADR-014 — it is now the FORMULA'S OUTPUT for the two-child row rather than a
// literal, and it moves DOWN, 41 → 12. Every constant on this row moves in the
// DROP direction and none moves up: this is a TIGHTENING, and ADR-008's "no
// budget is relaxed to collect the freed width" is honoured rather than
// weakened — nothing that drops today renders after it.
//
// DG-47-7 (RULED 2026-08-12) — AND THE ELEMENT THIS NUMBER USED TO RANK HAS LEFT
// REGION 5. The chip's `· <when> · <note>` tail is retired as a member of the
// row: it is not rendered at any width, in any state, filtered or unfiltered,
// and the chip's own `title` carries `→ <target> · <when> · <note>` in full,
// unconditionally — which is what it already did, so no new mechanism was
// asked for. Two reasons, and the first does not depend on the arithmetic:
//   (a) the tail is the ONE occupant of this row with no degraded-in-place form.
//       DG-19 forbade `· just…`, so its state set is exactly {whole, absent},
//       and an element that can only appear or disappear makes its own PRESENCE
//       a second signal for something the operator cannot see — the length of a
//       node id. That is DG-20's error, which the rung below already refuses for
//       the secondary token.
//   (b) the numbers make membership fiction rather than a tight fit: the
//       two-child slot is 12ch, `· 18d ago` is 10 and `→ ` is 2, leaving ZERO
//       characters for the node id — and the target (rung 4) outranks the tail,
//       so it takes the slot first. The three-child slot is 0ch.
//
// THE RUNG KEEPS ITS NUMBER AND ITS BUDGET; ONLY ITS ELEMENT LEFT, so the ladder
// still maps 1:1 onto ADR-014's derivation and nothing occupies rung 1. This
// constant therefore keeps BOTH its name and its subject — the chip's mono slot,
// which the protected `→ <target>` now holds alone. It is DG-19's rung that is
// amended by DG-47-7, NOT DG-13 clause 5: clause 5's width priority names the
// chip label + `→ <target>`, `Open board →` and the workspace name, and has
// never named the tail (m38/DESIGN.md §DG-19). The clause the whole geometry
// contract rests on is untouched.
export const REGION5_CHIP_SLOT_BUDGET_CH = region5BudgetCh(REGION5_TWO_CHILD_RESERVED_PX);

// …and the point at which the drill-in gives up its WORDS. Shrink factors were
// tried first and measured wrong: with a 1000:1 ratio the drill-in still only
// yielded 13.1px while the chip — weighted 1 — yielded 17.5, so the target
// truncated anyway. Flexbox distributes a squeeze; it will not express "this
// element goes away so that one can be whole". So the abbreviation is a DISCRETE
// rule like the two above it: once `→ <target>` alone needs more than this, the
// words are dropped and the drill-in renders as its pinned `→` (label in the
// `title`), which frees the largest single reservation on the row (92px — more
// than any other rung buys).
//
// It is the SAME NUMBER as the slot budget above, and after DG-47-7 it is also
// the same RUNG — so the choice of keeping two names for it is deliberate and is
// recorded here rather than left to be inferred. They are two SUBJECTS: the one
// above is the chip's mono SLOT (what the row leaves for `→ <target>`), this one
// is the THRESHOLD at which the drill-in's words go. They are derived separately
// from the same base rather than aliased, so a row that ever gives them
// different bases changes one and not the other; and both stay exported because
// each is a handle the geometry suite reads back by name.
export const REGION5_DRILLIN_ABBREV_AT_CH = region5BudgetCh(REGION5_TWO_CHILD_RESERVED_PX);

// region5RowLadder(row) — ADR-014 clause 4: THE ONE DERIVATION, and the reason
// it is one is structural rather than hygienic. `abbreviateDrillIn` (Fleet.tsx)
// and `slotFits` (AssignmentChip.tsx) were the second and third instances of
// exactly the shape ADR-008 refused for the name drop, and they were worse than
// untidy: TWO INDEPENDENT BOOLEANS CANNOT EXPRESS ONE LADDER. Rung 2's outcome
// changes rung 4's budget; rung 1's changes rung 2's. A decision taken in two
// components, each seeing one element, is structurally incapable of being right
// — which is why F-47-04-QA-8 was a CLASS of frame rather than a typo.
//
// THE THIRD CHILD IS A SUBTRAHEND, NOT A RUNG. Cluster ARITY changes the budget
// every existing rung is compared against; it does not change WHO YIELDS FIRST.
// DG-13 clause 5, DG-16, DG-19, DG-20 and DG-22 are EXTENDED, not re-decided —
// no existing pairwise ordering moves. The full yield order, with ADR-014's one
// new rung named:
//   0. the workspace NAME      — dropped WHOLE with its separator, unconditional
//      under the filter (`region5NameDropped`, above), else at its own budget.
//   1. the chip's `· when · note` TAIL — RETIRED from the row by DG-47-7
//      (2026-08-12). The rung keeps its number and its budget so this ladder
//      still maps 1:1 onto ADR-014's derivation; nothing occupies it, and the
//      chip's `title` carries the whole string unconditionally instead.
//   2. `Open board`'s WORDS    — dropped whole, the pinned `→` kept, in EVERY
//      state (its `title`, and the control's `aria-label`, carry them).
//   3. NEW — the SECONDARY token's WORDS: `◔ N in review` → `◔ N`, `✓ accepted`
//      → `✓`. The glyph is pinned, the COUNT survives, the words go to `title`.
//   4. the chip's `→ <target>`  — yields LAST, truncating INSIDE its own box.
//
// WHY RUNG 3 SITS BELOW THE DRILL-IN'S WORDS. Both degrade to a pinned glyph, so
// the choice is which loss costs the operator less. The drill-in's words are
// recoverable in TWO channels (the span's `title`, the control's `aria-label` +
// `title`), its degraded `→` still reads as a navigation affordance, and
// dropping them recovers the single largest reservation on the row. The
// secondary's degraded form still carries THE FACT ITSELF, the count. Placing
// rung 3 last also keeps the row continuous with the two-child cluster: the new
// rung is reached only when the existing ladder is exhausted.
//
// WHY THE SECONDARY IS NOT DROPPED WHOLE, which is the obvious cheaper edit.
// Absence-of-token would become a covert signal for "this card's node id is
// long" — DG-20's own named error at a fourth address, refused twice already in
// this milestone (ADR-008's `!!assignment && (repoFiltered || overBudget)`
// rejection; DG-47-2's discharge). Glyph-plus-count is the house idiom, spent
// three times already: DG-19's drill-in, and DG-47-4's `⟳` and `◷`.
//
// The result is a pure function of the row's inputs returning EVERY decision the
// row needs at once, so the suite drives the DECISION directly instead of
// inferring it from a rendered class name (ADR-008), and the components become
// consumers that receive it as props — exactly as `BoardDrillIn` already
// receives `abbreviated`.
//
// `secondary` means "a secondary attention TOKEN renders", not "the `·`
// placeholder does": the placeholder is what stands in for an ABSENT token, and
// a card carrying a chip renders no placeholder at all (DG-19).
export function region5RowLadder({ assignment, secondary = false } = {}) {
  const secondaryToken = !!assignment && secondary === true;
  // The cluster's OWN children, counted the way the row renders them: the chip
  // (only with an assignment), the secondary token or its placeholder, and the
  // drill-in — which is always there.
  const children = assignment ? 2 + (secondaryToken ? 1 : 0) : 2;
  // No chip ⇒ no target ⇒ nothing on this ladder is under pressure, and the
  // drill-in keeps its words on the emptiest card on the page. Gating the
  // abbreviation on the STATE rather than on the chip's target is the defect
  // DG-47-5's own control row exists to catch.
  if (!assignment) {
    return Object.freeze({
      children, target: null, tailText: "",
      drillInWords: true, secondaryAbbreviated: false,
      slotBudgetCh: null, targetBudgetCh: null,
    });
  }

  const target = `→ ${assignment.targetNodeId ?? ""}`;

  // base = PILL + CHIP_GAP + CLUSTER_GAP × (children − 1) + DRILLIN_GLYPH
  //      + (secondary ? SECONDARY_WORDS : 0) + DRILLIN_WORDS          (ADR-014)
  let reservedPx =
    REGION5_PILL_PX
    + REGION5_CHIP_GAP_PX
    + REGION5_CLUSTER_GAP_PX * (children - 1)
    + REGION5_DRILLIN_GLYPH_PX
    + (secondaryToken ? REGION5_SECONDARY_WORDS_PX : 0)
    + REGION5_DRILLIN_WORDS_PX;

  // Walk the rungs IN ORDER, each firing only if the previous state does not
  // fit, recomputing the budget after each. Rung 1 has no element since DG-47-7,
  // so the walk opens at rung 2 against the same number. For the three-child
  // cluster that number is 0ch (297px reserved against a 286px row), so rung 2
  // always fires — which is the arithmetic behind "`Open board` rendered 0.34px
  // of the 65.06 it needs at EVERY measured width".
  const slotBudgetCh = region5BudgetCh(reservedPx);
  const drillInWords = target.length <= slotBudgetCh;
  let secondaryAbbreviated = false;
  if (!drillInWords) {
    reservedPx -= REGION5_DRILLIN_WORDS_PX;
    if (secondaryToken) {
      secondaryAbbreviated = target.length > region5BudgetCh(reservedPx);
      if (secondaryAbbreviated) reservedPx += REGION5_SECONDARY_MARK_PX - REGION5_SECONDARY_WORDS_PX;
    }
  }

  return Object.freeze({
    children,
    target,
    // The chip's `title` is the tail's SOLE surviving carrier (DG-47-7), and it
    // is derived here so the row and the chip cannot disagree about the string.
    tailText: region5ChipTail(assignment),
    drillInWords,
    secondaryAbbreviated,
    slotBudgetCh,
    // Rung 4's own budget, in the row's FINAL state — what the protected
    // `→ <target>` is left with once everything above it has yielded. 28ch for
    // the abbreviated two-child row, 20ch for the abbreviated three-child one.
    targetBudgetCh: region5BudgetCh(reservedPx),
  });
}

// The chip's `· <when> · <note>` TAIL — since DG-47-7 the string the chip's
// native `title` carries, and nothing the row renders. It is derived HERE, with
// the ladder, because rung 1's budget is still stated about this exact string
// and a rung whose subject is built in another file is how the ladder came apart
// in the first place. The chip still owns the pill's label/tone/mark.
//
// NOT EXPORTED, deliberately: `region5RowLadder(...).tailText` is the whole of
// its reachable surface, and an exported helper with no importer is the shape
// this milestone's own codebase-health pass filed against `filterToWorkspace` —
// a pinned contract nothing honours, green or deleted with identical effect.
function region5ChipTail(assignment) {
  const chip = assignmentChip(assignment);
  const at = assignment?.assignedAt ?? assignment?.updatedAt;
  return `${at ? ` · ${relativeTime(at)}` : ""}${chip?.note ? ` · ${chip.note}` : ""}`;
}

// DG-21 (the designer's correction to their own DG-17 ladder, from the THIRD
// real verdict) — EVERY RUNG MUST NAME THE OUTCOME; only the HOLDER steps down.
//
// The first ladder's middle rungs (`held by <holder>`, `→ <holder>`) carried no
// outcome word at all, and the re-render showed what that costs: region 6 read
// `held by umamis-msi` while region 5 read `assigned → umamis-msi` and the
// picker read `umamis-msi` — the same node id three times, twice adjacent, with
// nothing but the `destructive` RED separating "someone else holds this" from
// "your assign succeeded". That is A9/S4's rail — colour and label always travel
// together, never colour alone — broken at a new address. The justification for
// it ("the destructive token already carries `this was refused`") is precisely
// the reasoning that rail exists to forbid.
//
// So the ladder now drops the HOLDER, never the OUTCOME:
//   1. `<outcome> → <holder>`   — both, in DG-13 c4's own shape
//   2. `refused · <holder>`     — the States table's own word, plus the holder
//   3. `<outcome>`              — the holder OMITTED rather than mutilated
// The `title` always carries the server's whole sentence, so nothing is lost at
// any rung. CSS `truncate` survives only as a backstop for the UNSHAPED server
// sentence, never as the mechanism for a holder.
export const ASSIGN_REFUSAL_SHORT_OUTCOME = "refused";

export function assignRefusalLadder(outcome, holder, budgetCh = ASSIGN_MESSAGE_BUDGET_CH) {
  if (!holder) return outcome;
  const rungs = [`${outcome} → ${holder}`, `${ASSIGN_REFUSAL_SHORT_OUTCOME} · ${holder}`];
  for (const rung of rungs) if (rung.length <= budgetCh) return rung;
  return outcome;
}

// The SHORT copy the row renders: outcome first, then the holder — the one fact
// no other region reports. A code this map does not know keeps the server's own
// sentence (which the slot truncates, with the whole of it in the `title`).
function refusalMessage(cause, detail) {
  const outcome = typeof cause?.code === "string" ? ASSIGN_REFUSAL_COPY[cause.code] : undefined;
  if (!outcome) return detail;
  const holder = typeof cause?.holder === "string" && cause.holder.trim() ? cause.holder.trim() : null;
  return assignRefusalLadder(outcome, holder);
}

export function assignAtRest() {
  return { phase: ASSIGN_PHASE_REST, error: null, detail: null };
}

export function assignBegin() {
  return { phase: ASSIGN_PHASE_SENDING, error: null, detail: null };
}

// A 2xx. Note there is NO path from `sending` back to `rest` on success — the
// button never passes back through `Assign →` between `Assigning…` and `Sent`.
export function assignSucceeded() {
  return { phase: ASSIGN_PHASE_SENT, error: null, detail: null };
}

// A refusal (a verb gate-miss or a transport failure): the inline `destructive`
// error stands until the next attempt. NO hold, NO `Sent`.
//
// `cause` is the CODED envelope the client throws (an Error carrying the verb's
// own `code`/`holder`), or a bare string. `error` is what the row RENDERS (short,
// outcome-first); `detail` is the full server text the slot puts in its `title`.
export function assignRefused(cause) {
  const detail = refusalDetail(cause);
  return { phase: ASSIGN_PHASE_REFUSED, error: refusalMessage(cause, detail), detail };
}

// DG-14 clause 2 — at the deadline the row reads the EXISTING `refused`
// presentation VERBATIM: same phase, so every fact the view derives (picker
// re-enabled with the selection kept, action back to `Assign →` in its `primary`
// tint, inline `destructive` message, NO hold) is literally the same derivation.
// No new state, no new vocabulary — only the copy differs.
export function assignTimedOut() {
  return { phase: ASSIGN_PHASE_REFUSED, error: ASSIGN_MESSAGE_TIMED_OUT, detail: ASSIGN_DETAIL_TIMED_OUT };
}

// The hold expiring. Only a `sent` acknowledgment decays — a `refused` error
// stands until the next attempt, and a `sending` call has not answered yet, so a
// stray timer can never blank either.
export function assignAckExpired(state) {
  return state?.phase === ASSIGN_PHASE_SENT ? assignAtRest() : (state ?? assignAtRest());
}

// assignAffordanceView(ctx) — the ONE derivation of everything the row renders.
// `holdMs` is non-null EXACTLY in the `sent` state and is the timer the consumer
// must schedule; a view with `holdMs === null` schedules nothing (which is what
// makes "no hold on a refusal" structural rather than remembered).
//
// A9 — no new colour primitive: `actionTone` is only ever `primary` (the action
// at rest, a LOW-emphasis tint) or `muted` (the `Sent` acknowledgment — the tint
// is DROPPED, not added to, making it the quietest state the row ever renders),
// and `messageTone` is only ever `destructive`. A10 — every state is a label
// swap inside the existing controls: nothing here can change the row's height or
// rhythm.
//
// DG-13 — `actionWidth` and `pickerMinWidth` are PHASE-INDEPENDENT by
// construction: they are computed outside the phase branches and returned
// identically for every state, which is what makes "a label swap may not move
// another element" (clause 1) and "the picker never yields to the message"
// (clause 2) structural rather than remembered. `messageTitle` carries the full
// server text the truncating slot cannot show (clause 3).
export function assignAffordanceView(ctx = {}) {
  const phase = ctx.phase ?? ASSIGN_PHASE_REST;
  const hasOptions = ctx.hasOptions === true;
  const selected = typeof ctx.selected === "string" ? ctx.selected : "";
  const busy = phase === ASSIGN_PHASE_SENDING || phase === ASSIGN_PHASE_SENT;

  const label =
    phase === ASSIGN_PHASE_SENDING ? ASSIGN_LABEL_SENDING
      : phase === ASSIGN_PHASE_SENT ? ASSIGN_LABEL_SENT
        : ASSIGN_LABEL_REST;

  return {
    phase,
    // A4 — an empty roster leaves the picker DISABLED with its one honest
    // placeholder, never hidden, never an invented `any` target.
    pickerDisabled: !hasOptions || busy,
    pickerPlaceholder: hasOptions ? null : "No worker nodes yet",
    actionLabel: label,
    actionDisabled: !hasOptions || busy || !selected,
    actionTone: phase === ASSIGN_PHASE_SENT ? "muted" : "primary",
    // DG-13 clause 1 — the action reserves the width of its LONGEST label in
    // EVERY state, including disabled. Note there is no `phase` anywhere in this
    // expression: the width cannot vary with the state, so a label swap cannot
    // move the picker or the message.
    actionWidth: `${ASSIGN_ACTION_WIDTH_CH}ch`,
    // DG-13 clause 2 — the picker's FLOOR, likewise phase-independent: ≥14ch of
    // the node id PLUS the select's own chrome (padding, border, native
    // chevron), so a bare chevron is unreachable in any state.
    pickerMinWidth: `calc(${ASSIGN_PICKER_FLOOR_CH}ch + ${ASSIGN_PICKER_CHROME})`,
    // The message slot: an inline `destructive` refusal, or empty. The `sent`
    // acknowledgment adds NOTHING here — it is a state of the action itself.
    message: phase === ASSIGN_PHASE_REFUSED ? (ctx.error ?? ASSIGN_MESSAGE_FALLBACK) : null,
    // DG-13 clause 3 — the message is the element that YIELDS: it takes what is
    // left, truncates, and carries the full text in its native `title`.
    messageTitle: phase === ASSIGN_PHASE_REFUSED ? (ctx.detail ?? ctx.error ?? ASSIGN_MESSAGE_FALLBACK) : null,
    messageTone: phase === ASSIGN_PHASE_REFUSED ? "destructive" : null,
    holdMs: phase === ASSIGN_PHASE_SENT ? ASSIGN_SENT_HOLD_MS : null,
  };
}

// runAssign(deps, request) — the affordance's WHOLE click orchestration, so the
// production component holds none of it: begin → POST → (`sent` + EXACTLY ONE
// silent re-load) or (`refused`, no hold, no re-load).
//
// `assign` is the real `fleetApi.assign(ref, nodeId, workspaceId)` — the THREE
// required wire fields of the ADR-012 AMENDMENT. `workspaceId` is the ITEM's own
// (`m.item.workspaceId`), never the daemon's: passing the wrong one is BLOCKER
// F21, and omitting it is now a loud 400 rather than a silent mis-dispatch.
//
// `onAssigned` is called EXACTLY ONCE, ONLY on a 2xx, AFTER the local `sent`
// acknowledgment is applied — it is the SAME silent, keep-last-good re-load the
// ⟳ control fires. One load: no new cadence, no retry ladder. It must never be
// the non-silent load, which would flip the page into its loading state and
// unmount the board — a far worse answer than saying nothing.
// DG-14 (F-38.04f) — THE HUNG POST. This used to `await assign(...)` with no
// deadline, and only `sent` scheduled a decay, so a POST that never answered
// held `Assigning…` FOREVER: picker frozen, action disabled, message slot empty,
// recoverable only by reloading the page. On a passively-refreshing monitor a
// frozen control reads as a broken page, and it was the one state the design
// never described.
//
// The deadline abandons THE AFFORDANCE'S WAIT — never the call (clause 6). There
// is deliberately NO AbortController, NO retry and NO second cadence: aborting
// would make a possibly-successful server-side mint ambiguous, and clause 3's
// whole point is that the call's outcome is UNKNOWN and the surface should say
// so honestly rather than claim nothing was assigned.
//
// A LATE answer is TERMINAL for the affordance (clause 5): it may not resurrect
// `Sent` and may not clear the error (`destructive` and `Sent` may never
// co-exist). A late 2xx is honoured by exactly one thing — A8's single silent
// keep-last-good re-load, so region 5 gets its chip; a late non-2xx changes
// nothing at all.
const ASSIGN_DEADLINE = Symbol("assign-deadline");

export async function runAssign(
  { assign, onAssigned, onState, timeoutMs = ASSIGN_TIMEOUT_MS } = {},
  { ref, nodeId, workspaceId, phase } = {},
) {
  onState?.(assignBegin());

  // Normalised to a promise so a synchronously-throwing client takes the same
  // path as a rejecting one. `phase` (VERIFICATION 2026-07-25) is the OPTIONAL
  // lifecycle command the worker runs (refine/continue/verify); absent ⇒ the route
  // defaults to refine, so a caller that passes only {ref,nodeId,workspaceId} is
  // byte-identical to before.
  const call = Promise.resolve().then(() => assign(ref, nodeId, workspaceId, phase));
  let abandoned = false;

  // Clause 5, wired before the race so it cannot be missed: the ONLY thing a
  // late answer may do is fire A8's one silent re-load, and only when it is a
  // 2xx. It never touches `onState`.
  call.then(
    () => { if (abandoned) onAssigned?.(); },
    () => { /* a late non-2xx changes nothing — the timed-out message stands */ },
  );

  const deadline = new Promise((resolve) => {
    const timer = setTimeout(() => resolve(ASSIGN_DEADLINE), timeoutMs);
    call.then(() => clearTimeout(timer), () => clearTimeout(timer));
  });

  const outcome = await Promise.race([
    call.then((record) => ({ record }), (error) => ({ error })),
    deadline,
  ]);

  if (outcome === ASSIGN_DEADLINE) {
    abandoned = true;
    // Clause 2 — the EXISTING `refused` presentation, verbatim. No `Sent`, no
    // hold; clause 4 — the message stands until the next attempt, and a re-click
    // is permitted (if the dispatch did land, that re-click draws the ordinary
    // `already assigned → <node>` refusal, a correct answer rather than a new
    // failure mode).
    onState?.(assignTimedOut());
    return { ok: false, timedOut: true };
  }
  if ("error" in outcome) {
    onState?.(assignRefused(outcome.error));
    return { ok: false, error: outcome.error };
  }
  onState?.(assignSucceeded());
  onAssigned?.();
  return { ok: true, record: outcome.record };
}
