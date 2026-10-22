# 167/00 · The daemon says what it costs — build plan

## Mechanism

**The meter** is a leaf in `@aof/foundation`, so work, mesh and server can all import it without
a new edge. It keeps:
- a CPU and event-loop reading taken on each `sample()`, kept as a ring of 15 s samples so the
  60 s window is a subtraction, never a timer of its own;
- counters keyed by cause plus a label tuple. The cause set is closed: an unknown cause throws in
  a test build and is dropped with one degrade in production;
- `DAEMON_BUDGET` and `judge(snapshot)` → `{ state, budgetPercent, over }`.

`reportDegrade` calls `count("degrade", { code, workspaceId })` before its throttle check. That
one line is what turns "the sink fires every 6 s" into a rate. Its context argument already
exists; the read path starts passing `workspaceId` into it.

**Writing.** `presence.mjs` gains `publishCostSnapshot(workspace, nodeId, daemon, snapshot)` and
`readCostSnapshots(workspace, nodeId)`, both under `meshDir/cost/`, using the atomic `writeText`
the presence record already uses. The launcher starts a 15 s writer beside its other tickers. It
uses an injected ticker, as every launcher ticker does, so tests never wait on the clock. The
`mesh ui` command starts the same writer for its process. Both write once more on a clean stop.

**Reading.** `mesh:status` reads the snapshots through the binding and adds `cost` (E4–E6). The
doctor command edge reads the same snapshots and passes them as data into the pure lane
`doctor/daemon-cost.mjs`, the same shape as `sync.mjs` (164/03).

## Verification step

With an isolated `AOF_GLOBAL_HOME`, start `mesh serve` over a fixture workspace whose cache is
empty, and poll the board route 20 times. `aof mesh status --json` shows `full-disk-read` ≥ 20
with the fixture's workspace id, while the degrade log holds far fewer lines. Stop the daemon,
wait 50 s, and run it again: the status shows `serve` as `not-reporting`.

## Out of scope

- Making anything cheaper. That is 01–03. This story only makes the cost visible.
- The desktop's own sample (05) and the soak test (04).
