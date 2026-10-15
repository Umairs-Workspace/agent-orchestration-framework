---
type: story
number: 05
slug: the-runner-enforces-the-budget-and-a-timeout-is-not-finished
title: "The runner enforces the budget, and a timeout is not-finished — the gate fails a run that outlives 10 minutes, and never calls a killed unit a red"
parent: 160
status: in-review
owner: product-owner
created: 2026-10-14
updated: 2026-10-15
schema: 1
aofVersion: 0.1.0
depends: [02, 04]
reads: [wiki/work/160_milestone_the-whole-tree-suite-runs-in-minutes/ARCHITECTURE.md#adr-006-the-runner-enforces-the-budget-and-a-timeout-is-not-finished, wiki/work/160_milestone_the-whole-tree-suite-runs-in-minutes/ARCHITECTURE.md#adr-005-the-gate-launches-clean-and-dies-with-its-session, packages/work/src/testing/toolchain.mjs, packages/work/src/commands/regression-gate.mjs, packages/work/src/regression-record.mjs, packages/work/src/commands/item-status.mjs, packages/work/src/grade.mjs, scripts/test-sharded.mjs, scripts/test-sharded-pool.mjs, scripts/test-sharded-report.mjs, .aof/aof.config.json, packages/core/assets/commands/verify.md, test/run/regression-gate.test.mjs, test/testing/test-sharded-report.test.mjs, test/arch/grade/acd-gate-result-is-evidence.test.mjs, test/work/work-toolchain-declaration.test.mjs, packages/work/test/testing.test.mjs, packages/work/test/status-gate.test.mjs, wiki/work/144_story_the-whole-tree-run-signs-off-in-minutes/tasks/02_the-run-says-where-its-time-went-and-measures-itself-against-the-budget.feature]
files: [packages/work/src/testing/toolchain.mjs, packages/work/src/commands/regression-gate.mjs, packages/work/src/regression-record.mjs, packages/work/src/commands/item-status.mjs, scripts/test-sharded.mjs, scripts/test-sharded-pool.mjs, scripts/test-sharded-report.mjs, .aof/aof.config.json, packages/core/assets/commands/verify.md, .claude/commands/aof/verify.md, .agents/skills/aof-verify/SKILL.md, .agents/skills/aof-verify/agents/openai.yaml, .agents/skills/aof-verify/procedure.md, .codex/aof/workflows/workflow-contract.md, .opencode/commands/aof/verify.md, packages/core/assets/manifest.json, test/run/regression-gate.test.mjs, test/testing/test-sharded-report.test.mjs, test/arch/grade/acd-gate-result-is-evidence.test.mjs, test/work/work-toolchain-declaration.test.mjs, packages/work/test/testing.test.mjs, packages/work/test/status-gate.test.mjs]
---
# 05 · The runner enforces the budget, and a timeout is not-finished

## User story

As the operator closing a milestone,
I want the whole-tree run to be held to its 10-minute budget, and a unit that runs out of time
reported as not finished rather than failed,
so that a slow suite is visible the day it slows, and a verify never spends a round repairing code
that only ran out of time.

## Tasks

- [x] `tasks/00_a-unit-out-of-time-is-not-finished.feature`: R1, the not-finished report, no retry, the row's precedence and the word's one home.
- [x] `tasks/01_the-sharded-gate-is-held-to-its-budget.feature`: R2 and R3, the budget reaches the program, the stop at the budget, the door's refusal, and the serial path.

## Notes

The operator answered both business questions on 2026-10-14. Q1: stop at the budget. Q2: a serial
run still signs off. ADR-006 is the decision. It supersedes 144's "an overrun is logged and never turns the row red".
144's delivered `.feature` is not edited. The 144 cases that pin the old behaviour change here,
because tests are code.

Evidence: 159's close took eight gate runs, six of them red for the runner's reasons (m159/F-2,
m156/F-4, m127/F-30). An integration lane killed at its 20-minute unit limit read as a red, and the
two-hour deadline cut a run off with no verdict at all.

`budgetMinutes` falls from 15 to 10, the SPEC's objective. A loop lane's reconcile resets `.aof/`,
so commit the config change by hand on the lane branch. The verify prose changes, so regenerate
the bundle manifest in the same change; a stale manifest went red at 159's gate.

The budget itself is met or missed at the milestone's own gate, after stories 00–03 land. This
story makes the runner enforce it. It does not make the suite fast.
