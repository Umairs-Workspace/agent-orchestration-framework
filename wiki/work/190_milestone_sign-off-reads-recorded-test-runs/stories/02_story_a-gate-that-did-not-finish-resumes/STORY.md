---
type: story
number: 02
slug: a-gate-that-did-not-finish-resumes
title: "A regression gate that did not finish resumes where it stopped, and every finished gate run is a test record"
parent: 190
depends: ["190/00"]
status: done
owner: product-owner
created: 2026-11-09
updated: 2026-11-10
adrs: [ADR-005]
reads:
  - wiki/work/190_milestone_sign-off-reads-recorded-test-runs/SPEC.md
  - wiki/work/190_milestone_sign-off-reads-recorded-test-runs/ARCHITECTURE.md#ADR-001
  - wiki/work/190_milestone_sign-off-reads-recorded-test-runs/ARCHITECTURE.md#ADR-005
  - wiki/work/archive/96_milestone_the-declaration-earns-its-keep/ARCHITECTURE.md#ADR-008
  - wiki/work/160_milestone_the-whole-tree-suite-runs-in-minutes/ARCHITECTURE.md#ADR-006
  - packages/work/src/testing/record.mjs
  - packages/work/src/regression-record.mjs
  - packages/work/src/commands/item-status.mjs
  - packages/work/src/testing/toolchain.mjs
  - scripts/test-sharded-pool.mjs
  - scripts/test-sharded-report.mjs
  - packages/work/test/status-gate.test.mjs
files:
  - packages/work/src/commands/regression-gate.mjs
  - packages/core/src/application/bindings/commands/regression-gate.mjs
  - scripts/test-sharded.mjs
  - test/run/regression-gate.test.mjs
  - test/support/regression-gate-fixture.mjs
  - test/testing/test-sharded-report.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 190/02 · A regression gate that did not finish resumes where it stopped, and every finished gate run is a test record

## User story

As **an operator whose milestone gate was stopped at its budget, or lost a unit to a timeout**,
I want **`aof work regression-gate <NN> --resume` to run only the units that did not finish, on the
same content, and to record one row for the whole**,
so that **a gate that ran nine-tenths of the tree is not paid for twice, and a UAT session's sweep
on unchanged content is answered by the gate's run instead of by another whole-tree run**.

What lands (ADR-005):
- `--resume` and its two refusals;
- the stored sharded report of a `not-finished` run;
- `scripts/test-sharded.mjs` planning only named files;
- the combined row;
- the gate writing an ADR-001 record through 190/00's writer.

The accept door is unchanged.

## Tasks

- [x] 00 [a gate that did not finish resumes on the same content](tasks/00_a-gate-that-did-not-finish-resumes-on-the-same-content.feature)
- [x] 01 [a finished gate run answers a later whole-tree question](tasks/01_a-finished-gate-run-answers-a-later-whole-tree-question.feature)

## Notes

- `packages/work/src/testing/record.mjs` is a forward reference to 190/00's `files:`. That is why
  this story `depends:` on 00.
- Resume is local. The `gate.yml` runner's git dir does not survive the job, so a CI gate run that
  does not finish is re-run there, as today.
- `regression-record.mjs` is read, not written: the row's shape is unchanged, and the resume is
  told apart only by its `detail` text.
