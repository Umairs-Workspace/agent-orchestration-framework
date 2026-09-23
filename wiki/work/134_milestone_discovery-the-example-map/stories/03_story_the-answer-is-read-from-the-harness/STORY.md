---
type: story
number: 03
slug: the-answer-is-read-from-the-harness
title: "The answer is read from the harness — one reader of AskUserQuestion answers, stamped once onto the run record at settle, from the real transcript store"
parent: 134
depends: [02]
status: not-started
owner: product-owner
created: 2026-09-23
updated: 2026-09-23
adrs: [ADR-003]
reads:
  - wiki/work/134_milestone_discovery-the-example-map/SPEC.md
  - wiki/work/134_milestone_discovery-the-example-map/RESEARCH.md
  - wiki/work/134_milestone_discovery-the-example-map/ARCHITECTURE.md#ADR-003
  - src/work-examples/map.mjs
  - src/run-store.mjs
  - src/run-spend-ingest.mjs
  - src/effects/run-transitions.mjs
  - src/work/observe.mjs
  - src/agent-session-driver.mjs
  - src/commands/run-complete.mjs
  - src/commands/run-start.mjs
  - src/degrade.mjs
  - test/run/run-spend-ingest.test.mjs
  - test/run/run-store-spend.test.mjs
  - test/arch/examples/index.mjs
  - test/examples/index.mjs
files:
  - src/work-examples/answers.mjs
  - src/run-store.mjs
  - src/effects/run-transitions.mjs
  - test/examples/index.mjs
  - test/examples/example-answers.test.mjs
  - test/run/run-spend-ingest.test.mjs
  - test/arch/examples/index.mjs
  - test/arch/examples/acd-example-answer-one-reader.test.mjs
  - test/arch/examples/acd-settle-reads-the-transcript-store.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 03 · The answer is read from the harness

## User story

As **the reviewer who has to trust that an example marked `confirmed` or `stated` was agreed by a
person**,
I want **the person's `AskUserQuestion` answer read from the harness-written transcript by one
reader, filtered to discovery tokens, and stamped once onto the run record at settle, from the
transcript store that actually exists**,
so that **a provenance label is checked against a record the agent did not write, and survives
transcript pruning and a change of machine, and an agent's plausible default can no longer pass
as a person's answer**.

What lands (ADR-003): `src/work-examples/answers.mjs`. It holds the reader (answered results
become records, refused ones none, the tool name taken from `HUMAN_INPUT_TOOL_NAMES`, the tree
walked through `readTranscriptTree`) and `collectAnswers(story)`: stamped answers from settled
runs of the story and its parent, and live answers from a running run through the same reader.
`recordAnswers` in `src/run-store.mjs` is the one writer, validated and stamped once, and
`completeRun` calls it beside spend. `transitionRunComplete` resolves the transcript directory
through `claudeProjectsDir` instead of the repository root. That fixes RESEARCH R5 for spend too,
and the spend suite gains the case that proves a hand-run settle now stamps. FF-13401 and
FF-13404.

## Tasks

To be authored at story refine.

## Notes

- **R6's measured check is owed here** (SPEC, near-miss m62): a fixture transcript with the real
  line shapes (RESEARCH R1: answered, free-text "Other", multi-question, refused), *and* a
  measurement at the source. After a real `aof work run-complete` on a throwaway item, the committed
  run record carries the answer and its `sessionId` and `entrypoint`. Green unit tests alone do not
  discharge it; the R5 gap is exactly how they would pass while nothing is stamped.
- `src/run-store.mjs` carries uncommitted lines from another lane (git status at refine). Check
  its mtime and diff before blaming your own.
