
# 160/01 · Tests that are not about git run on a git model — Outcome

## Delivered

### A git model stands behind the loop's port in tests
`test/support/loop/git-fake.mjs` models the 16 verbs the loop sends through its port. It refuses any verb or form it does not model, so a case can never pass on an answer the model invented.

### The model is held to real git
FF-16002 runs one 49-step script against real git and against the model, and compares stdout, status and directory bytes after every step.

### Loop suites run their non-git cases on the model
31 case sites in `loop-command-wave`, `loop-command-reconcile` and `loop-command-stops` run with `git: "fake"`. Cases whose subject is git (a real merge home, a conflict repair, a test-side `git log` or `merge-base`) stay on real git. Alone, the three suites run 18–31% faster with about half the git calls.

### The dispatch command takes the caller's exec
`packages/work-loop/src/commands/dispatch.mjs` threads `ctx.exec` through admission, list, sweep and cleanup. Production leaves `ctx.exec` unset, so the CLI is unchanged.

## Gaps

### `worktree list` never reports a prunable lane
- **Status:** open-by-decision
- **Discharge condition:** a case whose subject is a lane directory removed under git moves onto the model.
The model's `worktree list --porcelain` never prints git's `prunable` line for a lane whose directory is gone.
