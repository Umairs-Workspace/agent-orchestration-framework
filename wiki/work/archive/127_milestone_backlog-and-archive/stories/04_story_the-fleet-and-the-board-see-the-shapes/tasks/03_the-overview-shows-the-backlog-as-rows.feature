@executable @ui @work @board
Feature: the overview partitions backlog rows out before any card is derived and shows them as quiet grouped rows in a fourth region — never as a card, gate bar, lane card, switcher row or detail item

  `deriveBoard` (`ui/src/board/model.ts:63-65`) sweeps every `type: milestone, parent: null`
  row into a card, every `uat` into a gate bar and every `spike` / `chore` into `otherDrivers`.
  Fed 127/01's rows unchanged it paints a backlog milestone as a card with its slug in the ref
  slot, a `not-started` ring asserting a lifecycle it has not entered, an empty progress track
  and an `Open board →` that opens nothing. ADR-006 §3 rules the partition happens FIRST; this
  task is the partition and the region DESIGN.md §Surface 1 specifies for it. No mock was
  elicited for 127 (STATE, default decision), so §Surface 1's BINDING CHECKLIST is the
  conformance source of truth and the scenarios below are that checklist read region by region
  off the REAL `<Board/>` mounted against the REAL face (`withBoardApp` / `withBoardFace`, the
  m43 harness) — never a rendering of a stand-in component.

  THE PARTITION. `deriveBoard(items)` splits on the wire fact `number === null` before
  anything else: `backlog: WorkItem[]` (wire order) joins `Derived`, and every other
  derivation — `milestones`, `uat`, `otherDrivers`, `byRef`, the three counts — is computed
  over the REMAINDER. `byRef` deliberately excludes backlog rows: `Board.tsx`'s hash deep-link
  effect resolves `#<ref>` through `byRef` and would otherwise open a board for a backlog
  milestone (a `type: milestone` hit sets focus and view), so `#search-the-fleet` lands on the
  overview and opens nothing — DESIGN default 1, the board is read-only on the backlog.
  `storiesOf`, `gatesFor`, `milestoneOfGate` and `findMilestone` are unchanged; a backlog
  `story` (a parentless one) is a backlog row like any other and reaches no lane.

  THE REGION, per the checklist. Order: header → grid → Acceptance gates → **Backlog**, and
  ABSENT when `derived.backlog` is empty (the wire carries no "folder exists" fact, so none is
  asserted — the gates strip's rule). Heading `h2` `Backlog` in the gates idiom (`mb-3 text-sm
  font-semibold uppercase tracking-wide text-muted-foreground`) with a normal-case `text-xs`
  subline on the same line: `N items · un-numbered, not scheduled · promote with` followed by
  `aof work promote <slug>` in `mono`; the count lives here and NOT in the header chips. Rows
  grouped: root rows (`backlog === ""`) first with no heading, then each group under its
  relative path VERBATIM as a flat mono sub-heading (`mono text-[11px] text-muted-foreground`,
  `mt-3 mb-1`) in code-point order — `ops/later` after `ops`, never an indented tree; rows
  keep wire order within a group. A row is a `<li>` — `rounded-lg border border-border bg-card
  px-3 py-2 text-sm` with `gap-3`, `space-y-2` between rows — holding, left to right: the type
  label in the uppercase idiom (`text-[10px] font-semibold uppercase tracking-wider
  text-muted-foreground`) in a fixed-width column sized to `milestone` so slugs align; the slug
  in the mono ref slot (`mono text-sm text-muted-foreground`); the title `min-w-0 flex-1
  truncate text-sm font-medium` falling back to the humanised slug; and at the `ml-auto` end
  the stale badge in `short` form when the row's freshness says so, else NOTHING. No
  `StatusRing`, `StatusChip`, `StatusDot`, number, progress track, story dots, footer, `Open
  →`, `<button>` or `<a>`; not focusable (no `tabIndex`, no `onClick`); no `primary`, `accent`
  or `destructive` token anywhere in the section. Freshness is 43's ramp unchanged — the
  board's one `freshnessOf` reading, the row's `reportedBy` / `syncedAt` if the cache published
  it.

  What would quietly undo this: a partition on `ref` shape (`/^\d+$/`) rather than the wire's
  `number: null`; a backlog row reaching `byRef`; a `<button>` row "for later"; a count in the
  header chips; an indented group tree; a `not-started` ring "so the row is not bare".

  ADR-006 §3; ADR-002 §5 (the order is the wire's); DESIGN §Surface 1, its binding checklist,
  documented defaults 1 and 2; 07/ADR-003 (the checklist is the baseline).

  Scenario: a backlog milestone never reaches a card, a gate bar, a lane, the switcher or the detail panel
    Given the board mounted against a face whose stream holds milestone `43`, gate `44`, backlog rows `search-the-fleet` (milestone, group `""`), `prune-logs` (chore, group `ops/later`), `rotate-keys` (chore, group `ops`) and `field-notes` (story, group `""`)
    When the overview renders
    Then `deriveBoard(items).backlog` is the four rows in wire order and `milestones`, `uat`, `otherDrivers` and `byRef` contain none of them
    And the grid paints exactly one milestone card (`43`), the gates strip exactly one bar (`44`), and no node anywhere in the tree carries the text `search-the-fleet` inside a `<button>` or `<a>`
    And the header chips read `✓ 0 done` and `◐ 1 active` — the backlog is not a lifecycle bucket
    When the milestone board is opened (`Open board →` on `43`) and the switcher is opened
    Then the switcher lists `All milestones` and `43` only, and the lanes under `all` focus hold no card whose ref is a backlog slug
    When the page is mounted with `#search-the-fleet`
    Then the view is the overview, no board is focused, and the detail panel is not rendered — the deep link opened nothing

  Scenario: the Backlog region is last, absent when empty, and its heading carries the count and the door
    Given the same mounted board
    When the overview renders
    Then the overview's regions in DOM order are the header, the grid, the `Acceptance gates` section and a section whose `h2` reads `Backlog` with the gates heading's exact class string
    And beside the heading a `text-xs` subline reads `4 items · un-numbered, not scheduled · promote with aof work promote <slug>` with `aof work promote <slug>` inside a `mono` span
    Given the board mounted against the DEFAULT stream (no backlog rows on the wire)
    When the overview renders
    Then no `h2` reads `Backlog` and no node carries the text `un-numbered` — the section is absent, not empty

  Scenario: rows are grouped by their verbatim path, root rows first, in code-point order, wire order within a group
    Given the same four-row backlog, whose wire order is `listStream`'s (group path then slug, code-point order — ADR-002 §5): `field-notes, search-the-fleet, rotate-keys, prune-logs`
    When the overview renders
    Then the Backlog section's children in DOM order are: the row `field-notes`, the row `search-the-fleet` (root rows, no sub-heading above them), a `mono text-[11px] text-muted-foreground` sub-heading `ops`, the row `rotate-keys`, a sub-heading `ops/later`, the row `prune-logs` — the section re-sorts nothing
    And each sub-heading's text is the group path verbatim — no indentation, no `/` splitting, no tree glyph, and no sub-heading at all for `""`

  Scenario Outline: a backlog row shows type, slug and title only, and is not interactive
    Given the same mounted board
    When the row for `<slug>` is read off the rendered tree
    Then it is an `<li>` whose class string contains `rounded-lg border border-border bg-card px-3 py-2 text-sm` and `gap-3`, with no `onClick`, no `tabIndex`, no `role="button"`, and no descendant `<button>` or `<a>`
    And its first child is the type label `<type>` in `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` inside a fixed-width column whose width every row shares, its second the slug `<slug>` in `mono text-sm text-muted-foreground`, its third the title `<title>` in `min-w-0 flex-1 truncate text-sm font-medium`
    And it contains no `StatusRing`, `StatusChip`, `StatusDot`, progress track, story dots, footer, `Open` text, and no class containing `primary`, `accent` or `destructive`

    Examples: the four rows, one per driver shape the backlog admits
      | slug             | type      | title                                   |
      | search-the-fleet | milestone | Search the fleet                        |
      | field-notes      | story     | Field notes                             |
      | rotate-keys      | chore     | Rotate keys                             |
      | prune-logs       | chore     | Prune Logs (the humanised slug — no title on the wire) |

  Scenario: the stale badge and the provenance reading on a backlog row are 43's, unchanged
    Given the same mounted board, with the face's cache reporting `prune-logs` by `umamis-mac-mini` at `app.at(-301)` under a 300-second window, and `search-the-fleet` never cache-published
    When the overview renders
    Then the row for `prune-logs` ends in exactly one stale badge in `short` form at its `ml-auto` end, carrying the same pinned class signature the milestone card's badge carries and no motion class
    And the row for `search-the-fleet` ends in nothing — no badge, no "fresh" word, no placeholder
    When the app's clock advances one second past the crossing for a row reported at `app.at(-299)`
    Then that row's badge appears within one tick with no list request issued (`requestsMatching("/api/work/list")` unchanged)
