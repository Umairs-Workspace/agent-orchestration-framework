# 160/08 · Tests spend git only on what they assert — build plan

## Mechanism

**The merge.** The model already performs `merge --ff-only`. It has a `mergeBase`, a commit store
of file maps, and a refusal path for local changes. `--no-ff` is a three-way merge of three file
maps (base, ours, theirs): a path changed on one side takes that side. A path changed on both
sides throws as unmodelled (ADR-009 §1), even when git would merge it cleanly line by line, so
such a case stays on real git, as the repair-on-conflict cases did in 160/01. On success it writes
a commit with two parents, moves the branch and rewrites the primary's files. Copy git's stdout and status for each shape from real git, row by
row in FF-16002's parity script, before you implement it.

**The re-sort.** Repeat 160/01's empirical pass: a temporary switch runs every real-git case of
the six loop suites on the model. Keep the moved list in FF-16002 as the record. Re-check each
`git: "fake"` by line ownership; 160/01's slicer once swallowed a neighbour's call.

**The template.** `cli-spawn.mjs` already caches a per-process fixture (`bundleFixtureRoot`). Add
a template repository beside it: `init -b main` plus the fixture identity, once per process,
resolved with `realpath` (the macOS tmpdir trap the dispatch fixture documents). A fixture copies
the template's `.git` into its fresh root, then writes, adds and commits as before. Each fixture's
own `init` and `config` calls go.

## Verification step

Run FF-16002's parity suite and the six loop suites through `node scripts/test-shard.mjs` with the
spawn-counting preload, before and after; then `work-dispatch-lanes`,
`gate-propagation-refusals-leave-branch` and `blocked-run-parking` the same way. The `@manual` rows
want wall time and git counts per suite. A case that passes on the model only because a verb answered
by default would show as a parity gap. The model throws on an unknown argv, so read the error, not
the exit code.

## Out of scope

- Conflict markers and `merge --abort` in the model.
- `work-dispatch-lanes`' own cases on the model (its header: their subject is git).
- The loop's own call counts (FF-16001's ceiling is unchanged).
