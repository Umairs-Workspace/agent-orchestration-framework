// THE FLEET'S ONE DRILL-IN — region 5's right-aligned `Open board →`, in all three of
// its states (milestone 47 / story 04; DESIGN §DG-47-5, ADR-008).
//
// WHY IT IS A SIBLING FILE. After ADR-006 deleted the peer-board branch this is the only
// drill-in the fleet has, and DG-47-5 gives it a state-varying treatment, a state-varying
// rule beneath it and an accessible name — on a row whose geometry is fitness-locked
// across DG-13…DG-22, in a file that sits under a 1,560-line ratchet with 48 lines of
// headroom after 47/03. `acd-ui-surface-file-budget`'s own failure message names the
// remedy ("extract the next region into a sibling component with a prop boundary") and
// ADR-014/E3 forbids the alternative (trimming rationale to fit). This is that extraction,
// and it is the cleanest cut available: a pure function of three booleans with no page
// state behind it, and every clause of DG-47-5 lands inside it.
//
// WHAT DID *NOT* MOVE, so the boundary reads as a decision. THE ABBREVIATION IS NOT
// DECIDED HERE and never was: it is rung 2 of region 5's one ladder, taken in
// `./assign-affordance.mjs`'s `region5RowLadder` beside the budget it reads (ADR-014
// clause 4 — it lived in `Fleet.tsx` as a local `abbreviateDrillIn` until 2026-08-12,
// which was the second of the two independent booleans that could not express one
// ladder). It arrives here as a prop, so it is taken once and never re-derived per
// state. So do `opening` / `openError` — the resolver's state is the card's, and the
// card's own `<button>` carries the accessible name (clause 5, below), because that is
// the element an operator activates.

// DG-47-5 clause 5, corrected 2026-08-11 (F-47-04-QA-6) — THE ACCESSIBLE NAME IS THE
// BUTTON'S, and it names the REMEDY.
//
// The drill-in below is a generic `<span>`; ARIA prohibits naming one, so an `aria-label`
// there is ignored outright — and an ignored attribute that looks correct is worse than
// an absent one. The control an operator actually activates is the card's own `<button>`,
// which takes `aria-label` and a byte-identical `title`: one name, two channels, one
// element. The span keeps its own state-varying `title` for the different job DG-19 gives
// it — recovering the words the abbreviation drops.
//
// The failed name states the FAILURE, names the REPO, and names the REMEDY COMMAND
// (`aof work ui`) — the one good property of the peer-board affordance ADR-006 deleted,
// inherited rather than lost with it, and the answer to a tooltip that used to restate
// the label the operator can already read. `workspaceName` already falls back to the
// workspace id when the payload's row carries no name, so a remedy never names nothing.
//
// At rest and in flight the name is today's tooltip VERBATIM: an attempt in flight is not
// a failure and must not read as one.
//
// The cost, named rather than discovered: the button had no `aria-label`, so its
// accessible name was computed from its CONTENTS — the whole card, read out. That is
// intended. A control named by every fact on its own card is not named.
export function boardControlName(workspaceName: string, openError: boolean): string {
  return openError
    ? `Could not open a board for ${workspaceName} — run aof work ui in its project directory on the node that owns it`
    : `Open board for ${workspaceName}`;
}

// THE THREE STATES, ALL THREE ON THE SAME LADDER (DG-47-5 clauses 1-3).
//
// Both gates here used to be state-KEYED and both were backwards: the words were exempted
// from the abbreviation (`abbreviateDrillIn && !opening && !openError`) in exactly the two
// states that render the LONGEST strings, and the pinned `→` — the mark DG-19 pins so the
// affordance is never invisible — was dropped in exactly those two states. At the
// abbreviated width that pair renders NOTHING AT ALL, on the card whose board has just
// refused to open. The abbreviation is now the gate alone and the glyph is unconditional;
// only the TONE, the RULE beneath and the accessible name are state-varying.
export function BoardDrillIn({ opening, openError, abbreviated }: { opening: boolean; openError: boolean; abbreviated: boolean }) {
  const label = opening ? "Opening board..." : openError ? "Open failed" : "Open board";
  // Clauses 2 + 3 — the mark is the house absent/not-yet primitive spent VERTICALLY.
  // `border-b border-dashed` costs HEIGHT; width is the resource DG-13 clause 5 fought
  // over, so there is no dashed box, no ring, no added padding and no border on any edge
  // but the bottom. On hover the dashed rule goes SOLID and this state's
  // `group-hover:underline` LEAVES, so there is one line and never two. Never `accent`,
  // never `destructive`: a board that did not resolve is ABSENT, not broken, and the mesh
  // has not failed.
  //
  // The in-flight `animate-pulse` is an ADDITION, not an inheritance (F-47-04-QA-4) — this
  // element has never carried motion, and DESIGN's states table called it "existing". It is
  // ruled IN with the reason the parenthetical never gave: at the abbreviated width all
  // three states render one glyph, failed is told apart by tone plus its dashed rule, and
  // at rest and in flight would otherwise be byte-identical. It applies in BOTH forms.
  const treatment = openError
    ? "border-b border-dashed border-muted-foreground/40 text-muted-foreground group-hover:border-solid"
    : `${opening ? "animate-pulse " : ""}text-primary group-hover:underline`;
  return (
    // An EXPLICIT floor, sized to the arrow — the picker-floor idiom (DG-13 c2) applied one
    // element to the right, and the only shape that satisfies DG-19 in both directions.
    // `min-w-0` alone let this box shrink to ZERO while its own pinned `→` overflowed it and
    // sat OUTSIDE the card's content box (the shrink-0-inside-min-w-0 shape that caused
    // DG-15). Removing `min-w-0` fixed the escape and created the opposite defect:
    // `min-width:auto` resolved to this box's FULL content width, so it never yielded at all
    // and the chip's target truncated instead — measured, not reasoned: 78.7px wide with a
    // 78.8px automatic minimum. An explicit `min-w-3.5` (14px ≈ the arrow's 13.7px) permits
    // the shrink AND bounds it, so the words give way, the arrow always has its own room,
    // and nothing leaves the card. Clause 1 forbids relaxing either in ANY state.
    <span className={`flex min-w-3.5 shrink-1000 items-baseline font-semibold ${treatment}`} title={label}>
      {abbreviated ? null : <span className="min-w-0 truncate">{label}</span>}
      {/* `whitespace-pre` keeps the separating space: a flex item's own leading whitespace
          is otherwise collapsed, and the label would read `Open board→`. The space is part
          of the label's identity, not decoration.

          DG-47-5 clause 2 — the glyph is pinned in EVERY state. It is the element's
          identity, a retry is still a navigation attempt, and at the abbreviated width it
          is the only thing left to render. Swapping it for a second shape would make the
          mark's SHAPE a signal the operator has to learn. */}
      <span className="shrink-0 whitespace-pre">{" →"}</span>
    </span>
  );
}
