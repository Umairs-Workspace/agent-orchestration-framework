# 127/04 · The fleet and the board see the shapes — Outcome

## Delivered

### The cache row carries the two shapes at every hop
The global work projection is schema **9**: `work_items` gains `backlog TEXT` and
`archived INTEGER` by the v8 in-place `ALTER` idiom, `archived` mapped `true → 1` at the bind; the
disk projection, both frame doors, the read-back and the fleet payload widen ONLY a backlog row
(`number: null` beside `backlog`) and an archived row (`archived: true`) — a live row keeps its
frozen seven keys. The row screen lives in `src/work/item-row.mjs`, re-exported by the store.

### A remote node answers as the owning node does
`cacheOnlyItem` (`src/work/read.mjs`) rebuilds a cache-only backlog or archived row in the
enumerator's shape — `number` derived from `backlog`'s presence, never from the ref — so
`findWorkCacheFirst`, `listStreamCacheFirst` (default and `--all`) and `nextWorkCacheFirst`, and
`aof work find|list|next` on that node, answer for a backlog slug or an archived ref exactly as the
owner does; a checkout that still holds the folder keeps its own location.

### One list parameter
`GET /api/work/list?includeArchived=1` threads `work:list`'s own `all`; the face filters nothing;
the `WorkItem` type carries `backlog` and `archived`.

### The overview shows the backlog as rows
`deriveBoard` partitions `number === null` rows out FIRST; the overview paints them as DESIGN
§Surface 1's region after the gates — a heading with the count and `aof work promote <slug>` in
its subline, root rows first, groups as verbatim mono paths, rows as `TYPE · slug · title ·
[stale]` with no ring, chip, number, progress, dots or button; absent when the wire carries none.

### One toggle reveals the archive with one mark
`Show archived` — one `aria-pressed` button in the top bar left of the legend — flips the request
in place (busy + disabled in flight, reverting with the dispatch toast on error); archived cards
render after the live ones with the `archived` pill and a `bg-muted/40` surface, the `▤ N archived`
chip appears (even at 0) only when ON, and the mark is painted in the lane board's switcher button,
switcher rows, lane cards under `all` and the detail header — never on a story.

### The fleet partitions the backlog out
`milestoneListItems` drops `number: null` rows before the fleet paints or offers `AssignAffordance`
on a milestone; archived milestones fall under the fleet's existing status filter, unmarked.

## Assumptions

- **the running daemon** — a node's control daemon must restart after this deploy: a pre-v9 build
  refuses the migrated store outright (`global-store-unavailable`, 127/VERIFICATION `F-25`).
- **no fleet design** — the fleet paints no archived mark and no backlog region; DESIGN.md
  designs no fleet surface, so a mark there is a later design's, with its own checklist.

## Gaps

### The human judgement of the two surfaces
- **Status:** open
- **Discharge condition:** the `@uat` task 06 read of DESIGN §Surface 1 and §Surface 2 at 1280 /
  768 / 390 is recorded under `## User sign-off` in the milestone `VERIFICATION.md`.
Tasks 03 and 04 assert the checklists structurally off the rendered tree; how the regions READ is
the operator's to record at verify.
