---
type: story
number: 13
slug: the-whole-tree-runs-on-every-pull-request
title: "The whole tree runs on every pull request — sharded across Linux runners, inside its budget, with each file's drift against main"
parent: 160
status: in-progress
owner: product-owner
created: 2026-10-17
updated: 2026-10-17
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/160_milestone_the-whole-tree-suite-runs-in-minutes/ARCHITECTURE.md#adr-014-the-whole-tree-runs-on-every-pull-request-sharded-across-runners-inside-the-budget, wiki/work/160_milestone_the-whole-tree-suite-runs-in-minutes/ARCHITECTURE.md#adr-006-the-runner-enforces-the-budget-and-a-timeout-is-not-finished, scripts/test-sharded-pool.mjs, .github/workflows/pages.yml, scripts/prepare-worktree.mjs]
files: [scripts/test-sharded.mjs, scripts/test-harness.mjs, scripts/test-ci-summary.mjs, .github/workflows/test.yml, .aof/aof.config.json, scripts/workspace-runtime-audit.json, test/testing/test-sharded-report.test.mjs, test/arch/loop/acd-loop-suite-registration.test.mjs, test/bundle/site-build.test.mjs, test/run/regression-gate.test.mjs]
---
# 13 · The whole tree runs on every pull request

## User story

As the operator merging work into `main`,
I want every pull request to run the whole tree on GitHub's Linux runners, split across parallel jobs,
fail when the suite passes its 10-minute budget, and show each file that got slower or faster than on
`main`,
so that the budget is measured where every PR waits on it, on a machine that is the same each run,
instead of on a control node whose own load moved the wall time by as much as the budget.

## Tasks

- [ ] `tasks/00_the-runner-takes-one-shard.feature` — a job runs one balanced shard of the plan and reports it in JSON
- [ ] `tasks/01_the-ci-summary-judges-the-shards.feature` — the summary fails a red shard, a lost case or a suite over budget, and reports drift
- [ ] `tasks/02_the-pull-request-suite-is-wired.feature` — the workflow runs shards then summary on every PR, and the control node keeps no budget

## Notes

- Decided by the operator 2026-10-17: Linux runners only; the budget is the PR suite's CI wall time;
  drift is reported, and only the budget fails a run. The control-node gate keeps no budget.
