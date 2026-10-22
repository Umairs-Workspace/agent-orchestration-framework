# 03 · A permanent fault is said once and backed off — Outcome

## Delivered

### A permanent sync failure is said once and backed off
The launcher holds a closed permanent-code set (`event-id-conflict`, `workdir-missing`, `not-a-directory`, `no-descriptor`). A workspace failing on one gets one warning, then counted `sync-pass`/`backoff` skips, with the gap doubling from one tick to a 1-hour cap. The backoff ends when the workspace's stat digest moves or a pass succeeds, and a restart says the failure once more. Any other code is retried on the next tick and warned about as before.

### One registry resolve per tick
The sync pass and the presence aggregation share one `resolveTickWorkspaces` result in `capturePropagation`, so a gone folder is reported once a tick at most.

### A gone registration is removed at once
A registration whose folder is missing (`workdir-missing`) or is not a directory is removed from this node's rows on the first tick, with one line naming the workspace and its path, by `global-node-registry.mjs`. A `no-descriptor` registration stays registered and backed off. Another node's rows are never touched, a registry that cannot be read removes nothing, and the next aof command in the folder registers it again.

## Gaps

### The skip line's "said once" wording
- **Status:** open
- **Discharge condition:** the unresolvable-skip line names "said once" only for a code in the permanent set.
The line claims "said once" for any code. That is unreachable today, because every registry skip carries a permanent reason (m167/F-05).

### A moved workspace that fails again
- **Status:** open
- **Discharge condition:** a held workspace that moved and fails again takes one stat walk on that tick.
It stat-walks its tree twice on that tick (m167/F-06).
