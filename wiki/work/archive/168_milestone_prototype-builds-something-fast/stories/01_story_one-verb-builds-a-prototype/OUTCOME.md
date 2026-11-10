# 01 · One verb builds a prototype — Outcome

## Delivered

### `aof work prototype` carries the four moves
`aof work prototype "<ask>"` mints the next stream number through `runInsertTopLevel`'s append form and writes `PROTOTYPE.md` (Intent and first Want from the ask) and `STATE.md` at `active`. `<ref> ["<new ask>"]` appends a dated Want and logs it, and reopens a `paused`, `done` or `abandoned` prototype. `--stop`, `--done` and `--abandon` copy the hand-off into `## Log` under a dated line and set `paused`, `done` or `abandoned`. `--log` appends one line.

### The verb refuses what it cannot write faithfully
Two moves in one call, or a new ask beside a move flag, are refused as `prototype-one-move`. A stop or complete over the template's unfilled hand-off is refused as `prototype-handoff-missing`, and a ref that is not a prototype as `prototype-not-a-prototype`. The verb never commits, mints no run record and imports no git, dispatch, worktree or lane module (FF-16804).

### `/aof:prototype` builds in the operator's own session
The bundle command (and its codex `workflow.md` section) calls the verb for every move. It spawns no agent, makes no branch, worktree, review lane or commit, keeps `## Shortcuts` current, and when the checkout is on `main` says so once and then builds. It ships to every runtime `add-chore` ships to, through `aof work update`.

### Explain names a prototype by its intent
`aof:explain` describes a prototype from its `## Intent`.

## Assumptions

- **The operator commits** — the verb writes only the two records and the build's code changes stay uncommitted on the current branch until the operator commits them.
