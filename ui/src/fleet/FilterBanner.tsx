import type { RepoFilterForm } from "./RepoPicker";

// R0 — the "filtered by" banner, and R0-N, the partial-intersection notice
// (milestone 47 / story 03; ARCHITECTURE ADR-007 + ADR-010 clause 4; DESIGN §Surface 2 R0 /
// R0-N, as amended 2026-08-11).
//
// A PRESENTATIONAL CHILD for the same reason `RepoPicker.tsx` is (ADR-001's `[Feasibility-2]`
// clause): it exports a COMPONENT and no narrowing vocabulary, takes the already-derived facts
// as props, and imports nothing from the one home.
//
// WHY THE CHIP IS HERE AND NOT IN THE BAR (DESIGN §Surface 1, three measured reasons): the
// bar's own trigger already names the picked repo, so a chip beside it "would say the same word
// twice, ~40px apart" (m45's wordmark ruling verbatim); the chip's job is to explain an EMPTY
// page and the page is where the emptiness is; and the 40px band at 390 has no room for a sixth
// thing (DG-47-4).
//
// WHY IT IS HOISTED ABOVE THE STATE TERNARY (DG-47-1). The line it replaces —
// `Filtered to workspace <id>` — was the first child of `GlobalScopeView`, i.e. of the POPULATED
// branch, so the one moment the operator most needs to see the narrowing (a filter that yields
// nothing) was exactly the moment it disappeared. It is RE-HOMED, never duplicated: two places
// rendering "what am I filtered to" are two places that can disagree.
//
// WHY IT MAY BE CONDITIONAL WHEN NOTHING ELSE ON THIS SURFACE MAY. DG-20 forbids an absence that
// becomes a covert signal, and it does not bite here for exactly one reason that must stay true:
// the CONTROL in the bar states the filter's state at all times, in all four page states. The
// obligation is discharged there — which is precisely why that control may never be conditional
// and this banner may. If the control were ever allowed to disappear, this clause falls with it.

