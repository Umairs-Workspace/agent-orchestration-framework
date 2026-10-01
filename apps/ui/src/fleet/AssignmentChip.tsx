import { assignmentChip, assignmentSummary } from "./assignments.mjs";
import type { WorkAssignment } from "./api";
import type { Region5Row } from "./assign-affordance.d.mts";

// THE TWO PLACES THIS SURFACE RENDERS AN ASSIGNMENT AS A FACT, and the ONE tone map they
// share — extracted from Fleet.tsx by milestone 47 / story 03 (ADR-001 [Feasibility-2];
// acd-ui-surface-file-budget).
//
// WHY THEY MOVED AT ALL. m47/03 adds a control, a banner, a narrowing seam, four region
// summaries and a five-condition empty state to a file with 170 lines of ratchet headroom.
// ADR-014/E3 forbids meeting a ceiling by deleting rationale and ADR-006's own rule is that
// raising one "needs an ADR, not a diff", so the remedy is the one the budget gate's own
// failure message names: "extract the next region into a sibling component with a prop
// boundary".
//
// WHY THESE THREE. They are the cleanest cut available: `AssignmentChip` and
// `AssignmentSummaryLine` are the milestone card's and the node card's renderings of the SAME
// assignment lifecycle, `runChipClasses` is the tone map they share, and all three are pure
// functions of their props with no page state behind them. The tone map stays SHARED rather
// than copied — a fleet-local chip system is a DESIGN review GAP in terms, and the board
// paints from the same vocabulary.
//
// WHAT COULD NOT MOVE, recorded so the cut reads as a decision rather than a preference: four
// committed gates pin components to `Fleet.tsx` by name or by slicing that file —
// `GlobalNodePanel` (acd-rendered-component-fed-by-route asserts exactly ONE per-node card
// renderer, in that file), `AssignAffordance` (acd-fleet-assign-targets-item-workspace slices
// its body out of that file), `<TerminalControl>` and `fleetTerminalMount(` inside the
// milestone card (acd-fleet-terminal-input-constrained reads both out of that file), and
// `ScopeControl` after `TopBar` (acd-mesh-ui-scope-visible slices TopBar by the next
// function). Moving any of them would fail CI for a reason unrelated to the change.

// The node-side assignments summary line (milestone 35 / story 03; DESIGN §2b
// SECONDARY attachment) — a compact muted line, `assignments: N running · N
// accepted · N assigned`, listing ONLY non-zero states in the same brightness
// order the ramp climbs. A degraded (failed/reclaimed) held assignment renders
// its count in the destructive token so it is visible on the WORKER card too
// ("degraded states must be visible"). All-zero (or no assignments at all) ⇒
// the row is OMITTED entirely — "absent, not false," never "0 assignments".
// The pure tally lives in ./assignments.mjs's `assignmentSummary` (task 01);
// this component is a thin consumer.
export function AssignmentSummaryLine({ assignments }: { assignments?: WorkAssignment[] }) {
  const summary = assignmentSummary(assignments) as { state: string; count: number }[];
  if (summary.length === 0) return null;
  // DESIGN §2b fix (review GAP-2) — the PURE tally (./assignments.mjs) orders
  // states by the ramp's brightness (running…failed last), which is correct for
  // the pure projection but meant the destructive "failed" bucket sat at the
  // truncating tail of this line and was the FIRST thing lost to ellipsis. The
  // render layer splits the line into a shrink-0 "failed" prefix (never
  // truncated) and a single truncating span for everything else — a truncated
  // non-degraded tail is acceptable, a truncated failed count is not.
  const failed = summary.filter((entry) => entry.state === "failed");
  const rest = summary.filter((entry) => entry.state !== "failed");
  const restText = rest.map((entry) => `${entry.count} ${entry.state}`).join(" · ");
  return (
    <span className="mono flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
      <span className="shrink-0">assignments:</span>
      {failed.map((entry) => (
        <span key={entry.state} className="shrink-0 text-destructive">
          {entry.count} {entry.state}
          {rest.length > 0 ? " ·" : ""}
        </span>
      ))}
      {rest.length > 0 ? <span className="min-w-0 truncate">{restText}</span> : null}
    </span>
  );
}

// The SHARED chip tone map — m21's ramp VERBATIM (DESIGN checklist item 5): queued
// grey · running teal + pulse · done teal + ✓ · failed red (destructive) · cancelled
// grey. It mirrors the BOARD's own `runChipClasses` so a chip on this surface reads
// byte-identically to the board's (one vocabulary, one product).
//
// milestone 47 / story 01 (ADR-006(b)) — it arrived here as the run-state chip's tone
// map and it STAYS, deliberately, though `RunStateChip` did not: `AssignmentChip`
// (below) shares it, and sharing it is the DESIGN review's explicit conformance bar
// (a fleet-local chip system is a GAP). Taking it out with the boards region would
// have left the assignment chip unstyled or unbuildable — the one trap that deletion
// was most likely to spring, and the reason this paragraph is here rather than in a
// commit message.
export function runChipClasses(token: string): { chip: string; dot: string } {
  switch (token) {
    case "primary":
      return { chip: "border-primary/30 bg-primary/10 text-primary", dot: "bg-primary" };
    case "destructive":
      return { chip: "border-destructive/30 bg-destructive/10 text-destructive", dot: "bg-destructive" };
    case "secondary":
      return { chip: "border-border bg-secondary text-muted-foreground", dot: "bg-muted-foreground" };
    case "muted":
    default:
      return { chip: "border-border bg-muted text-muted-foreground", dot: "bg-muted-foreground/50" };
  }
}

