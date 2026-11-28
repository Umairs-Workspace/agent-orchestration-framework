# 210/05 · A fix round reruns what failed and what the fix touched, skips pre-existing reds, and stops when it stops converging — Outcome

## Delivered

### The fix round
`aof test --failed` roots on this worktree's newest red run (named, failed, all or gate) and reruns its failing suites plus every suite the importer scan reaches from the files changed since that run. Its record carries `parent` and `round`. It refuses with `test-failed-no-red` when there is no red to root on and `test-failed-unattributed` when the red's failures carry no suite. Every red summary ends with `aof test --failed`, except a round that latches its chain, which ends with the hand-over.

- **A round's reach is everything changed since its root** — a root red far behind the working tree, or another session's edits in the same checkout, widens the round.

### The no-progress stop
A fix chain latches `stopped` on its round's own record when its non-pre-existing failure set has not shrunk within `work.loop.buildNoProgressRounds` rounds (default 2), or when a fix makes new suites fail. A latched chain's next `--failed` is refused with `test-fix-stopped`, and a named run starts a fresh chain.

### Pre-existing labels
A red run reruns its failing suites on the work's base, which is the commit that added the running item's record doc, a gate red's milestone `SPEC.md`, or HEAD when the tree is dirty. The base tree is a detached, prepared worktree under `<git common dir>/aof/baselines`, added through the execution package's worktree implementation (newest two kept). Each failure is labelled `true`, `false` or `"unmeasured"`, shown apart, and kept out of the chain's failure set. The run stays red.

- **The base reruns with the working tree's test declaration less `work.test.instructions`** — a base that predates a declaration key other than the instructions file can still fail to answer, and is then labelled `"unmeasured"`.
- **The base tree is prepared with the project's `work.worktree.prepare` step** — on this repo that is `yarn install --immutable`, about 470 MB per base tree.

## Gaps

### Machine-hazard exclusions in a fix round
- **Status:** open
- **Discharge condition:** a project can declare suites a fix round must not select on this machine, and `--failed` honours it (210 F-05).
`--failed`'s reach can select `test/store/global-work-propagation.test.mjs`, which binds the live daemon's `:4182`; the instructions file says not to run it, and nothing tells the tool.
