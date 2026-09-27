---
type: story
number:
slug: tree-checks-survive-a-squash-merge
title: "The tree's own checks survive a squash merge — an archived item's reads resolve through the archive rule, and the intake test pins placement, not the adding commit"
status: not-started
owner: product-owner
created: 2026-09-27
updated: 2026-09-27
schema: 1
aofVersion: 0.1.0
---
# The tree's own checks survive a squash merge

## User story

As **the operator merging work into `main` through squash-only PRs**,
I want **the checks that read the tree's own history to rely on what the tree and the archive rule
guarantee, not on per-commit history that a squash erases**. The checks are validate's `reads:`
path check and the tree-state suite's intake-key case,
so that **a whole-tree gate on `main` is green whenever the tree is right. An item archived in the
same PR that created it then no longer reds validate forever. Nobody learns to wave a red gate
through as "known squash noise", which is how a real red would slip past.**

## Tasks

## Notes

- **Source:** 139/F-139-03, measured 2026-09-27 on `origin/main` `c7741a5`. `main` has been
  squash-merge only since 2026-09-27, so every PR from now on hits both halves below.
- **Archived `reads:`.** Five citations dangle today: 127/05 citing 127/03's task 01 feature,
  129/05 and 129/07 citing 129's `VERIFICATION.md`, and 132 and 137 each citing their own
  `PLAN.md`. Each item was created and archived inside one squash (PR #1, `28bbce2`). The squash
  commit therefore records an ADD at the archive path, and no rename.
  - `resolveCitedPath` (`src/cited-path-resolve.mjs`) follows git's renames and then
    `.aof/rename-ledger.tsv`, and neither holds these five.
  - The archive verb's own invariant (127: a move with the name kept, under `archive/`) is enough to
    answer them. A missing `<work.dir>/<item>/…` resolves when `<work.dir>/archive/<item>/…` exists.
  - The ledger is "derived once, never hand-edited", so appending to it is not the fix.
- **Side effect of the same rule.** An archive move is red until it is committed. `aof work archive
  131`, uncommitted, gave 29 `reads:` findings until git held a rename. The archive rule answers
  those with no commit.
- **The intake-key case** (127/05 task 00, `test/work/stream/work-this-tree-holds-what-is-live.test.mjs`).
  Its pickaxe finds the first commit that adds `"intake": "backlog"`, which is now the PR #1 squash
  `28bbce2`. The "exactly one added line" leg is therefore red for good. The placement legs (the key
  sits between `work.dir` and `work.agents`, indented like its neighbours) still hold. 127/05's
  `.feature` is delivered and stays untouched; the test is code. Refine decides whether to re-home
  the history leg (e.g. onto `.git-archive` where present) or drop it with a recorded reason.
- **Out of scope:** 131 still at the root of `wiki/work`. That is the operator's
  `aof work archive 131`, a one-off rather than a class.
