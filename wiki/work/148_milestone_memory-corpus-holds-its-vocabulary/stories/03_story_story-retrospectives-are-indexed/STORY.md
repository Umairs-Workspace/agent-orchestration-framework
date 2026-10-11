---
type: story
number: 03
slug: story-retrospectives-are-indexed
title: "Story retrospectives are indexed — every item's RETROSPECTIVE.md is read, so a story's lessons answer to its ref"
parent: 148
status: done
owner: product-owner
created: 2026-10-04
updated: 2026-10-06
schema: 1
aofVersion: 0.1.0
depends: [01, 02]
adrs: [ADR-006, ADR-005]
reads:
  - wiki/work/148_milestone_memory-corpus-holds-its-vocabulary/SPEC.md
  - wiki/work/148_milestone_memory-corpus-holds-its-vocabulary/ARCHITECTURE.md#ADR-006
  - wiki/work/148_milestone_memory-corpus-holds-its-vocabulary/ARCHITECTURE.md#ADR-005
  - packages/work/src/ref-scope.mjs
  - packages/work/src/memory-vocabulary.mjs
  - packages/knowledge/src/memory/local-retrieval.mjs
  - packages/core/src/application/bindings/memory/local-indexing.mjs
  - test/run/outcome-index-any-item.test.mjs
  - test/memory/memory-indexing.test.mjs
  - test/arch/memory/acd-memory-retrieval-eval.test.mjs
files:
  - packages/knowledge/src/memory/local-indexing.mjs
  - packages/knowledge/test/story-retrospectives-indexed.suite.mjs
  - packages/knowledge/test/index.mjs
  - test/arch/memory/acd-memory-retrieval-eval.test.mjs
---
# 03 · Story retrospectives are indexed

## User story

As **an agent recalling what earlier work taught**,
I want **the lessons a story wrote in its own retrospective to be recallable under that story's
ref, and under its milestone's**,
so that **what building a story taught (284 lessons today, 0 of them indexed) reaches the next
recall instead of sitting in a folder no index reads**.

What lands (ADR-006): `RETROSPECTIVE.md` joins the any-item, subtree-scoped read that
`OUTCOME.md` already rides. ARCHITECTURE and AOF stay milestone-only. A story's lessons carry its
ref (`134/01`), and `--item 134` reaches them. FF-14801 (story 01) guards the larger pool.

## Tasks

- [x] 00 [a story's retrospective is recalled under its ref](tasks/00_a-storys-retrospective-is-recalled-under-its-ref.feature)

## Notes

- The predicate is path-driven, as the OUTCOME leg's is (`local-indexing.mjs:714-721`): what is on
  disk is read, whatever the item's type. No second list of types that are entitled to one.
- If FF-14801 loses a pair once the story lessons join, that is the guard working. Either the pair
  holds, or the review shows why it should move and the table changes in this story. It never
  goes silently red or silently green.
- `aof work tune` already reads every item's retrospective (`packages/work/src/tune/corpus.mjs:74`).
  Nothing changes there.
