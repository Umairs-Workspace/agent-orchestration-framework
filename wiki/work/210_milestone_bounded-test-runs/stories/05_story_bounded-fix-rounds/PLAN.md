# 210/05 · Bounded fix rounds — build plan

## Mechanism

Replace 04's placeholder `--failed` branch. The **root** is `record.findLatestRed({ worktree })`.
Walk `parent` links back from it to get the chain and its failure sets. If the newest record in the
chain is latched (`stopped`), refuse as `test-fix-stopped` now. The **selection** is the suites
holding the newest record's failures (any `file: null` → `test-failed-unattributed`), plus the
scan's answer for `git diff --name-only <root key> <current key>`. Both keys are tree ids, so this
is one bounded git call. Run it through the shared back half with `mode: "failed"`,
`parent: root.id` and `round: root.round + 1`.

**The stop rules** run after the round's failures are known and labelled. They compare the
non-pre-existing set with the parent's. The no-progress count is read from
`buildNoProgressRoundsFromConfig` and never restated. A suite failing now that failed in no record
of the chain fires at once. A firing writes `stopped` on the round's own record (the record leaf is
the one writer), and the summary becomes the hand-over text. A stopped chain is never
re-opened (210/05 Q1). Only a newer red, from a named run, gives `--failed` a new root.

**The baseline** is `baseline.mjs`:

- resolve the base: the item from the `storyWork()` seam or the gate record, and
  `git log --diff-filter=A -1 --format=%H -- <record doc>`;
- ensure a detached worktree at `<common dir>/aof/baselines/<sha>`;
- run `work.worktree.prepare` there through the mesh worktree seam, so its environment handling is
  shared with dispatch lanes;
- call the same `runTest` with `projectRoot` set to the baseline and the failing suites named.

That makes the baseline's result an ordinary record keyed to the base tree, answered from on the
next round. Label each failure `preExisting: true|false|"unmeasured"` by `(file, case)`. Prune
baselines to the newest two.

Every red summary ends with `aof test --failed`: one line in the shared renderer.

## Verification step

In a temporary repository with an injected runner:

- a red named run, then a fix touching a module a second suite imports: `--failed` runs exactly
  those two suites;
- three rounds with equal failure counts: the third round's record is latched, and the fourth
  call refuses;
- a planted case that fails at the base commit too: labelled, excluded from the count, shown
  apart;
- make prepare fail: every failure is `unmeasured`.

Then once for real here: break a fixture, run a named run, fix it, and run `aof test --failed`.

## Out of scope

The prose that tells agents what to do on `test-fix-stopped` (00). The gate's run cap (03).
