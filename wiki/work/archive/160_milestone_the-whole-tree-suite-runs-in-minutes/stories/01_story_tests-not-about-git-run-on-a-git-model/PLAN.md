# 160/01 · Tests that are not about git run on a git model — build plan

## Mechanism

The loop never spawns git itself. It calls `ctx.exec(args, { cwd })`, and `laneCtx` in the lane
fixture is where that port is filled. The model is one object per fixture repository. It holds
commits (each one a map of path to bytes, captured from disk at `commit`), branches, a HEAD per
worktree and the worktree registry. Its `exec` parses the argv the loop actually sends and answers
with the same `{ stdout, stderr, status }` envelope `defaultGitExec` returns.

Filesystem effects are real and in-process: `worktree add` writes the commit's files into the lane
directory, `worktree remove` deletes it, and `status --porcelain` diffs the directory against the
HEAD snapshot. `check-ignore` reads the fixture's `.gitignore` with the small pattern subset the
fixture uses, and refuses any other pattern loudly.

`withLaneRepo({ git: "fake" })` writes the stream exactly as it does today, then seeds the model
from disk. No `.git` directory is made. That is deliberate: a case that reaches git outside the
port then fails at once, which is how a misclassified case shows itself.

Work out which verbs to model by running story 00's profiler over the moved suites on real git.
That count is the verb list, and every verb on it gets a parity row.

## Verification step

The parity control runs one script of operations (init, commit, branch, worktree add, write a
file, status, add, commit, merge-base, merge --ff-only, worktree remove) against real git in a temp
directory and against the model. After each step it compares both the answers and the directory
contents. Then run each moved file through the shard entry, and record its alone wall time before
and after in VERIFICATION.

A model that drifts from git shows up as a parity row going red. A case that silently changed its
claim shows up as a case whose name or assertion differs in the diff: review the diff for that.

## Out of scope

- Dispatch-lane, gate-propagation and mesh-worker suites: git is their subject.
- Tests reaching git through doctor or validate: another seam (ADR-002 §3).
- A general-purpose git emulator: model only what the profile shows the loop calls.
