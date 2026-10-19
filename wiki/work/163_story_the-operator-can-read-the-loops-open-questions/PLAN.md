# 163 · The operator can read the loop's open questions — build plan

## Mechanism

`work:questions` is the read side of `work:answer`: a new command module beside `resume.mjs`,
composed in the same core binding (`assembleCommandsResume`) from injected services, and
registered in command-core next to `answerCommand`. It reads asks through the existing store
(`readAsks` in `ask-request.mjs`) and spells no path, segment or state word of its own (FF-13101).

A row is built per ref from the LATEST ask for that ref — the one `answerAsk` would write — and
only when that ask is `waiting` or `parked`. Each local row is then paired with its run: the
runs behind a ref (the primary's item and its dispatch lane) are read by the SAME function the
loop's `sweepStaleAsks` uses, lifted out of `cycle.mjs`'s inline `runsFor` into `ask.mjs`. A
run that is not `running` makes the row stale: listed, no answer line, the resume hint instead.
Worker asks come from `readExecutionOverlay` + `awaitsAnswer` (a local SQLite read, no daemon),
the same pair `work:list`'s ask overlay uses; a local ask for a ref outranks a worker's, as there.

### One predicate

"This run is waiting on a human" has one home: `standingAsk` in `packages/work-loop/src/ask.mjs`,
already exported through `loopAskServices`. `resume.mjs`'s `openLastAsk` is deleted and
`createReentryCommands` takes `standingAsk` injected; the stale test ("the run behind this ask is
not running") is likewise ONE exported function that `sweepStaleAsks` and the verb both call.

### Runtime

The codex path already stamps `runtime: "codex"`. The claude path's two `openAsk` calls in
`awaitAnswer` stamp the run's own runtime (`run.execution?.runtime`, else `"claude"` — the only
runtime the PTY ask path drives). A record written before this story has no runtime and the row
omits that part; a worker ask has none either. Never a placeholder.

### Order

Oldest asked first — `readAsks`'s own order (`askedAt`, then `runId`). Worker rows merge in by
their `askedAt`.

### Workspace name

Each row names its workspace from the node's workspace descriptors (`<meshRoot>/workspaces/
<id>.json`: `name`, `projectRoot`). No descriptor → the id. `--all` reads every workspace's asks
(`readAsks` without the filter — add an explicit all-workspaces read rather than passing
`undefined`), and resolves another workspace's runs from its descriptor's `projectRoot`; a root
that does not load reports liveness unknown.

The age is `formatElapsed(now - askedAt)` from `@aof/messaging/form`, passed in through the core
loop-ask binding (already one of the form's pinned importers) — never a second elapsed ladder, and
the verb never spells the phrase "waiting on you" (FF-13108).

## Verification step

From this checkout, with an isolated `AOF_GLOBAL_HOME`, write one `waiting` ask file for a real
item whose run record is `running` and one for an item whose run is `failed`; run
`aof work questions`. The first prints its full question and `aof work answer <ref> "…"`, the
second is marked stale with no answer line. `aof work answer <ref> "x"` on the first, then
`aof work questions` again, prints "No open questions." for it. A stale row carrying an answer
line, or a row disappearing before the answer, means the pairing is reading the wrong run.

## Out of scope

- The board and the fleet view — they already read the ask through `work:list`'s overlay.
- Answering from the listing (an interactive picker) — `aof work answer` stays the one write.
- Cleaning the stale ask — the loop's sweep owns that; this verb reads only.
- Fetching a worker's question text that never reached this node.

## Known traps

- The live `~/.aof/mesh/loop-asks/` holds leaked test fixtures (workspace `w1`); never test
  against it — every suite sets `AOF_GLOBAL_HOME`.
- `packages/work/src/commands` has a direct-children ceiling with no allowance; the new module
  raises it by one, with its ownership stated in the budget row.
