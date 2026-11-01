---
type: story
number: 03
slug: teaching-guides-through-the-problem
title: "Teaching guides through the problem — think first, help on request one rung at a time, and the traps taught through this story's own code"
parent: 179
depends: [02]
status: in-review
owner: product-owner
created: 2026-10-28
updated: 2026-11-01
adrs: [ADR-006]
reads:
  - wiki/work/179_milestone_human-led-problem-solving/SPEC.md
  - wiki/work/179_milestone_human-led-problem-solving/ARCHITECTURE.md#ADR-006
  - wiki/planning/RESEARCH-human-led-learning.md
  - packages/core/assets/commands/manual.md
  - packages/specification-by-example/src/map.mjs
  - packages/learning/test/teach-frame.suite.mjs
files:
  - packages/learning/src/vocabulary.mjs
  - packages/learning/package.json
  - packages/learning/assets/commands/teach.md
  - packages/learning/test/index.mjs
  - test/arch/command/acd-teach-vocabulary-one-home.test.mjs
  - test/arch/command/index.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - packages/learning/test/teach-guide.suite.mjs
  - .claude/commands/aof/teach.md
  - .codex/aof/workflows/workflow-contract.md
  - .aof/aof.lock.json
  - packages/core/assets/manifest.json
  - wiki/work/archive/142_milestone_yarn-workspace-modularization/plans/09-test-ledger.json
schema: 1
aofVersion: 0.1.0
---
# 179/03 · Teaching guides through the problem

## User story

As **an operator learning the part of the system a story touches**,
I want **the teaching session to ask me to restate the problem, predict an example and propose an
approach before it reveals anything, to give more help only when I ask for it, one labelled rung at
a time, and to name a trap only through the code in front of me**,
so that **I do the thinking, I decide how much help I get, and nothing I learn depends on a hint I
did not ask for**.

What lands (ADR-006): `vocabulary.mjs` (the six stages, the five rungs, and the eight traps with
their controls), the guidance half of `teach.md`, and FF-17903.

## Tasks

- [x] 00 [the pedagogy is one vocabulary](tasks/00_the-pedagogy-is-one-vocabulary.feature)
- [x] 01 [teaching guides through the problem](tasks/01_teaching-guides-through-the-problem.feature)

## Notes

- `teach.md` is 02's too, so this story follows 02 (ADR-008). It adds the guidance and leaves the
  frame 02 wrote as it is.
- It grounds the guidance in the same sources `aof:manual` reads (the story's `reads:`, `files:`,
  task features, confirmed examples and test locations), which is why `manual.md` is in `reads:`.
