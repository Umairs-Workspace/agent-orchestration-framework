# 167/03 · A permanent fault is said once and backed off — build plan

## Mechanism

**One resolve per tick.** The presence tick and the sync tick run on the same propagation
ticker. Resolve the tick's workspace set once, in the tick, and hand it to both
`syncTickWorkspaces` and `assemblePresenceForTick`, rather than each calling
`resolveTickWorkspaces`. The skip warnings move with it, so they are emitted once.

**The fault ledger** is a `Map<"<workspaceId>\0<code>", { failures, nextAt, digest }>`, owned by
the launcher instance and created in `startLauncher`, so tests get a fresh one per launcher. On a
permanent failure:
- with no entry, warn once and set `nextAt = now + tick`;
- with an entry, double the delay up to `PERMANENT_FAULT_CAP_MS` (1 h), with no warning.

Before a workspace's pass, a ledger entry whose `nextAt` is in the future skips the pass, unless
the workspace's `workTreeStatDigest` differs from the digest stored at the failure. A success
deletes the entry. The clock is the launcher's injected `now`.

**A gone registration** (`workdir-missing` or `not-a-directory` from the registry resolve) is
removed at once (Q1). `global-node-registry.mjs` gains `forgetNodeWorkspace(nodeId, workspaceId)`,
which deletes exactly one `global_node_workspaces` row for this node. The launcher calls it
through its binding and logs one line. `no-descriptor` is not a gone folder, so it stays under
the backoff and is never removed.

## Verification step

On an isolated store, register 5 workspaces whose folders do not exist, and one whose pass throws
`event-id-conflict`. Drive 20 ticks with the injected ticker and clock. The warnings sink holds
exactly 6 lines. The meter shows 1 `sync-failure` per workspace and the rest as `backoff` skips.
Edit a doc in the conflicting workspace: the next tick runs its pass.

## Out of scope

- Stopping dispatch worktrees from registering (ADR-005, deferred).
- Retry policy for journal steps (164/ADR-006, unchanged).
