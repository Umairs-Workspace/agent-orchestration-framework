---
type: story
number: 04
slug: the-fleet-and-the-board-see-the-shapes
title: "The fleet and the board see the shapes — a remote node answers for a backlog or archived item, and the board shows the backlog and hides the archive"
parent: 127
depends: [1]
status: not-started
owner: product-owner
created: 2026-09-11
updated: 2026-09-15
adrs: [ADR-006]
reads:
  - wiki/work/127_milestone_backlog-and-archive/SPEC.md
  - wiki/work/127_milestone_backlog-and-archive/ARCHITECTURE.md#ADR-001
  - wiki/work/127_milestone_backlog-and-archive/ARCHITECTURE.md#ADR-002
  - wiki/work/127_milestone_backlog-and-archive/ARCHITECTURE.md#ADR-006
  - wiki/work/127_milestone_backlog-and-archive/DESIGN.md
  - src/work.mjs
  - src/cache-read.mjs
  - src/cache-provenance.mjs
  - src/control-stream-server.mjs
  - src/global-work-publisher.mjs
  - src/global-mesh-query.mjs
  - src/commands/list.mjs
  - ui/src/board/status.tsx
  - ui/src/board/StaleBadge.tsx
  - ui/src/board/ProvenanceLine.tsx
  - ui/src/board/action.mjs
  - ui/src/board/freshness.mjs
  - ui/src/fleet/Fleet.tsx
  - ui/src/index.css
  - test/support/board-app-harness.mjs
  - test/support/react-app-harness.mjs
  - test/support/cache-read-fixture.mjs
  - test/support/fleet-app-harness.mjs
  - test/store/cache-authority-own-disk-read.test.mjs
  - test/store/cache-read-boundary-holds.test.mjs
  - test/store/staleness-schema-v8-provenance.test.mjs
  - test/ui/board-face-contract.test.mjs
  - test/ui/board-freshness-legend.test.mjs
  - test/ui/fleet-scope.test.mjs
  - test/work/stream/work-backlog-archive-enumerate.test.mjs
files:
  - src/global-work-store.mjs
  - src/work/read.mjs
  - src/board-ui.mjs
  - ui/src/board/api.ts
  - ui/src/board/model.ts
  - ui/src/board/Overview.tsx
  - ui/src/board/Board.tsx
  - ui/src/board/BoardLanes.tsx
  - ui/src/board/DetailPanel.tsx
  - ui/src/board/ArchivedPill.tsx
  - ui/src/fleet/scope.mjs
  - ui/src/fleet/api.ts
  - test/store/global-work-store.test.mjs
  - test/store/cache-read-seam.test.mjs
  - test/support/cache-read-fixture.mjs
  - test/support/board-face-fixture.mjs
  - test/ui/board-api.test.mjs
  - test/ui/board-backlog-and-archive.test.mjs
  - test/ui/index.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 04 · The fleet and the board see the shapes

## User story

As **an operator reading the board, or a remote node answering `aof work find` from its cache**,
I want **the synced item view to carry `number: null` + `backlog` and `archived: true`, the board's
overview to show the backlog as quiet grouped rows, and archived items to stay hidden behind one
toggle**,
so that **a backlog or archived item answers identically from every node**, and the board's
overview keeps reading as "what is happening" — a backlog milestone is never painted as a card
with its slug in the ref slot, and an archived one is absent until asked for.

What lands:

- The cache row carries the two shapes at every hop — the disk projection, schema v9's two
  columns, the frame doors, the read-back, the fleet payload — widened ONLY on backlog and
  archived rows, so every frozen-shape pin over live rows holds (task 00).
- The cache-first seam rebuilds a cache-only backlog or archived row in the enumerator's shape,
  so a remote node's `find`, `list`, `list --all` and `next` answer as the owning node does; a
  checkout that still holds the folder keeps its own location (task 01).
- `/api/work/list?includeArchived=1` threads `work:list`'s own `all`; the face filters nothing
  (task 02).
- The overview partitions backlog rows out first and paints them as DESIGN §Surface 1's rows
  (task 03); one toggle flips the request and one pill marks the revealed rows wherever the
  milestone's identity is painted, with the chip and the legend row (task 04).
- The fleet's milestone list partitions the backlog out — no assignment on an un-numbered item
  — and leaves archived rows to its existing status filter, unmarked (task 05).
- A person judges both surfaces against the binding checklists (task 06, `@uat`).

## Tasks

- [ ] 00 `the-cache-row-carries-the-two-shapes` — schema v9, the projection, the bind, the frame doors, `mapItemRow`
- [ ] 01 `a-remote-node-answers-for-a-backlog-or-archived-item` — `cacheOnlyItem`, the overlay rule, every cache-first reader, the CLI
- [ ] 02 `the-list-route-takes-include-archived` — the one parameter, the `WorkItem` type, the fixture's two new members
- [ ] 03 `the-overview-shows-the-backlog-as-rows` — `deriveBoard` partitions first; §Surface 1's checklist off the real tree
- [ ] 04 `one-toggle-reveals-the-archive-with-one-mark` — the toggle, the refetch in place, the pill in every context, the chip, the legend
- [ ] 05 `the-fleet-partitions-the-backlog-out` — `milestoneListItems` drops `number: null`; archived follows the status filter
- [ ] 06 `a-person-judges-the-two-surfaces` — `@uat`: CONFORMS / GAPS / INCONCLUSIVE per checklist row

## Notes

- Depends on 01 for the row shapes; independent of 02 and 03 (a fixture view with the shapes is
  enough to build and judge this story).
- Visual intent is DESIGN.md's and is not restated here; the design-conformance review judges the
  built surfaces against its checklists at verify.
- Ratified at refine (2026-09-15), in the contracts: the seam's `cacheOnlyItem` derives `number`
  from the ref, so `src/work/read.mjs` joins the write set (task 01); the store needs two columns
  — schema v9 — and `archived` is mapped at the bind because a boolean throws (task 00); the
  fleet's milestone list would paint a backlog row and OFFER TO ASSIGN it, so `ui/src/fleet/`
  joins the write set with a partition and no mark (task 05, a documented default in STATE.md);
  archived cards render in the WIRE's order, after the live milestones — DESIGN §Surface 2's
  "where its number puts it" assumed an interleaving ADR-002 §5 does not have (task 04);
  `test/ui` is at its ceiling (56), so the budget row raises with this story's suite stated.
- Build lane: this story declares no `.md`, so `aof test --scope impacted --story 127/04` may
  stay narrow; if it widens, run the un-widened selection as `--scope file` (STATE, 01's note).
