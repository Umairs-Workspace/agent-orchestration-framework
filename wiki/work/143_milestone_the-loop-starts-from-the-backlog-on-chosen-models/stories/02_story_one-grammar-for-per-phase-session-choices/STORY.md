---
type: story
number: 02
slug: one-grammar-for-per-phase-session-choices
title: "One grammar for per-phase session choices — parseSessionChoices, a per-part resolver with its sources, and repeatable CLI flags"
parent: 143
status: in-review
owner: product-owner
created: 2026-10-02
updated: 2026-10-03
schema: 1
aofVersion: 0.1.0
adrs: [ADR-003]
reads:
  - wiki/work/143_milestone_the-loop-starts-from-the-backlog-on-chosen-models/SPEC.md
  - wiki/work/143_milestone_the-loop-starts-from-the-backlog-on-chosen-models/ARCHITECTURE.md#ADR-003
  - wiki/work/archive/70_milestone_warm-start/ARCHITECTURE.md#ADR-005
  - packages/work-loop/src/commands/drive.mjs
  - packages/work-loop/src/commands/loop.mjs
  - packages/execution/test/index.mjs
  - packages/execution/test/domain-services.test.mjs
  - test/arch/session/acd-agent-model-source-map.test.mjs
  - test/arch/command/acd-command-route-derived.test.mjs
  - test/command/application-assembly.test.mjs
files:
  - packages/execution/src/session-model.mjs
  - packages/core/src/application/bindings/spine/face.mjs
  - packages/execution/test/session-model.suite.mjs
  - packages/execution/test/domain-services.test.mjs
  - test/command/cli-face-contract.test.mjs
  - test/command/index.mjs
  - test/arch/session/acd-agent-model-source-map.test.mjs
  - packages/knowledge/src/memory.mjs
  - packages/mesh/src/commands/session.mjs
---
# 02 · One grammar for per-phase session choices

## User story

As **the operator choosing which model and effort each phase runs on**,
I want **one grammar for `--model [<phase>=][<model>][:<effort>]` and `--thinking [<phase>=]<effort>`,
which refuses anything it cannot read instead of guessing**,
so that **`--model refine=opus:xhigh --model verify=fable:high` means exactly one thing wherever it
is typed, and a typo stops the command instead of quietly running on the wrong model**.

What lands: `parseSessionChoices` in the session leaf, `resolveSessionLaunch` extended to resolve the
model and the effort separately from a per-phase choice and to report `modelSource` beside
`effortSource`, and `repeatable: true` for string flags in the CLI parser. Nothing calls the new
grammar yet. Story 03 wires it into the loop and the drive.

## Tasks

- [x] 00 [a choice is read by one grammar](tasks/00_a-choice-is-read-by-one-grammar.feature)
- [x] 01 [each part resolves from flag, config, then default](tasks/01_each-part-resolves-from-flag-config-then-default.feature)
- [x] 02 [a string flag can be given more than once](tasks/02_a-string-flag-can-be-given-more-than-once.feature)

## Notes

- A pure leaf. `session-model.mjs` imports nothing and reads no file or clock, and it stays that way.
- 141's delivered outlines on `resolveSessionLaunch(config, phase, { thinking })` must stay green
  unchanged. The `{ thinking }` option means an unphased `--thinking`.
- FF-14303 lands here. Its second clause (nothing under `packages/work-loop/src/` reads
  `agents.session`) already holds, and the test pins it before story 03 touches the loop.
  Red-probe both clauses and record the probes in the milestone `VERIFICATION.md`.
