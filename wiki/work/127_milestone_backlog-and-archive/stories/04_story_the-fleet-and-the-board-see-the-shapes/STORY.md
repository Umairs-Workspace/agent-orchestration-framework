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
updated: 2026-09-11
adrs: [ADR-006]
reads:
  - wiki/work/127_milestone_backlog-and-archive/SPEC.md
  - wiki/work/127_milestone_backlog-and-archive/ARCHITECTURE.md#ADR-001
  - wiki/work/127_milestone_backlog-and-archive/ARCHITECTURE.md#ADR-002
  - wiki/work/127_milestone_backlog-and-archive/ARCHITECTURE.md#ADR-006
  - wiki/work/127_milestone_backlog-and-archive/DESIGN.md
  - src/work.mjs
  - src/global-work-store.mjs
  - src/global-work-publisher.mjs
  - src/board-ui.mjs
  - src/cache-provenance.mjs
  - ui/src/board/api.ts
  - ui/src/board/model.ts
  - ui/src/board/Overview.tsx
  - ui/src/board/Board.tsx
  - ui/src/index.css
files:
  - src/global-work-store.mjs
  - src/board-ui.mjs
  - ui/src/board/api.ts
  - ui/src/board/model.ts
  - ui/src/board/Overview.tsx
  - ui/src/board/Board.tsx
  - test/store/global-work-store.test.mjs
  - test/store/index.mjs
  - test/ui/board-api.test.mjs
  - test/ui/board-backlog-and-archive.test.mjs
  - test/ui/index.mjs
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

- `mapItemRow` and the `view.items` merge in `src/global-work-store.mjs` carry the two new row
  shapes unchanged from `listItems`, so `findWork` over a cached view resolves a backlog slug and an
  archived number exactly as the owning node does.
- `/api/work` list in `src/board-ui.mjs` takes an include-archived parameter, default excluded
  (the board cannot know how many archived items exist with the toggle off — DESIGN.md §"What the
  surfaces receive").
- `deriveBoard` (`ui/src/board/model.ts`) partitions backlog rows out BEFORE card derivation; the
  overview (`Overview.tsx`) gains the Backlog section and the archived toggle + mark exactly as
  DESIGN.md's binding checklists specify — no mock was elicited, so the checklists are the
  conformance source of truth.

## Tasks

- to be authored at the story's own refine (`aof:refine 127/04`)

## Notes

- Depends on 01 for the row shapes; independent of 02 and 03 (a fixture view with the shapes is
  enough to build and judge this story).
- Visual intent is DESIGN.md's and is not restated here; the design-conformance review judges the
  built surfaces against its checklists at verify.
