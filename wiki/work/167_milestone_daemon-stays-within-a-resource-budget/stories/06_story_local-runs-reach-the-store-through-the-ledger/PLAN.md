# 167/06 · Local runs reach the store through the ledger — build plan

## Mechanism

**The workspace writes: a `publish-run` reactor.** Add one `@aof/mesh` reactor, `publish-run`
(locus `local`, `retry: "until-done"`), to `run.started` and `run.completed` beside
`publish-projection`, which stays as it is. Its apply:
1. resolves the workspace from `payload.workspaceRoot`, or, when a mint passed none, from the
   run's own item (`payload.itemDir`, through the config loader). This is what keeps every mint
   site untouched: `drive`, `cycle`, `wave`, `loop` and `run-start` pass no workspace today;
2. asks the one propagation predicate (`meshGlobalPropagationDecision`), so a lane, a secondary
   checkout or a non-mesh workspace publishes nothing, exactly as the projection does;
3. reads the run's record as it stands now, by `payload.runId`, from the run store, so a retried
   step writes the latest state;
4. upserts that one row into `work_item_runs` with this node as `node_id`. Add a narrow writer
   beside `upsertWorkItemContent` in the projection store. It is not a second opener: it takes
   the handle the reactor opened through `openGlobalWorkProjectionStore`.

The core table binding hands the reactor its services (run store, store opener, the predicate).

**The daemon reads.** In the presence tick, replace the `readActiveRuns(local.items)` and
`readActiveLoops(local.items, …)` walk with one query per tick over the tick's shared store
handle: this node's rows in `work_item_runs` whose record reads `running`, for the workspace ids
the tick resolved. Active run ids come from those rows. Loop entries come from the rows whose
record declares a loop, with `lastActivityAt` read from that run's record on disk (the one
per-running-run read). The cache's `readCachedActiveRunIds` half for other nodes' runs is unchanged.
`readActiveRuns` and `readActiveLoops` keep their item-list signatures for their other callers
(`mesh heartbeat`). Only the tick stops calling them.

**Tests that seeded run JSON on disk and expected presence to find it** must start the run through
`run-start` or the transition seam instead, or have the reconciler backfill it, because a
hand-written record is no longer seen. That is the behaviour this story changes, and each such
test moves with it.

## Verification step

The soak, in the container: `node scripts/test-docker.mjs --only
test/mesh/budget/daemon-budget-soak.test.mjs`. `serve` is under the idle budget, E1 is green, and
the profile shows no `readRuns` on the tick. Then the story's own suite and FF-16705 on the host,
focused.

## Out of scope

- Raising an event on heartbeats (ADR-008 rejected it).
- The Windows stat-walk cost (167/04's STATE note). Re-measure it on the host once this lands.
