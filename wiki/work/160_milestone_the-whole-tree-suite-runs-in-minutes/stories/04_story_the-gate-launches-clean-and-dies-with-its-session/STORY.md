---
type: story
number: 04
slug: the-gate-launches-clean-and-dies-with-its-session
title: "The gate launches clean and dies with its session — no inherited GIT, CLAUDE or AOF variables, and no orphaned suite after a stop"
parent: 160
status: done
owner: product-owner
created: 2026-10-14
updated: 2026-10-15
schema: 1
aofVersion: 0.1.0
depends: []
reads: [wiki/work/160_milestone_the-whole-tree-suite-runs-in-minutes/ARCHITECTURE.md#adr-005-the-gate-launches-clean-and-dies-with-its-session, packages/work/src/commands/regression-gate.mjs, packages/work/src/regression-record.mjs, packages/work/src/testing/toolchain.mjs, packages/execution/src/bounded-process.mjs, packages/execution/src/runs.mjs, packages/core/src/application/bindings/commands/regression-gate.mjs, packages/core/src/application/assemble.mjs, scripts/test-sharded.mjs, scripts/test-sharded-report.mjs, scripts/test-shard.mjs, test/run/regression-gate.test.mjs, test/support/regression-gate-fixture.mjs, test/testing/test-sharded-report.test.mjs, test/arch/grade/acd-gate-result-is-evidence.test.mjs, wiki/work/159_milestone_operator-auto-memory-source/VERIFICATION.md]
files: [packages/work/src/commands/regression-gate.mjs, packages/core/src/application/bindings/commands/regression-gate.mjs, packages/core/src/application/assemble.mjs, scripts/test-sharded.mjs, scripts/test-sharded-pool.mjs, test/run/regression-gate.test.mjs, test/support/regression-gate-fixture.mjs, test/testing/test-sharded-report.test.mjs, test/arch/grade/acd-gate-result-is-evidence.test.mjs]
---
# 04 · The gate launches clean and dies with its session

## User story

As the operator signing a milestone off from a driven session,
I want the gate's suite to start in an environment free of my session's variables, and to stop
when the loop stops the session that launched it,
so that a red row means the code, never my terminal, and a stopped loop leaves no suite running
behind it.

## Tasks

- [x] `tasks/00_the-gate-launches-its-suite-clean.feature`: R1, the denied variables, case-insensitively, with the global home kept.
- [x] `tasks/01_the-suite-dies-with-its-session.feature`: R2, the runner's pool stops when its stdin ends, and the gate stops when its run stops, with no row written.

## Notes

ADR-005 is the decision. Evidence: m159/F-2 (a clone-credential case went red from an inherited VS
Code `GIT_ASKPASS`), and the orphaned gate after a stopped loop. `runBounded` kills its direct child
only, so the runner has to own its pool's lifetime.

The pool moves out of the sharded runner into `scripts/test-sharded-pool.mjs`, so it can be
driven with fake units and no registry. The runner keeps planning and reporting. Story 05 depends
on this one: it builds the budget and the not-finished verdict on the same pool and the same gate
launch.

The gate reads its run through the run store the core binding injects. It reads no loop stop
request itself, because the run record is the one fact (ADR-005 §3).