// The assignment-lifecycle chip (milestone 35 / story 03; DESIGN §2a/§4) — the
// PRIMARY attachment on GlobalMilestoneCard's attention row. It is painted from
// the SAME `runChipClasses(token)` tone map and in the SAME pill shape the m21
// run-state chip used (that component went with m47/ADR-006(b)'s unreachable
// boards region; its tone map did not) — reusing the run-chip primitive and its
// vocabulary is the DESIGN review's explicit conformance bar (a fleet-local chip
// system is a GAP). The
// pure state -> descriptor mapping lives in ./assignments.mjs's
// `assignmentChip` (task 01) — this component is a thin consumer: it applies
// NO ramp logic of its own.
//
// Anatomy: `<mark> <label> → <nodeId> · <relative-time> [· <note>]` — the
// `→ nodeId` / `· time` / `· note` are chip-adjacent mono text OUTSIDE the
// pill (like the board tile's `on <owner>` line), so the pill itself stays the
// run-chip shape.
export function AssignmentChip({ assignment, row }: { assignment: WorkAssignment; row: Region5Row }) {
  const chip = assignmentChip(assignment) as { label: string; token: string; mark: string; motion: string; note?: string };
  const tone = runChipClasses(chip.token);
  const pulsing = chip.motion === "pulse";
  const check = chip.mark === "a ✓";
  const bang = chip.mark === "a !";
  // m47/04 (ADR-014 clause 4) — THIS COMPONENT TAKES NO GEOMETRY DECISION. The
  // `slotFits` boolean that stood here compared a length against a region-5
  // budget while seeing exactly one element of a three-element cluster; the whole
  // row's ladder is now derived once, in the file that owns the budgets, and
  // arrives as `row`. Deciding with a budget belongs there; rendering what was
  // decided belongs here.
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-semibold ${tone.chip}`}
        title={`assignment ${chip.label}`}
      >
        {check || bang ? (
          <span
            className={`grid h-3 w-3 place-items-center rounded-full text-[8px] font-bold text-primary-foreground ${tone.dot}`}
            aria-hidden="true"
          >
            {check ? "✓" : "!"}
          </span>
        ) : (
          <span
            className={`inline-block h-2 w-2 rounded-full ${tone.dot} ${pulsing ? "animate-pulse" : ""}`}
            aria-hidden="true"
          />
        )}
        {chip.label}
      </span>
      {/* DESIGN §2a fix (review GAP-1): this adjacent mono text is the ONE
          shrinkable/truncating element in the assignment attention-row cluster —
          the pill above and the sibling "Open board →" label both stay shrink-0
          (see GlobalMilestoneCard), so a long nodeId truncates here instead of
          displacing or clipping the drill-in.

          DG-13 clause 5 (Amendment 2026-07-24 (b)) split that ONE slot in two,
          because "truncates here" was truncating the wrong half: the judged
          render showed `→ umamis-m…` in every frame carrying a chip. The
          `→ <target>` half is what the chip EXISTS to say and never truncates;
          the `· <when> · <note>` tail was "all else" and was the half that
          yielded.

          DG-47-7 (RULED 2026-08-12) — AND THE TAIL IS NOW RETIRED FROM THE ROW
          ALTOGETHER, at every width, in every state, filtered or unfiltered. It
          was the one occupant here with no degraded-in-place form (DG-19 forbade
          `· just…`), so its state set was exactly {whole, absent} and its own
          PRESENCE became a second signal for a fact the operator cannot see — the
          length of a node id, which is DG-20's error. ADR-014's measured budgets
          then made membership fiction rather than a tight fit: 12ch of slot,
          10 for `· 18d ago`, 2 for `→ `, and the target outranks it. The `title`
          below carries `→ <target> · <when> · <note>` WHOLE and UNCONDITIONALLY
          and is now its sole carrier — which is what it already did, so nothing
          new was built for this.

          DG-15 (2026-07-24 re-render) — the target half was `shrink-0` inside a
          `min-w-0` wrapper with nothing clipping it, so a 30-character node id
          OVERFLOWED the wrapper and PAINTED OVER the sibling `Open board →`:
          the id's trailing glyph and the action's leading glyph occupied the
          same pixels, destroying BOTH. Clause 5 outranks `Open board →` — but it
          expresses that as a YIELD order, never a paint order. The target now
          shrinks (factor 1) only after `Open board →` (factor 999) is exhausted,
          and when it finally must, it truncates INSIDE its own box. The whole
          string is still in the wrapper's `title`. */}
      <span className="mono flex min-w-0 items-center text-[11px] text-muted-foreground" title={`${row.target ?? `→ ${assignment.targetNodeId}`}${row.tailText}`}>
        <span className="min-w-0 shrink truncate whitespace-pre">→ {assignment.targetNodeId}</span>
      </span>
    </span>
  );
}
