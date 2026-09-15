@executable @ui @work @board
Feature: the fleet's milestone list partitions backlog rows out, and archived rows fall under the status filter it already has — the fleet offers no assignment on an item that has no number

  Task 00 puts `backlog` and `archived` on the FLEET's row (`mapItemRow`, the `/api/mesh/status`
  payload). The fleet UI's global list is a milestone list projected from that payload at render
  time (`milestoneListItems`, `ui/src/fleet/scope.mjs:399`: `type === "milestone"`), and each
  milestone row carries an `AssignAffordance` keyed on `item.ref` (`Fleet.tsx:1183`) — the
  fleet's door for dispatching a milestone to a node. Fed a backlog row it would paint an
  un-numbered idea as a milestone row with its slug in the ref slot AND offer to assign it: a
  dispatch minted for `search-the-fleet`, an item that cannot be scheduled because it has no
  number and gates nothing (SPEC). That is the board's card defect (task 03) with a hazard
  attached, and it is closed by the SAME rule — partition on the wire fact `number === null`
  BEFORE the list is derived. DESIGN.md designs no fleet surface, so this task adds NOTHING
  visible: no backlog region on the fleet, no archived pill, no toggle. Ratified in this beat
  as a documented default (recorded in STATE.md): the fleet PARTITIONS the backlog out and
  leaves an archived milestone to the status filter it already has — `open` (the default)
  hides a `done` row, `all` and `done` show it, unmarked; a mark on the fleet is a later
  design's, with a checklist, not this story's guess. The fleet UI files
  (`ui/src/fleet/scope.mjs`, `ui/src/fleet/api.ts`) were not in this story's declared write
  set at breakdown and join it here.

  THE PARTITION. `milestoneListItems(items)` answers `items.filter((item) => item?.type ===
  "milestone" && item?.number !== null)` — a row that carries `number: null` (task 00 puts
  the key ONLY on a backlog row, so an absent key is a numbered row) is not a fleet milestone.
  `filterToWorkStatus` and `hiddenMilestoneCount` are unchanged in text and, because they
  spread rows byte-identically, unchanged in effect: an archived `done` row is a `done` row
  to them. `GlobalWorkItem` (`ui/src/fleet/api.ts`) declares `number?: null`, `backlog?:
  string` and `archived?: true`, optional, beside the existing keys. `fleet-scope.test.mjs`'s
  "no surviving row has gained a key it did not have" pins hold: the filter drops rows, it
  never rewrites one.

  THE COUNTS the fleet states follow the list: the Milestones region header's total and its
  hidden-count tail (`hiddenMilestoneCount`) count fleet milestone rows, so a backlog row is
  neither counted nor "hidden" — it was never a candidate. The fleet's drill-in
  (`fleet-board-drill-in`) is untouched: it is reached only from a rendered milestone row.

  What would quietly undo this: a fleet-side `ref` shape test (`/^\d+$/`) instead of the
  wire's `number: null`; a fleet backlog region "since the rows are there" (undesigned); an
  archived filter of the fleet's own (the fleet's status filter already answers, and a second
  predicate is the milestone's disease); an `AssignAffordance` reached from a backlog row by
  any route.

  ADR-006 §1; ADR-002 §2; DESIGN §Intent ("exactly two additions" — both on the board);
  `ui/src/fleet/scope.mjs` `workStatusAdmits` / `filterToWorkStatus` (the fleet's delivered status filter).

  Scenario: a backlog milestone on the fleet payload is neither listed, counted nor assignable
    Given the fleet mounted against a published fixture whose payload carries milestone `43` (`in-progress`), a backlog milestone `search-the-fleet` (`number: null, backlog: ""`, status `null`) and a backlog chore `prune-logs` (`number: null, backlog: "ops/later"`)
    When the Milestones region renders under the default `open` filter
    Then `milestoneListItems(status.items)` is exactly `[<43's row>]`, the region paints one milestone row (`43`), the header's total is `1` with no hidden-count tail, and no node in the tree carries the text `search-the-fleet` or `prune-logs`
    And no `AssignAffordance` exists whose `ref` is `search-the-fleet` — the only assign control on the surface is `43`'s
    When the status filter is set to `all`
    Then the list is still exactly `43` — the partition is not a status

  Scenario Outline: an archived milestone follows the fleet's existing status filter, unmarked
    Given the fleet mounted against a published fixture whose payload carries `43` (`in-progress`) and an archived milestone `12` (`done`, `archived: true`)
    When the status filter is `<filter>`
    Then the Milestones region lists exactly `<rows>`, the header's tail (`workStatusSummaryTail`) is <hidden>, and no node anywhere carries the text `archived` or the glyph `▤`

    Examples: the filter values the fleet already has, over one archived row
      | filter | rows     | hidden                  |
      | open   | 43       | ` · 1 done hidden`      |
      | all    | 43, 12   | `` (empty)              |
      | done   | 12       | `` (empty)              |

  Scenario: the partition drops rows and rewrites none, and the type carries the three keys
    Given the delivered `ui/src/fleet/scope.mjs` and `ui/src/fleet/api.ts`
    When `test/ui/fleet-scope.test.mjs` runs as a focused suite and `tsc -b` runs in `ui/`
    Then every pre-existing case is green — no surviving row has gained a key, `filterToWorkStatus` and `hiddenMilestoneCount` are byte-unchanged — and the type pass is clean with `GlobalWorkItem` declaring `number?: null`, `backlog?: string`, `archived?: true`
    And `milestoneListItems([{ type: "milestone", number: null, ref: "x" }, { type: "milestone", ref: "12", archived: true }, { type: "story", ref: "12/00" }])` answers exactly the `12` row — `number` absent is numbered, `number: null` is not, and type still decides
