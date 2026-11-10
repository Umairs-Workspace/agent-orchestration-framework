# 160/00 · The loop reads each git fact once per step — build plan

## Mechanism

Every git call the loop makes goes through one port, `exec(args, { cwd })`, resolved by
`resolveExec` in the execution package's worktree module and carried as `ctx.exec`. Add
`memoGitReads(exec)` beside `resolveExec`: it returns a function of the same shape that keeps a
`Map` keyed by `cwd` and the joined argv for the six ref/topology verbs ADR-001 names, stores only
status-0 envelopes, and clears the whole map before forwarding any other verb. Find the verb by
skipping leading options, and the value of each `-c`.

The wave tick is the step. At the top of a tick, wrap the port once and hand the wrapped port to
everything the tick calls: lane resolution, settle, commit and merge-home. The core bindings already
pass `resolveExec` through to the loop, so the memo travels the same way. Do not add a parallel
service.

Then the two cuts. In `advanceBranchToBase`, compare the lane tip with `base` before anything else,
and return `already-current` when they are equal. In `commitOwnWrites`, take the new tip from the
commit itself rather than asking `rev-parse` again.

## Verification step

Run three `loop-command-wave` cases through the shard entry with a git-counting preload (refine's
profiler pattern: wrap `child_process` and call `syncBuiltinESMExports`), before and after the
change, with `AOF_GLOBAL_HOME` isolated. `rev-parse HEAD` should fall from 28 to a handful, and the
case outcomes must be identical. Record both counts in VERIFICATION. FF-16001's ceiling is the
"after" number.

A memo that serves a stale tip shows up as a merge-home case going red, or as a lane re-advancing a
branch it has already advanced. Either one means the clear-on-write rule has a hole.

## Out of scope

- A cache across ticks: the agent writes between steps, and nothing invalidates the cache then.
- Doctor's history reads: they use another seam and already have the per-HEAD memo (`79b926b7`).
- Moving tests onto a fake: that is story 01.

## Known traps

- `worktree list --porcelain` is forward-slashed on Windows. Compare keys on the argv as given,
  and never normalise the paths in a key.
