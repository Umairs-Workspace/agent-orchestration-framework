# 01 · The desktop app syncs every workspace and catches up when it starts — Outcome

## Delivered

### The daemon tick syncs every registered workspace
Every propagation tick runs the one sync pass over `resolveTickWorkspaces` — this node's linked workspaces plus the launch cwd when it is a workspace — the same set presence reads; the cwd-only publish is gone (FF-16405), and each skip is a coded warning while the tick goes on.

### The daemon catches up when it starts
`startLauncher` runs the same pass over the same set before its first tick, so a change made while the desktop app was off is in the store as soon as it starts (measured live on node-7297, 2026-10-19).

### A torn node record never empties membership
A registry publish over a node roster with an unreadable record writes nothing and fails `node-record-unreadable`, so the last membership stands and the owed change retries until the record is readable.

## Assumptions

- **The node roster is the membership source** — a workspace stays in the tick's set only while `global_node_workspaces` links it, which each registry publish rewrites from `~/.aof/mesh/nodes`.

## Gaps

### Stale registered dispatch-worktree workspaces
- **Status:** open
- **Discharge condition:** the registry drops (or stops linking) a descriptor whose folder is gone, so the tick stops warning about it.
About 57 descriptors of deleted dispatch worktrees are still linked on the control node, and each warns `workdir-missing` on every tick.
