---
type: story
number: 03
slug: the-recorded-recalls-replay-against-the-shipped-block
title: "The recorded recalls replay against the shipped block — a script runs each recorded recall as the lexical block and as the shipped one, so an outsider can see the direction 177 measured"
parent: 201
depends: [00, 01]
status: in-review
owner: product-owner
created: 2026-11-17
updated: 2026-11-18
adrs: [ADR-007]
reads:
  - wiki/work/201_milestone_memory-recall-pick/stories/03_story_the-recorded-recalls-replay-against-the-shipped-block/EXAMPLES.md
  - wiki/work/201_milestone_memory-recall-pick/ARCHITECTURE.md#ADR-003
  - wiki/work/201_milestone_memory-recall-pick/ARCHITECTURE.md#ADR-007
  - wiki/work/177_spike_memory-retrieval-precision/SPIKE.md
  - wiki/work/177_spike_memory-retrieval-precision/REPLAY.md
  - packages/work/src/feedback-records.mjs
  - packages/work/src/discovery.mjs
  - packages/knowledge/src/memory.mjs
  - packages/knowledge/src/memory/recall-pick.mjs
  - packages/execution/src/model-ask.mjs
  - packages/execution/test/fixtures/claude-stand-in.mjs
  - packages/core/src/application/bindings/commands/work/memory.mjs
files:
  - scripts/memory-recall-replay.mjs
  - scripts/workspace-runtime-audit.json
  - test/memory/index.mjs
  - test/memory/recall-replay.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - packages/core/src/application/bindings/commands/work/memory.mjs
schema: 1
aofVersion: 0.1.0
---
# 201/03 · The recorded recalls replay against the shipped block

## User story

As **an outsider checking that the pick did what 177 measured**,
I want **one script that replays the recalls already on the ledgers, as the lexical block and as
the shipped block, and reports the two side by side**,
so that **I can see the improvement in direction for myself, on this project's own recalls,
without rebuilding 177's throwaway harness**.

What lands (ADR-007): `scripts/memory-recall-replay.mjs`, a project script that reads the ledgers,
replays a seeded sample through the seam the CLI runs, has a model judge grade what each block
showed (the operator's answer to Q1, 2026-11-17), and writes one report. It writes no ledger and
no index.

## Tasks

- [x] `tasks/00_the-replay-runs-each-recorded-recall-twice.feature` (R1): a seeded sample of the recorded block recalls is replayed as the lexical block and as the shipped block, with its recorded scope, and nothing but the report is written.
- [x] `tasks/01_the-report-shows-what-each-block-handed-over.feature` (R2): per edge and overall, the report shows records per recall, empty blocks and degraded recalls, and says when no direction can be read.
- [x] `tasks/02_a-judge-grades-both-blocks.feature` (R3): a model judge grades every record either block showed, and the report names whether the direction holds.
- [ ] `tasks/03_on-this-projects-ledgers-the-direction-holds.feature` (R3, `@manual`): a replay of 40 recorded recalls on this project shows less noise and no fewer decision-changing records in the shipped block.

## Notes

- The ledgers held 320 recorded recalls on 2026-11-17: 167 `verify-finding`, 96
  `continue-developer`, 30 `refine-architect`, 25 `refine-po` and 2 `shatter-po`.
- The pick is not deterministic, so two replays with one seed replay the same recalls and may
  grade differently. The report says so.
