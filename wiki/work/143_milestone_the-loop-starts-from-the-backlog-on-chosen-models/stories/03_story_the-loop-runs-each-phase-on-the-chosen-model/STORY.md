---
type: story
number: 03
slug: the-loop-runs-each-phase-on-the-chosen-model
title: "The loop runs each phase on the chosen model — resolved once, recorded on the declaration, lent to every drive, resumed on"
parent: 143
depends: [02]
status: not-started
owner: product-owner
created: 2026-10-02
updated: 2026-10-02
schema: 1
aofVersion: 0.1.0
adrs: [ADR-003, ADR-004]
reads:
  - wiki/work/143_milestone_the-loop-starts-from-the-backlog-on-chosen-models/SPEC.md
  - wiki/work/143_milestone_the-loop-starts-from-the-backlog-on-chosen-models/ARCHITECTURE.md#ADR-003
  - wiki/work/143_milestone_the-loop-starts-from-the-backlog-on-chosen-models/ARCHITECTURE.md#ADR-004
  - wiki/work/143_milestone_the-loop-starts-from-the-backlog-on-chosen-models/ARCHITECTURE.md#ADR-005
  - wiki/work/archive/141_story_subagents-and-loops-think-at-a-chosen-effort/tasks/01_the-loop-carries-thinking-to-every-drive.feature
  - packages/execution/src/session-model.mjs
  - packages/execution/src/session-driver.mjs
  - packages/core/src/application/bindings/spine/face.mjs
  - packages/core/src/application/bindings/commands/loop.mjs
  - packages/core/src/application/bindings/commands/drive.mjs
  - packages/core/src/application/bindings/loop/child-drive.mjs
  - packages/core/src/application/bindings/loop/wave.mjs
  - packages/mesh/src/assignment-directive.mjs
  - packages/work-loop/src/trigger/declaration.mjs
  - packages/work-loop/test/support/work-loop-story-fixtures.mjs
  - test/arch/loop/acd-loop-narrates-in-flight.test.mjs
  - test/arch/loop/acd-clock-counts-attempts.test.mjs
  - test/arch/session/acd-session-choice-single-home.test.mjs
files:
  - packages/work-loop/src/commands/loop.mjs
  - packages/work-loop/src/engine.mjs
  - packages/work-loop/src/commands/drive.mjs
  - packages/work-loop/src/cycle.mjs
  - packages/work-loop/src/child-drive.mjs
  - packages/work-loop/src/wave.mjs
  - test/loop/drive-command-phase-drivers.test.mjs
  - test/loop/work-loop-declaration.test.mjs
  - test/loop/loop-command-resume.test.mjs
  - test/loop/loop-command-wave.test.mjs
  - test/loop/loop-command-narration.test.mjs
  - test/loop/loop-command-probe.test.mjs
  - test/loop/loop-command-refusals.test.mjs
  - test/fixtures/application/command-inventory.json
  - schemas/aof.schema.json
  - docs/acd.md
---
# 03 · The loop runs each phase on the chosen model

## User story

As **the operator who wants refine on Opus at xhigh and verify on Fable**,
I want **`aof work loop <ref> --model refine=opus:xhigh --model verify=fable:high` to run each phase's
session on what I named, and the run record to say which model ran which phase**,
so that **I can pick the model for each phase from the command line, check afterwards what actually
ran, and resume on the same choices**.

What lands: the loop's `--model` and `--thinking` are repeatable and are parsed by story 02's grammar
before any registered read. All three phases are resolved once. The declaration gains `sessions`, the
per-phase `{ model, modelSource, effort, effortSource }`. Each drive is lent its own phase's model and
effort, in-process and as `--model` / `--thinking` on a child's argv. The drive gains a
single-phase `--model`. 141's `Thinking:` line becomes a `Sessions:` line, and the dry-run probe
carries the table. A resume re-applies the recorded flag choices unless new session flags are given.

## Tasks

- [ ] 00 [the loop resolves and records every phase](tasks/00_the-loop-resolves-and-records-every-phase.feature)
- [ ] 01 [each drive runs on its own phase's choice](tasks/01_each-drive-runs-on-its-own-phases-choice.feature)
- [ ] 02 [a resume reruns on the recorded choices](tasks/02_a-resume-reruns-on-the-recorded-choices.feature)

## Notes

- `thinking` on the declaration keeps 141's meaning (the unphased `--thinking` level or `null`), so
  141's delivered resume and lane criteria stay true. The per-phase record is the new `sessions` key.
- `sessions` is appended with a `null` default. The mesh assignment directive and the trigger
  declaration build declarations without it (ADR-005).
- The loop shell's `LOOP_PHASES` copy is replaced by story 02's exported phase list.
- `schemas/aof.schema.json`'s description of `work.agents.session.effort` names `--thinking` as the
  override. It gains `--model`.
