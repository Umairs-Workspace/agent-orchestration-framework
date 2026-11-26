---
type: story
number: 05
slug: bounded-fix-rounds
title: "A fix round reruns what failed and what the fix touched, skips pre-existing reds, and stops when it stops converging"
parent: 210
depends: [04, 03]
status: not-started
owner: product-owner
created: 2026-11-26
updated: 2026-11-26
schema: 1
aofVersion: 0.1.0
adrs: [ADR-004, ADR-005, ADR-006]
reads: [wiki/work/210_milestone_bounded-test-runs/ARCHITECTURE.md#ADR-004, wiki/work/210_milestone_bounded-test-runs/ARCHITECTURE.md#ADR-005, wiki/work/210_milestone_bounded-test-runs/ARCHITECTURE.md#ADR-006, packages/work/src/testing/importers.mjs, packages/work/src/testing/record.mjs, packages/work/src/testing/changed.mjs, packages/work/src/testing/toolchain.mjs, packages/contracts/src/loop-bounds.mjs, packages/mesh/src/worktrees.mjs, packages/work/src/commands/regression-gate.mjs, packages/core/src/application/assemble.mjs]
files: [packages/work/src/commands/test.mjs, packages/work/src/testing/baseline.mjs, packages/work/package.json, scripts/workspace-runtime-audit.json, packages/core/src/application/bindings/commands/test.mjs, test/testing/test-fix-rounds.test.mjs, test/testing/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs]
---
# 05 · A fix round reruns what failed and what the fix touched, skips pre-existing reds, and stops when it stops converging

## User story

As an agent fixing red suites,
I want `aof test --failed` to rerun the suites that failed plus every suite my fix can reach, to
set aside reds that fail on the work's base as well, and to stop me when my rounds stop shrinking
the failures,
so that I learn both "did I fix it?" and "did my fix break a neighbour?" without a whole-tree run,
and a loop that is going nowhere hands over instead of grinding.

## Tasks

- [ ] [fix-round selection](tasks/00_fix-round-selection.feature)
- [ ] [the no-progress stop](tasks/01_no-progress-stop.feature)
- [ ] [pre-existing reds](tasks/02_pre-existing-reds.feature)

## Notes

Composes story 01's scan and story 02's record on story 04's face. It depends on 03 so a gate
record's failures already carry their suite when a round starts from one. The baseline worktree
reuses the project's `work.worktree.prepare` step through the mesh worktree seam, and the
`packages/work/src/testing` budget rises by one for `baseline.mjs`.
