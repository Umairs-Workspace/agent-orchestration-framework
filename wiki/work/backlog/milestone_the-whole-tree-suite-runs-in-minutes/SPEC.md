---
type: milestone
number:
slug: the-whole-tree-suite-runs-in-minutes
title: "The whole-tree suite signs off in minutes — a time budget the runner enforces, and a timeout is never a red"
status: not-started
owner: product-owner
created: 2026-10-14
updated: 2026-10-14
schema: 1
aofVersion: 0.1.0
---
# The whole-tree suite signs off in minutes

## Objective

**The whole-tree gate signs off well inside a time budget the runner itself enforces — under 10
minutes on the Windows control node — and a unit that runs out of time is reported as not finished,
never as a failure.** Today the sharded gate takes ~48 min there (~41,700 s of test time over 1,178
files on 16 workers), and m159's close took eight gate runs over three days, six of them red for
reasons that were the runner's, not the code's (m159/F-2, m156/F-4, m127/F-30).

An outsider can verify it: `aof work regression-gate <NN>` on that node records a green row under
the budget, the runner fails the run when the budget is exceeded, and a unit killed at its deadline
appears as `not-finished` in the row rather than among its failures.

Measured causes (2026-10-13/14, evidence in m159's `VERIFICATION.md`):
- **Git spawns in the loop's plumbing.** `loop-command-wave` made 7,588 git calls in 51 cases — 82%
  of its wall time at ~40 ms per spawn. Most are repeats: doctor 422 runs, `worktree list` 461,
  `advanceBranchToBase` 4 calls on an already-current lane, 5 calls per commit.
- **Loading `scripts/test.mjs` takes ~15 s**, because it imports all 1,177 suite files; every focused
  `--only` run and every story lane pays it before running anything.
- **Importing the application takes ~2.8 s per child process**, so a test that spawns aof pays it
  each time.
- **A unit timeout is recorded as a red**, which verify then treats as code to repair.
- **The gate inherits the session's launch environment** (`GIT_ASKPASS`, `CLAUDE_*`, `AOF_RUN_*`).
- **A stopped loop leaves its gate running** as an orphan process tree.

## Scope

In scope:
- **The loop's git reads made once per step** — fewer git spawns per lane cycle, which also speeds the
  real loop, not only its tests.
- **An `exec`-port fake for tests that are not about git**, keeping real git for the tests whose
  subject is git behaviour (merge-home, worktree reuse, dirty refusal, residue refusal).
- **A focused run loads only the suites it selects.**
- **A cheaper application import for child processes.**
- **The runner enforces the budget and reports a timed-out unit as not-finished.**
- **The gate launches its suite in a clean environment.**
- **Stopping a loop stops the gate its session launched.**

Out of scope:
- **Replacing the git CLI with an in-process engine** (libgit2 bindings, isomorphic-git) — a native
  dependency and a change to every call site; reconsidered only if this milestone's budget is missed.
- **Reaping a halted loop's lane worktree and branch** — the backlog story `a-halted-lane-is-reaped`.
- **Deduplicating flaky tests one by one** — a flake that survives the budget work is fixed in the
  item that owns it.

## Stories

To be broken down by `aof:refine`.

## Dependencies

- **144** (done) — the sharded gate this milestone makes fit its budget.
- **Already landed on the 156–159 branch:** the integration lane runs per feature (`ae1495a6`,
  ~25 → ~3 min wall) and doctor reads concurrently with a per-HEAD history memo (`79b926b7`,
  7.7 → 4.7 s per CLI call). The remaining budget is measured from those.
