---
type: story
number: 00
slug: the-loop-promotes-a-backlog-ref
title: "The loop promotes a backlog ref — through the one promote door, recorded, then run at the minted number"
parent: 143
status: in-progress
owner: product-owner
created: 2026-10-02
updated: 2026-10-02
schema: 1
aofVersion: 0.1.0
adrs: [ADR-001]
reads:
  - wiki/work/143_milestone_the-loop-starts-from-the-backlog-on-chosen-models/SPEC.md
  - wiki/work/143_milestone_the-loop-starts-from-the-backlog-on-chosen-models/ARCHITECTURE.md#ADR-001
  - packages/work/src/commands/promote.mjs
  - packages/work/src/commands/continue.mjs
  - packages/core/src/application/bindings/commands/loop.mjs
  - packages/mesh/src/assignment-directive.mjs
  - packages/work-loop/src/trigger/declaration.mjs
  - packages/work-loop/test/work-loop-scope-guard.suite.mjs
  - test/arch/loop/acd-loop-scope-guard.test.mjs
  - test/loop/loop-command-refusals.test.mjs
  - test/loop/loop-command-probe.test.mjs
files:
  - packages/work-loop/src/commands/loop.mjs
  - packages/work-loop/src/engine.mjs
  - test/loop/loop-command-refusals.test.mjs
  - test/loop/index.mjs
  - test/loop/work-loop-declaration.test.mjs
  - test/loop/work-loop-declarations.test.mjs
  - test/loop/loop-command-resume.test.mjs
  - packages/work-loop/test/support/work-loop-story-fixtures.mjs
  - test/arch/loop/acd-loop-scope-guard.test.mjs
  - test/fixtures/application/command-inventory.json
  - docs/acd.md
---
# 00 · The loop promotes a backlog ref

## User story

As **the operator with an idea sitting in the backlog**,
I want **`aof work loop <backlog-slug>` to promote it and carry straight on into refine and build**,
so that **I do not have to stop, run `aof work promote`, read the number it minted and start the loop
again**.

What lands: the loop shell resolves a scope that is neither `NN` nor `NN-MM` with the exact resolver the refine/continue door uses (`resolveItemExact`). A
backlog row is promoted through the registered `work:promote` (appended), and the loop runs at
`created.ref`. The declaration records the slug as `promotedFrom`. A dry run reports `wouldPromote`
and writes nothing. `--stop`, `--hand-off` and `--resume` refuse a backlog slug. A promote refusal
is the loop's refusal.

## Tasks

- [x] 00 [a backlog slug is promoted, then looped at its number](tasks/00_a-backlog-slug-is-promoted-then-looped-at-its-number.feature)
- [x] 01 [the read-only doors never promote](tasks/01_the-read-only-doors-never-promote.feature)

## Notes

- The engine's scope grammar is NOT widened: `decideLoopScope` still admits `NN` and `NN-MM`. The
  resolution happens in the shell, before it (ADR-001 §1).
- `promotedFrom` is appended to `buildLoopDeclaration` and `recoverableDeclaration` with a `null`
  default. The mesh assignment directive and the trigger declaration build declarations too, and must
  keep producing usable ones without passing it (ADR-005).
- FF-14301 lands here. Red-probe it (add an import of `promote.mjs` to the loop shell) and record the
  probe in the milestone `VERIFICATION.md`.
