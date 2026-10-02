// The archived mark — the ONE new vocabulary of milestone 127 (DESIGN §"The archived mark").
//
// A sibling of `StaleBadge.tsx` rather than a sixth entry in `status.tsx`, because "archived"
// is a new READ-ONLY vocabulary and not a status: the product's five ramps (item-status,
// run-state, node-presence, assignment-lifecycle, cache-freshness) answer questions this one
// does not — *has this accepted item been put away?* The wire status stays `done`; the chip
// beside the pill still reads `✓ done`.
//
// WHY A SOLID MUTED PILL, NOT DASHED. Dashed is the house's "degraded / not-yet / absent"
// primitive (the `not-started` ring, the stale badge); an archived item is the opposite —
// complete and deliberately shelved. Never `destructive` (blocked/failed own it), never
// `primary`/`accent` (the chip already says `✓ done` in teal; a second teal would double-count
// acceptance). `text-[11px]` sits strictly below the `text-xs` status chip: what the item IS
// outranks where it LIVES — the same tier as the stale badge and the type chip.
//
// THE GLYPH IS DECORATIVE; THE WORD CARRIES THE MEANING. `▤` (U+25A4) is unclaimed in the
// product's glyph set and reads as "boxed up"; it is `aria-hidden`, and if the font cannot
// paint it the pill degrades to the word alone. No `title`, no motion (motion means
// "something is happening now", and an archived item is exactly the thing where nothing is).
import type { WorkItem } from "./api";

// Pinned by DESIGN: the class string every context paints, byte-for-byte — the legend's row
// asserts the pill it paints is IDENTICAL to the one on an archived card.
export const ARCHIVED_PILL_CLASSES =
  "inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground";

export const ARCHIVED_GLYPH = "▤";

export function ArchivedPill() {
  return (
    <span className={ARCHIVED_PILL_CLASSES}>
      <span aria-hidden="true">{ARCHIVED_GLYPH}</span>
      archived
    </span>
  );
}

// carriesArchivedMark(item) — does this row take the pill? ONE pill per item context, and the
// context is the DRIVER: an archived milestone is marked wherever its identity row is painted
// (the overview card, the gate bar, the switcher button and row, the lane card under `all`
// focus, the detail header), and its STORIES — which ride the wire with the same `archived:
// true`, because the folder moved with the milestone — carry none. A parentless row is the
// context; a row with a parent belongs to one.
export function carriesArchivedMark(item: WorkItem | null | undefined): boolean {
  return item?.archived === true && item.parent == null;
}
