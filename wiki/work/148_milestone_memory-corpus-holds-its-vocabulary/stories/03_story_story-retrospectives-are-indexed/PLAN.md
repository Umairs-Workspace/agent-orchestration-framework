# 03 · Story retrospectives are indexed — build plan

## Mechanism

`buildRecords` walks `items` once and asks two predicates per item: `isMilestoneSource` (top-level
milestones: RETROSPECTIVE, ARCHITECTURE, AOF) and `isOutcomeSource` (any item, subtree-scoped by
`refInScope`: OUTCOME). Move the RETROSPECTIVE read onto the any-item predicate, keeping today's
per-item order exactly: retrospective, then (for a milestone) architecture and AOF, then OUTCOME.
A milestone's records therefore come out in the order they do today. A non-milestone item yields
its lessons, then its deliveries. The walk stays in `items` order, which recall's equal-score
tie-break depends on.

`meta.item` is already `item.ref`, so a nested story's records carry `134/01` with no further
change.

## Verification step

1. In a temp stream (the `outcome-index-any-item` pattern), plant a milestone with a
   retrospective, a nested story with one, a parentless story with one, and a uat with none.
   `buildRecords(null, …)` returns lessons for the first three and none for the uat, with the right
   `item`. A milestone-only record list built at `HEAD` is a subsequence of today's, in the same order.
2. Over the live tree, count lesson records before and after: they rise by the story-folder lesson
   count (284 measured on 2026-10-04, re-measured at build).
3. FF-14801 stays green.

## Out of scope

- Ranking story lessons differently. Retrieval is out of scope (SPEC, L9).
- Story `ARCHITECTURE.md`. The SPEC names retrospectives only.
- Normalising their meta lines. Story 02's normaliser applies to them on the same read.

## Known traps

- `--only 134` must use `refInScope`, not the milestone predicate's number compare. Otherwise a
  scoped ingest silently drops the stories, which is the trap the OUTCOME leg already fell into once.
