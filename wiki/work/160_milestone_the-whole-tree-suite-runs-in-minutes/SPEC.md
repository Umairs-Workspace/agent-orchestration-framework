---
type: milestone
number: 160
slug: the-whole-tree-suite-runs-in-minutes
title: "The whole-tree suite signs off in minutes — a time budget the runner enforces, and a timeout is never a red"
status: in-progress
owner: product-owner
created: 2026-10-14
updated: 2026-10-15
schema: 1
aofVersion: 0.1.0
---
# 160 · The whole-tree suite signs off in minutes

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

- [x] [00 · The loop reads each git fact once per step](stories/00_story_the-loop-reads-each-git-fact-once-per-step/STORY.md) (ADR-001)
- [x] [01 · Tests that are not about git run on a git model](stories/01_story_tests-not-about-git-run-on-a-git-model/STORY.md) (ADR-002; after 00, 06)
- [x] [02 · A focused run loads only what it names](stories/02_story_a-focused-run-loads-only-what-it-names/STORY.md) (ADR-003)
- [x] [03 · A child process compiles once and loads only its verb](stories/03_story_a-child-process-compiles-once-and-loads-its-verb/STORY.md) (ADR-004)
- [x] [04 · The gate launches clean and dies with its session](stories/04_story_the-gate-launches-clean-and-dies-with-its-session/STORY.md) (ADR-005)
- [x] [05 · The runner enforces the budget, and a timeout is not-finished](stories/05_story_the-runner-enforces-the-budget-and-a-timeout-is-not-finished/STORY.md) (ADR-006; after 02, 04)
- [x] [06 · Citation history is read only when a citation misses](stories/06_story_citation-history-is-read-only-when-a-citation-misses/STORY.md) (ADR-007)

- [x] [07 · A test's child aof runs from one bundle](stories/07_story_a-tests-child-aof-runs-from-one-bundle/STORY.md) (ADR-008)
- [x] [08 · Tests spend git only on what they assert](stories/08_story_tests-spend-git-only-on-what-they-assert/STORY.md) (ADR-009)
- [x] [09 · Small suite files share a unit](stories/09_story_small-suite-files-share-a-unit/STORY.md) (ADR-010; after 07)
- [x] [10 · The audits over this repository do their reading once](stories/10_story_the-audits-over-this-repository-read-once/STORY.md) (ADR-011)
- [x] [11 · A test that needs a suite run starts the shard entry](stories/11_story_a-test-that-needs-a-suite-run-starts-the-shard-entry/STORY.md) (ADR-012)

- [ ] [12 · Tests keep their state their own](stories/12_story_tests-keep-their-state-their-own/STORY.md) (ADR-013)

Waves, from the declared write sets: **00, 02, 03, 04 and 06** run first, all independent, then
**01 and 05**. Story 06 is not in the scope list above. Refine's profile found it: doctor's
history reads were 422 × 3 git spawns in one loop suite, and it serves the first scope bullet
("fewer git spawns per lane cycle").

**Round 2 (2026-10-15, F-02).** Verify measured the tree green at 19.2 min, so 160 stayed open for
the next levers. Each of stories 07–11 cuts one measured cost (ARCHITECTURE, "Round 2"). **07, 08,
10 and 11** run first, all independent. **09** follows 07, because both change the sharded
runner. A cheaper child start (07) is F-03's route.

## Dependencies

- **144** (done) — the sharded gate this milestone makes fit its budget.
- **Already landed on the 156–159 branch:** the integration lane runs per feature (`ae1495a6`,
  ~25 → ~3 min wall) and doctor reads concurrently with a per-HEAD history memo (`79b926b7`,
  7.7 → 4.7 s per CLI call). The remaining budget is measured from those.
