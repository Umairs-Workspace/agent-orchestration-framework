---
type: story
number: 02
slug: every-consumer-accounts-for-the-episodic-pool
title: "Every consumer accounts for the episodic pool"
parent: 157
status: not-started
owner: product-owner
created: 2026-10-11
updated: 2026-10-11
depends: [157/01]
schema: 1
aofVersion: 0.1.0
reads: ["wiki/work/157_milestone_episodic-memory-is-recallable/ARCHITECTURE.md#adr-003-every-consumer-accounts-for-the-new-pool","wiki/work/148_milestone_memory-corpus-holds-its-vocabulary/ARCHITECTURE.md#adr-004-status-is-composed-at-the-seam-and-the-layer-map-is-the-one-partition","packages/knowledge/src/memory/episodic-indexing.mjs","packages/knowledge/src/memory/recurrence.mjs","packages/work/src/tune/corpus.mjs","packages/core/src/application/bindings/work-tune/corpus.mjs","test/arch/memory/acd-memory-retrieval-eval.test.mjs","test/integration/support/feature-runner.mjs","test/integration/support/step-registry.mjs","test/integration/support/common-steps.mjs","test/integration/support/cli-context.mjs","test/support/cli-spawn.mjs","scripts/test.mjs"]
files: ["packages/knowledge/src/memory/local-retrieval.mjs","packages/knowledge/src/memory/local-indexing.mjs","packages/knowledge/src/memory/graphify-backend.mjs","packages/knowledge/src/memory.mjs","packages/knowledge/src/commands/memory.mjs","packages/knowledge/test/memory-recall-block.suite.mjs","test/memory/memory-status.test.mjs","test/planning/tune-corpus.test.mjs","test/arch/memory/acd-memory-layer-map-total.test.mjs","test/arch/memory/acd-memory-recall-contract.test.mjs","test/integration/features/work-memory.feature","test/integration/steps/work-memory.steps.mjs"]
---

# 157/02 · Every consumer accounts for the episodic pool

## User story

As an operator reading `aof work memory status`, and as an agent pasting a recall block,
I want the new finding, feedback and run records counted under the episodic layer, shown with
the failure that matters, and returned in full for an item when asked,
so that the memory reports what it holds and a retry or a retrospective can gather an item's
whole history rather than its top five matches.

## Tasks

- [ ] `tasks/00_status-counts-the-episodic-layer.feature` — layer map, legacy counters and both backends agree
- [ ] `tasks/01_recall-returns-and-renders-episodic-records.feature` — the block line, `--all`, and tune's untouched populations

## Notes

- The census of consumers this story changes, and the two it classifies as non-consumers
  (tune's corpus, `recurrence.mjs`), is in the milestone ARCHITECTURE Breakdown (ADR-003).
- `local-indexing.mjs` and `graphify-backend.mjs` are written by 157/01 too; that overlap is
  why this story depends on 01 and runs after it.
- m148/FF-14803's fixture grows a record of every new type; m148/FF-14801 stays as 157/01 left it.
