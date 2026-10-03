---
type: story
number: 01
slug: a-whole-item-refine-in-one-drive
title: "A whole-item refine in one drive — work.loop.refine / --refine whole-item makes the break-down drive /aof:refine --autonomous"
parent: 143
status: in-review
owner: product-owner
created: 2026-10-02
updated: 2026-10-03
schema: 1
aofVersion: 0.1.0
adrs: [ADR-002]
reads:
  - wiki/work/143_milestone_the-loop-starts-from-the-backlog-on-chosen-models/SPEC.md
  - wiki/work/143_milestone_the-loop-starts-from-the-backlog-on-chosen-models/ARCHITECTURE.md#ADR-002
  - wiki/work/143_milestone_the-loop-starts-from-the-backlog-on-chosen-models/ARCHITECTURE.md#ADR-005
  - packages/core/assets/commands/refine.md
  - packages/core/src/application/bindings/commands/loop.mjs
  - packages/core/src/application/bindings/commands/drive.mjs
  - packages/core/src/application/bindings/loop/child-drive.mjs
  - packages/work-loop/src/wave.mjs
  - packages/work-graph/src/registry.mjs
  - packages/core/src/application/bindings/work-audit/declared-bounds.mjs
  - packages/mesh/src/assignment-directive.mjs
  - packages/work-loop/src/trigger/declaration.mjs
  - packages/work-loop/test/work-loop-determinism.suite.mjs
  - test/arch/loop/acd-loop-concurrency-single-home.test.mjs
  - test/arch/command/acd-prompt-bounds-name-their-home.test.mjs
  - test/loop/work-loops-resolved-ceilings.test.mjs
files:
  - docs/acd.md
  - packages/contracts/src/loop-bounds.mjs
  - packages/work-loop/src/child-drive.mjs
  - packages/work-loop/src/commands/drive.mjs
  - packages/work-loop/src/commands/loop.mjs
  - packages/work-loop/src/cycle.mjs
  - packages/work-loop/src/engine.mjs
  - packages/work-loop/test/support/work-loop-story-fixtures.mjs
  - test/arch/loop/acd-cap-exhaustion-returns-to-the-plan.test.mjs
  - test/arch/loop/acd-clock-counts-attempts.test.mjs
  - test/arch/loop/acd-declaration-predicate-is-composed.test.mjs
  - test/arch/loop/acd-loop-concurrency-single-home.test.mjs
  - test/arch/loop/acd-loop-l1-read-only.test.mjs
  - test/arch/loop/acd-loop-narrates-in-flight.test.mjs
  - test/arch/loop/acd-loop-probe-contract.test.mjs
  - test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs
  - test/arch/loop/acd-loop-stop-request-single-home.test.mjs
  - test/fixtures/application/command-inventory.json
  - test/loop/drive-command-phase-drivers.test.mjs
  - test/loop/index.mjs
  - test/loop/loop-bounds.test.mjs
  - test/loop/loop-command-board-state.test.mjs
  - test/loop/loop-command-probe.test.mjs
  - test/loop/loop-command-refusals.test.mjs
  - test/loop/loop-command-resume.test.mjs
  - test/loop/loop-command-stops.test.mjs
  - test/loop/loop-command-wave.test.mjs
  - test/loop/loop-driven-row-carries-the-grade.test.mjs
  - test/loop/loop-record-reaches-the-redrive.test.mjs
  - test/loop/loop-resumed-redrive-declares-its-grade.test.mjs
  - test/loop/work-loop-declaration.test.mjs
  - test/loop/work-loop-declarations.test.mjs
  - test/loop/work-loop-phase-map.test.mjs
---
# 01 · A whole-item refine in one drive

## User story

As **the operator who has stopped reviewing refines story by story**,
I want **the loop to break a milestone down and author every story's contract in one refine
session**,
so that **a milestone is refined in one session, which already holds the whole item and its ADRs,
instead of one cold drive per story**.

What lands: `work.loop.refine` (`per-story` default, or `whole-item`) in the loop's bounds leaf, and
`aof work loop --refine` to override it per run. The resolved value is recorded on the declaration
as `refine` and inherited on resume. Under `whole-item`, the drive the engine decides for a milestone
with no stories carries `autonomous: true`. The drive composes `/aof:refine <ref> --solo --autonomous`,
and `--autonomous` crosses both drive seams. `aof work drive refine <ref> --autonomous` is its CLI door.

## Tasks

- [x] 00 [the refine scope has one home and one flag](tasks/00_the-refine-scope-has-one-home-and-one-flag.feature)
- [x] 01 [the break-down drive carries --autonomous](tasks/01_the-break-down-drive-carries-autonomous.feature)

## Notes

- `per-story` must leave every decision and every composed prompt byte-identical to today's: the
  determinism suite and the phase map are the proof.
- The refine prompt (`packages/core/assets/commands/refine.md`) already implements `--autonomous`.
  This story does not edit it.
- FF-14302 lands here. Red-probe it (spell `"whole-item"` in `cycle.mjs`) and record the probe in
  the milestone `VERIFICATION.md`.
