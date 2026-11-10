# 150 · aof:explain says what a work item is for, without writing anything — Outcome

## Delivered

### `/aof:explain` answers what work items are for
`/aof:explain <ref…> [--verbose]` ships for Claude, Codex and OpenCode. For each ref, in the order given, it prints a three-to-five-sentence purpose read from the record (a story's user story, a milestone's objective, a spike's question, a chore's intent, a uat's scope). It marks backlog and archived items, reports a ref that matches nothing, lists the matches of an ambiguous one without explaining them, and reports an unwritten purpose as not written down. A milestone's short answer counts its stories. `--verbose` adds scope, stories or tasks, `depends:` edges and what is still open.

### Asking writes nothing
The command runs only `aof work find`, `doc`, `list` and `tasks` plus `Read`. It mints no run, moves no status, stamps no `updated:` and writes no file, and a live run leaves `git status` unchanged.

### `aof work find` resolves a folder path
`findWork` resolves a query holding `/` or `\` (that is not a pair or a span) as a folder path from the caller's directory, with a trailing record doc naming its folder. Only an exact item folder matches, so `wiki/work/backlog` answers `[]`. Every reader that resolves through `findWork` (`aof work doc`, `aof work tasks`, …) takes a path, and every form that resolved before answers as before.

## Assumptions

- **The session keeps to the prose** — the Claude renderer drops `allowed-tools` from every command, so in a live session read-only rests on the command's instructions, not on a tool list (VERIFICATION `F-150-01`).

## Gaps

### Explaining a spike, chore or uat known only to the cache
- **Status:** open
- **Discharge condition:** `aof work doc` serves `SPIKE`, `CHORE` and `SESSION`, and `explain` reads them through it.
`aof work doc` serves `SPEC` and `STORY` only, so `explain` reads the other three record docs with `Read` at the find row's `dir`. A row with `dir: null` cannot be explained.

### A path resolved for a caller with no shell
- **Status:** open
- **Discharge condition:** every non-CLI caller of `findWork` (board, API) passes `cwd` explicitly, or the path branch resolves against the workspace root.
`findWork`'s path branch defaults `cwd` to `process.cwd()`, so a daemon caller resolves a path against the daemon's directory. Case-folding is win32-only, so a case-different path on a case-insensitive macOS volume does not match.