export function FilterBanner({
  scopeLabel,
  repo,
  repoLabel,
  repoForm,
  repoTitle,
  notice,
  onClearRepo,
  workStatus,
  workStatusLabel,
  onClearWorkStatus,
}: {
  // The label of the SCOPE narrowing in force, or null when there is none. `global` is the
  // default (m34/ADR-006) and is NOT a narrowing — naming it would be announcing the absence
  // of one.
  scopeLabel: string | null;
  // The RAW requested value, or null for no repo filter.
  repo: string | null;
  // What the chip renders: the resolved workspace NAME when it resolves, else the raw value.
  repoLabel: string;
  repoForm: RepoFilterForm;
  // The chip's `title` — the workspace id when the value resolved (ADR-007: "the chip renders
  // `workspace.name ?? workspace.workspaceId` … with the id in `title`"), else the sentence
  // that states this form's condition. Every form says its condition in words as well as by
  // its treatment.
  repoTitle: string;
  // R0-N's sentence, or null. Conditional for the same reason the banner is, and for one more:
  // it EXPLAINS a condition rather than stating a narrowing, and the narrowings are stated
  // unconditionally one line above it.
  notice: string | null;
  onClearRepo: () => void;
  // The THIRD narrowing (2026-09-11): a single named status, or null when the view is the
  // default (open) or widened to all — neither of which is a narrowing worth announcing.
  workStatus: string | null;
  workStatusLabel: string;
  onClearWorkStatus: () => void;
}) {
  // Absent and ZERO-HEIGHT when nothing is narrowed — never a reserved blank band.
  if (scopeLabel == null && repo == null && workStatus == null) return null;
  return (
    <div className="px-4 pt-7 sm:px-8">
      {/* The container matches the content rail EXACTLY (`px-4 sm:px-8`, `mx-auto w-full
          max-w-[1240px]`) and takes the rail's TOP padding with no bottom padding, so the body
          branch beneath supplies the gap with its own existing `py-7` and the page reads as one
          rhythm step rather than two.

          It announces POLITELY and is a `status`, never an `alert`: nothing is wrong — the
          operator asked for this. R0-N lives INSIDE this same live region and takes no second
          one; it is part of the same statement, not a second announcement. `role="status"` is
          not a landmark, so the document still has exactly one `banner` and one `<main>`. */}
      <div role="status" aria-live="polite" className="mx-auto w-full max-w-[1240px]">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Filtered by</span>
          {/* SCOPE FIRST, THEN REPO — the order they were applied (ADR-005), which is also the
              order the composed empty heading names them in. */}
          {scopeLabel ? (
            // A STATEMENT, not a control: no `✕`, not focusable, and a `title` would carry
            // nothing the text does not already say. The asymmetry with the repo chip is
            // deliberate and is DESIGN's: scope's own control is always visible in the bar with
            // BOTH options showing, so clearing it is already one click away; the repo's clear
            // lives inside a closed popover, so its chip must carry one.
            <span className="mono rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              scope · <span className="font-semibold text-foreground">{scopeLabel}</span>
            </span>
          ) : null}
          {repo != null ? (
            <span
              className={`mono flex items-center gap-1.5 rounded-md border bg-muted px-2 py-0.5 text-xs text-muted-foreground ${
                // ONLY the unknown form earns the house dashed absent/not-yet mark, because it
                // is the only one whose payload SAW THE MESH. `unresolved` has seen nothing and
                // `out-of-scope` has seen one workspace — neither has established an absence,
                // and neither is dressed as one. It is never `accent` and never `destructive`:
                // a filter matched nothing, which is a true and ordinary answer.
                repoForm === "unknown" ? "border-dashed border-muted-foreground/40" : "border-border"
              }`}
              title={repoTitle}
            >
              {/* The value renders IN FULL and never truncates — which is exactly what makes
                  the bar trigger's fixed slot safe.

                  IT IS AT FULL CONTRAST IN EVERY FORM (F-47-V-7, DESIGN's ramp rows as amended
                  2026-08-11). Built as shipped, only the `resolved` form got weight and colour
                  and every other form rendered the value at the same muted weight as the
                  `repo ·` prefix that labels it. The committed mock draws it semibold at full
                  contrast even inside the dashed box, and a11y 8 gives the reason: the BOX
                  carries the absence, the VALUE is the word that carries the meaning. A quiet
                  frame is not a licence to quieten what it frames. */}
              repo ·{" "}
              <span className="font-semibold text-foreground">
                {repoLabel}
              </span>
              {/* DOOR ONE, and it is mandatory: the clear is ON the thing that says you are
                  filtered. A real `<button>` whose accessible name says WHAT it clears, never a
                  bare glyph. Door two is the picker's `All repos` row, and a filter clearable
                  only from inside a closed menu is a hidden affordance whose recovery is
                  reloading the page.

                  THE TARGET IS >= 24x24 AND IT PAYS FOR THAT FROM ITS OWN PADDING (F-47-V-14,
                  §a11y 7). Measured on the shipped build it was 9.81 x 16 CSS px with
                  `padding: 0` — 40% of the floor on its narrow axis, the smallest target on the
                  surface, and the one carrying the recovery. It compounded with the picker being
                  undismissable: getting OUT of a filter was materially harder than getting in.
                  `-my-1` keeps the grown target from changing the chip's own height, so the
                  banner's rhythm is unchanged; §a11y 7's "never by growing the 40px surface bar"
                  does not bind here because the chip lives in the page, not the bar. */}
              <button
                type="button"
                onClick={onClearRepo}
                aria-label={`Clear repo filter (${repoLabel})`}
                className="-my-1 grid h-6 w-6 shrink-0 place-items-center rounded text-xs font-semibold text-primary transition hover:bg-background hover:underline"
              >
                ✕
              </button>
            </span>
          ) : null}
          {/* STATUS THIRD — the order it is applied at the seam. Same chip grammar as the repo,
              same mandatory door: the clear is ON the thing that says you are filtered, and it
              returns the view to its default (open work), never to "everything". */}
          {workStatus != null ? (
            <span className="mono flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              status ·{" "}
              <span className="font-semibold text-foreground">{workStatusLabel}</span>
              <button
                type="button"
                onClick={onClearWorkStatus}
                aria-label={`Clear status filter (${workStatusLabel})`}
                className="-my-1 grid h-6 w-6 shrink-0 place-items-center rounded text-xs font-semibold text-primary transition hover:bg-background hover:underline"
              >
                ✕
              </button>
            </span>
          ) : null}
        </div>
        {/* R0-N (ADR-010 clause 4) — one sentence, on its OWN line beneath the chip row, never
            spliced among the chips: the chip row is a fixed grammar of narrowings that wraps
            predictably at 390, and a sentence inside it would make that row's wrapping
            data-dependent.

            It is the QUIETEST thing in the banner on purpose — no border, no background, no
            glyph, no `✕`, not focusable, not a button. The chips STATE the narrowings; the
            notice EXPLAINS their combination, and an explanation that shouted would compete
            with the facts it explains. It never becomes a rail, a banner, a toast or a control. */}
        {notice ? <p className="mt-1 text-xs text-muted-foreground">{notice}</p> : null}
      </div>
    </div>
  );
}
