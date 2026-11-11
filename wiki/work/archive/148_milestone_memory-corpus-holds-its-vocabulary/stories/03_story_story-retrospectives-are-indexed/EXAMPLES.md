---
doc: examples
---
# 148/03 · Story retrospectives are indexed — example map
<!--
Drafted at refine's discovery beat, 2026-10-04. Struck before asking, because the record answers
them: whether story lessons should rank below milestone lessons (SPEC: retrieval changes are out of
scope, L9); whether a chore's or spike's retrospective counts (ADR-006: the read is path-driven, as
OUTCOME's is); whether story ARCHITECTURE files join (SPEC names retrospectives only). No question
is left for a person.
-->

## R1 · Every item's retrospective is read, whatever the item's type
- E1 · 134/01's retrospective holds R1 and R2 → two lesson records, each with item "134/01" [proposed]
- E2 · The parentless story 145's retrospective holds R1 to R3 → three lesson records, each with item "145" [proposed]
- E3 · Milestone 134's own retrospective (R1 to R3) → exactly the three records it gave before [proposed]
- E4 · A uat carrying no RETROSPECTIVE.md → no lesson record [proposed]

## R2 · A milestone's scope reaches its stories' lessons, and a story's scope reaches only its own
- E5 · `recall "contract cited a file no branch carried" --item 134` → returns 134/01's R1 [proposed]
- E6 · `recall … --item 134/02` → returns no lesson from 134/01 [proposed]
- E7 · `ingest 134` rebuilds 134's lessons and every lesson under 134's stories [proposed]

## R3 · The larger pool still holds every eval pair
- E8 · With the story lessons indexed, FF-14801 reports every pair held [proposed]

## Questions
- Q1 · technical · defaulted ADR-006 · Is the read gated on the item's type? (no, it is path-driven)
