# 164/01 · The desktop app syncs every workspace — build plan

## Mechanism

`createMeshLauncher` gains `syncWorkspace` as an injected service, wired in the core launcher
binding from the publisher binding, as `publishGlobalWorkSnapshot` is today. `capturePropagation`
keeps its presence refresh, then:
- resolves the set with `resolveAggregationWorkspaces(ws, nodeId, tickOptions)`, the same call the
  presence assembly makes, sharing the tick's opener;
- loads each entry's workspace from its project root;
- calls `syncWorkspace` for each, in a per-workspace `try` so one failure never stops the rest.

Each skip or failure becomes one `emitWarning` with the workspace id, the path and the code. The
start-up `await capturePropagation()` is the catch-up pass (driver 2); nothing else is needed for
it.

The `publishGlobalWorkSnapshot` injection stays only where other callers in the launcher still use
it (the frame doors). `capturePropagation` no longer calls it with `ws`. FF-16405 reads that.

## Verification step

Start the launcher in a test with an injected `propagationTicker`. Register two fixture
workspaces in an isolated store, and launch from a third directory with no config. Hand-edit a
status in the second workspace and fire one tick: its row carries the edit, and the
unconfigured launch directory produced a skip warning, not a publish. Then stop the launcher,
edit the first workspace and start it again: the edit is in the store before any tick is fired.

## Out of scope

- How the read side shows these rows: story 02.
- Retry and visibility: story 03.
- Restarting the live desktop app: the operator's act.

## Known traps

- `resolveAggregationWorkspaces` normalises paths for deduplication (F11). Reuse it; never
  re-derive a workspace set.
- The tick body must never throw out of the ticker: keep the `.catch` and the per-workspace
  `try`.
- Tests inject tickers. Nothing in a test waits on wall-clock intervals.
