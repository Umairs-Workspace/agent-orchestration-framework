import { useEffect, useState } from "react";
import { FreshnessLegend } from "../board/StaleBadge";
import { slotAidForm } from "./slot-aids.mjs";

// THE SLOT'S TWO READER'S AIDS — `◷ legend` and the `⟳ refreshed Ns ago` refresh control — and
// the two discrete drops they take at <= 390 (milestone 47 / story 03; DESIGN §DG-47-4).
//
// EXTRACTED FROM `Fleet.tsx` AT THE VERIFY FIX PASS (2026-08-11), and the extraction is the
// remedy `acd-ui-surface-file-budget` names in its own failure message rather than a stylistic
// preference: `Fleet.tsx` stood at 1,543 of its 1,560-line ratchet, and the architect's routing
// for that headroom was explicit — "fit inside 17 lines OR extract one more region sibling",
// with trimming comments and raising the ceiling by diff both refused. The drops plus the
// address listener do not fit in 17 lines, so this is the instructed move.
//
// WHY THESE TWO TOGETHER. They are the slot's two AIDS, as opposed to its two NARROWINGS (the
// scope control and the repo filter), and DG-47-4 rules on them as a pair: both give up their
// words at the same width, so a bar that dropped one and not the other would be a third form
// nobody specified. Keeping them in one file is what makes "taken together" checkable by
// reading rather than by remembering.
//
// THE NARROWINGS DO NOT MOVE HERE, and that is load-bearing: `acd-mesh-ui-scope-visible` pins
// `<ScopeControl>` inside `TopBar`'s own body, above the state ternary. This file holds what may
// degrade; `TopBar` keeps what may not.

// The viewport width, measured, with an override that skips the listener entirely — the same
// shape and the same reasoning as the shell's own `viewportWidth` prop (`Shell.tsx:110`). A host
// with no `window` answers null, and `slotAidForm` reads null as the WIDE form: the form that
// loses nothing is the safe answer when there is nothing to key on.
export function useViewportWidth(override?: number): number | null {
  const [width, setWidth] = useState<number | null>(() => {
    if (typeof override === "number") return override;
    return typeof window === "undefined" ? null : window.innerWidth;
  });
  useEffect(() => {
    if (typeof override === "number" || typeof window === "undefined" || !window.addEventListener) return undefined;
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [override]);
  return typeof override === "number" ? override : width;
}

// The legend (◷ legend) — the reader's key to node-liveness vs run-state vs
// assignment-lifecycle (never confused; item-status is one level down, not
// here). milestone 35 / story 03 (DESIGN §1 item 1 / §4 legend-parity note) —
// the "Assignment" block is the THIRD ramp, below "Node liveness" and "Run
// state", one row per lifecycle state (mark + label) so the new ramp is
// self-documenting exactly as the two existing ramps are.
//
// milestone 43 / story 04 — and "Freshness" is the FOURTH, for the same reason
// and by the same rule, painting the REAL badge component the surfaces paint
// (never a fleet-local drawing) and stating the window from the wire. It is the
// LAST block on both this legend and the board's, so the two read alike.
//
// THE DROP (DG-47-4 clause 2): at <= 390 the WORD goes and the pinned `◷` stays, with the word
// moving into `title`. The legend is a hover/focus disclosure and its glyph IS the affordance,
// so the word is the part that can be spared. `aria-label` already carried "Legend" in both
// forms, so the accessible name never depended on the visible word.
export function Legend({ windowSeconds, form = "words" }: { windowSeconds: number | null; form?: "glyph" | "words" }) {
  return (
    <span className="group relative" aria-label="Legend">
      <span className="cursor-default select-none" title={form === "glyph" ? "legend" : undefined}>
        {form === "glyph" ? "◷" : "◷ legend"}
      </span>
      <span className="pointer-events-none absolute right-0 top-full z-20 mt-1 hidden w-64 rounded-md border border-border bg-popover p-3 text-xs text-popover-foreground shadow-md group-hover:block">
        <span className="mb-1 block font-semibold uppercase tracking-wide text-muted-foreground">Node liveness</span>
        <span className="mb-2 block space-y-0.5">
          <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-primary" /> live</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full border border-muted-foreground/50" /> stale</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full border border-dashed border-muted-foreground/40" /> no presence</span>
        </span>
        <span className="mb-1 block font-semibold uppercase tracking-wide text-muted-foreground">Run state</span>
        <span className="mb-2 block space-y-0.5">
          <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-primary" /> running</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-destructive" /> failed</span>
        </span>
        <span className="mb-1 block font-semibold uppercase tracking-wide text-muted-foreground">Assignment</span>
        <span className="block space-y-0.5">
          <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full border border-muted-foreground/50" /> assigned</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-muted-foreground" /> accepted</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" /> running</span>
          <span className="flex items-center gap-1.5"><span className="grid h-3 w-3 place-items-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">✓</span> done</span>
          <span className="flex items-center gap-1.5"><span className="grid h-3 w-3 place-items-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground">!</span> failed</span>
        </span>
        <span className="mt-2 block">
          <FreshnessLegend windowSeconds={windowSeconds} />
        </span>
      </span>
    </span>
  );
}

// ⟳ refresh — click re-polls in place (non-tearing, keep-last-good on a failed silent poll). NO
// push/stream chrome. It both shows freshness AND triggers a manual re-poll. Re-polls under the
// CURRENT scope (47/02 task 02 scenario 2 — refresh never silently reverts to the default).
//
// THE DROP (DG-47-4 clause 1): at <= 390 the freshness WORDS go and the pinned `⟳` stays, with
// the reading moved into BOTH `title` and `aria-label`. It is a refresh CONTROL first and a clock
// second, and this is the drill-in's own DG-19 idiom one bar up — give up the words whole, keep
// the glyph pinned, keep the label recoverable.
//
// THE ACCESSIBLE NAME CARRIES THE READING IN THE DROPPED FORM, not just the `title`: a control
// whose only remaining statement of its own value lives in a hover affordance has hidden that
// value from exactly the operators who cannot hover (§a11y 10's rule, one control over).
export function RefreshControl({
  freshness,
  form = "words",
  onRefresh,
}: {
  freshness: string;
  form?: "glyph" | "words";
  onRefresh: () => void;
}) {
  const dropped = form === "glyph";
  return (
    <button
      type="button"
      onClick={onRefresh}
      className="mono rounded px-2 py-1 transition hover:bg-muted hover:text-foreground"
      aria-label={dropped ? `Refresh the fleet view (${freshness})` : "Refresh the fleet view"}
      title={dropped ? `${freshness} — click to re-poll` : "Visibility is poll/refresh — click to re-poll"}
    >
      {dropped ? "⟳" : freshness}
    </button>
  );
}

// The two aids' shared decision, re-exported so a consumer takes ONE import and cannot key the
// two drops to two different widths.
export { slotAidForm };
