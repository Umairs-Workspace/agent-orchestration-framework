---
type: story
number: 00
slug: recall-hands-over-a-picked-block
title: "Recall hands over a picked block — 20 are shortlisted with promoted lessons dropped, a picker chooses at most 5 or none, and a pick that cannot answer leaves the lexical top 5 and says so"
parent: 201
status: in-review
owner: product-owner
created: 2026-11-17
updated: 2026-11-17
adrs: [ADR-002, ADR-003, ADR-005]
reads:
  - wiki/work/201_milestone_memory-recall-pick/stories/00_story_recall-hands-over-a-picked-block/EXAMPLES.md
  - wiki/work/201_milestone_memory-recall-pick/ARCHITECTURE.md#ADR-002
  - wiki/work/201_milestone_memory-recall-pick/ARCHITECTURE.md#ADR-003
  - wiki/work/201_milestone_memory-recall-pick/ARCHITECTURE.md#ADR-005
  - packages/knowledge/src/memory/local-retrieval.mjs
  - packages/knowledge/src/memory/graphify-backend.mjs
  - packages/knowledge/src/engine.mjs
  - packages/work/src/memory-vocabulary.mjs
  - packages/core/src/application/bindings/commands/work/memory.mjs
  - packages/core/src/application/bindings/work/memory.mjs
  - packages/knowledge/test/memory-hooks-inert.suite.mjs
  - test/arch/memory/acd-memory-recall-contract.test.mjs
  - test/arch/memory/acd-memory-backend-interface.test.mjs
  - test/memory/retrieval-eval.test.mjs
files:
  - packages/knowledge/src/memory.mjs
  - packages/knowledge/src/memory/recall-pick.mjs
  - packages/knowledge/src/commands/memory.mjs
  - packages/knowledge/package.json
  - packages/knowledge/test/index.mjs
  - packages/knowledge/test/memory-recall-block.suite.mjs
  - packages/knowledge/test/memory-recall-pick.suite.mjs
  - test/command/work-memory-command.test.mjs
  - test/work/lifecycle/work-memory-seam.test.mjs
  - test/arch/memory/acd-recall-pick-single-home.test.mjs
  - test/arch/memory/acd-recall-pick-is-injected.test.mjs
  - test/arch/memory/index.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 201/00 · Recall hands over a picked block

## User story

As **an agent about to make a decision at a recall edge**,
I want **`aof memory recall --block` to hand me only the records a picker chose from the 20
best-ranked, or nothing when none applies**,
so that **I read one or two records that bear on my decision, where today I read five and two of
them are noise**.

What lands (ADR-002, ADR-003, ADR-005): the shortlist and the pick on the seam's one core path, the
contract leaf `recall-pick.mjs`, the promoted-lesson filter, and the soft failure with its stderr
line. The picker is injected. This story builds and tests against a stub, and story 01 supplies the
model. FF-20101 and FF-20102 land here.

## Tasks

- [x] `tasks/00_the-block-is-picked-from-a-shortlist.feature` (R1): the picker is handed the 20 best-ranked records in scope, the block is what it picked, at most 5, and a pick of nothing prints nothing.
- [x] `tasks/01_the-pick-fails-soft-and-says-so.feature` (R2): a picker that cannot answer leaves the lexical top 5, exit 0, and one stderr line naming why.
- [x] `tasks/02_promoted-lessons-leave-the-shortlist.feature` (R3): a lesson promoted to a control, a rule or a prompt is never a card.
- [x] `tasks/03_only-the-block-is-picked.feature` (R4): `--json`, the text view, `--all`, `recurrence` and `status` are what they are today, and `--limit` sets the block's cap.

## Notes

- Until story 01 lands, the CLI injects no picker, so the shipped block is the lexical top 5 with
  promoted lessons dropped, and nothing is announced (`pick-unwired`).
- A new file under `packages/knowledge/src/memory` needs its row raised in
  `acd-source-directory-budget`, whose ceiling equals the delivered count.
