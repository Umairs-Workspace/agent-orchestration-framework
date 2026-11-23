# 04 · Build brief

## Mechanism

Supply the publisher, global projection and managed-worktree enumeration with the store for the workspace actually being visited. Collect invalidations with opaque tokens. Retain one observation per active workspace and dispose it when the workspace leaves the set.

## Verification

Drive the real publication seam from both the file watcher and a polling test double. Start with two workspaces and verify authoritative rows, idle reuse, lost-event recovery and independent disposal.

The delivery uses the file provider. Live integration with an external tracker belongs to milestone 209.
