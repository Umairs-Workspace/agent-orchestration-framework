---
type: story
number: 00
slug: execution-projection
title: "The execution projection — what actually ran, computed from records that already exist"
parent: 78
status: done
owner: product-owner
created: 2026-09-03
updated: 2026-09-03
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/78_milestone_loop-execution-record/ARCHITECTURE.md#ADR-002, wiki/work/78_milestone_loop-execution-record/ARCHITECTURE.md#ADR-003, wiki/work/78_milestone_loop-execution-record/ARCHITECTURE.md#ADR-004, wiki/work/78_milestone_loop-execution-record/ARCHITECTURE.md#ADR-005, wiki/work/78_milestone_loop-execution-record/ARCHITECTURE.md#ADR-009, src/work-loops.mjs, src/work-loop.mjs, src/run-store.mjs, src/commands/loop.mjs, src/loop-bounds.mjs, src/loop-progress.mjs, scripts/test.mjs]
files: [src/loop-record.mjs, test/loop-record-projection.test.mjs, test/arch/acd-loop-record-projection-pure.test.mjs, scripts/test.mjs]
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 00 · The execution projection — what actually ran, computed from records that already exist

## User story

As an operator reviewing a work item,
I want the facts of which loops actually ran for it — their cycles against their declared ceilings,
their phases, their attempts and how they ended — computed from the run records already on disk,
so that "what did the machinery actually do here" is an answer I can read rather than a JSON filter I
have to write by hand each time.

## Why

53 made the claim that a loop's history is *"a one-key filter over runs rather than a document some
second store would have to keep in step"* (`53/02/tasks/06_loop-state-on-the-board.feature:20-21`).
That is right about the store and silent about the reader: a one-key filter over JSON is a query, and
nothing between 52 and 63 turns it into facts anyone can look at.

This story is the arithmetic half of the answer, and deliberately nothing else. It takes records it is
handed and returns a model. It reads no file, spawns nothing and asks no clock — which is what lets
the whole of it be tested against literal fixtures, and what lets the renderer (78/01) and the writer
(78/02) be built beside it rather than behind it.

**The measurement that shapes it.** At refine, 0 of 61 run records under `wiki/work` carried
`brief.loop` (`ARCHITECTURE.md` §The measurement). So the zero-coverage answer is not this module's
edge case — it is its ordinary case for every item in this repository today, and ADR-003 makes the
projection state its own join coverage rather than return an empty model that reads the same as a
broken one.

## Tasks

- [x] `tasks/00_the-execution-model.feature` — per loop engaged: cycles observed against the declared
      ceiling, phases entered, attempts and the retry chain, terminal outcome and stop reason.
- [x] `tasks/01_coverage-and-gaps.feature` — the join-coverage fact the model always carries, and the
      three named gap classes of ADR-005.

## Notes

**Purity is a fitness function, not a scenario.** FF-7801 asserts that this module reaches no
`node:fs`, no clock and no spawn through its direct imports. It belongs in `ARCHITECTURE.md`'s
register and never in a `.feature` — the tasks below specify what the model *says*, not what the
module is allowed to import.

**The name is load-bearing (ADR-009).** `src/loop-record.mjs`, not `src/work-loops-record.mjs`:
52/FF-5201 discovers `src/work-loops*.mjs` and `src/commands/loops-*.mjs` and holds every discovered
module read-only. This module belongs to the **execution** family — `work-loop.mjs`,
`loop-bounds.mjs`, `loop-progress.mjs` — not the registry family, and takes that family's name.

**Ceilings come from the registry record, cycles from the run declarations.** The two live in
different places and neither is derivable from the other; the projection's job is to hold them
side by side (ADR-004). It does not judge whether a bound was respected — that is the reader's, and
the signature's.
