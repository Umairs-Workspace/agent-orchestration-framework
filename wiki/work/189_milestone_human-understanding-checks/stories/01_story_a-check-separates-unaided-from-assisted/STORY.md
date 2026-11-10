---
type: story
number: 01
slug: a-check-separates-unaided-from-assisted
title: "A check separates unaided from assisted, and reports shipping and understanding apart — four task-grounded kinds, help pulled and labelled, no verdict a fluent answer can earn"
parent: 189
depends: [00]
status: not-started
owner: product-owner
created: 2026-11-01
updated: 2026-11-10
adrs: [ADR-003, ADR-004]
reads:
  - wiki/work/189_milestone_human-understanding-checks/SPEC.md
  - wiki/work/189_milestone_human-understanding-checks/ARCHITECTURE.md#ADR-003
  - wiki/work/189_milestone_human-understanding-checks/ARCHITECTURE.md#ADR-004
  - wiki/work/188_milestone_human-led-problem-solving/ARCHITECTURE.md#ADR-006
  - wiki/work/187_spike_guided-mode-boundary/SPIKE.md#finding
  - packages/learning/assets/commands/grill-me.md
  - packages/learning/test/grill-me-frame.suite.mjs
  - packages/learning/test/teach-guide.suite.mjs
files:
  - packages/learning/src/vocabulary.mjs
  - packages/learning/assets/commands/grill-me.md
  - packages/learning/assets/commands/teach.md
  - packages/learning/test/index.mjs
  - packages/learning/test/grill-me-guide.suite.mjs
  - test/arch/command/acd-teach-vocabulary-one-home.test.mjs
  - packages/learning/test/teach-frame.suite.mjs
  - packages/learning/README.md
  - .claude/commands/aof/grill-me.md
  - .claude/commands/aof/teach.md
  - .codex/aof/workflows/workflow-contract.md
  - .aof/aof.lock.json
  - .aof/aof.apply-journal.json
  - packages/core/assets/manifest.json
  - test/arch/testing/acd-source-directory-budget.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 189/01 · A check separates unaided from assisted, and reports both halves apart

## User story

As **an operator being checked on a story I built**,
I want **to try each check on my own first, pull help one rung at a time if I need it, and see at
the end exactly what I got right unaided, where I needed help, what is still unclear, and what to
practise next, kept apart from whether the story shipped**,
so that **I learn where my understanding really stands, and a green build or a confident answer
cannot pass for it**.

What lands (ADR-003, ADR-004): `CHECK_KINDS` and `CHECK_RESULTS` in `vocabulary.mjs`, `grill-me.md`'s
`<checks>` and `<summary>` regions, FF-18902's leg in the vocabulary control, the suite that pins the regions, and the optional pointer in
`teach.md`'s `taught:` outcome.

## Tasks

- [ ] 00 [the check vocabulary has one home](tasks/00_the-check-vocabulary-has-one-home.feature)
- [ ] 01 [each check starts unaided and is grounded in the record](tasks/01_each-check-starts-unaided-and-is-grounded.feature)
- [ ] 02 [the summary keeps shipping and understanding apart](tasks/02_the-summary-keeps-shipping-and-understanding-apart.feature)

## Notes

- `teach.md` is 188/03's file. The one line added to its `taught:` outcome names `aof:grill-me` as
  optional and changes no 188 criterion; `teach-frame.suite.mjs` gains the row that pins it.
- FF-17903 must stay green: `grill-me.md` may name the help rungs, but never `Forming` or `Dislodging`.
