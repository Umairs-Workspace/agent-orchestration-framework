---
type: milestone
number:
slug: workspace-id-rekey
title: "A duplicate workspace id can be moved onto the canonical one across every store, and nothing is lost or left behind"
status: not-started
owner: product-owner
created: 2026-10-30
updated: 2026-10-30
schema: 1
aofVersion: 0.1.0
---
# A duplicate workspace id can be moved onto the canonical one across every store, and nothing is lost or left behind

## Objective

TECH_DEBT item 4's last residue (its part E), split out at 175's verify on 2026-10-30, after parts
A–D were fixed there.

One repository can sit under two workspace ids in the fleet's stores. One is the path-derived id
from before m42 pinned identity at clone time. The other is the canonical id the clone now pins.
Nothing can move rows from one to the other. `scripts/prune-projection.mjs` only deletes. It also
covers 8 of the roughly 14 workspace-keyed tables, and skips:
- `global_assignments` and `work_item_observations`;
- `global_item_branches` and `global_assignment_directives`;
- `global_recovery_pushes` and `global_resync_requests`;
- the effects journal and the loop asks.

So an operator who finds a duplicate can delete one half of the history, or live with both.

The milestone is met when an operator can preview the move of everything a duplicate id holds
onto its canonical id, then apply it, on the Windows control node and on a worker. After the
move, no store, file or marker names the old id, and the fleet, the board and dispatch read one
workspace with its whole history.

## Scope

In scope:
- **A rekey verb, dry-run by default.**
  - It lists every row, file and marker it would move.
  - It applies only on an explicit flag, in one transaction per store.
- **Every place keyed by workspace id:**
  - every `projection.sqlite` table with a `workspace_id` column;
  - the descriptor files under `~/.aof/mesh/workspaces/`;
  - the effects journal event payloads that carry `workspaceId`;
  - the loop asks filtered by it;
  - a checkout's pinned `mesh.workspaceId`;
  - `mesh.repo.workspaceId` markers.
- **Collisions.** A defined rule for primary-key collisions, e.g. one `(workspace_id, ref)` held
  under both ids. Which row wins is stated, and the loser is reported, never silently dropped.
- **Dispatch history.** A stated decision on what happens to assignments, branches, directives
  and observations recorded under the old id.
- **A census.** A fitness function that fails when a new table or file keyed by workspace id is
  not covered by the rekey.

Out of scope:
- **Detecting duplicates automatically or rekeying on its own.** The operator names the old and
  new ids; this milestone does not decide that two ids are one repo.
- **Parts A–D of item 4.** Fixed at 175's verify (2026-10-30).
- **Re-deriving identity.** `resolveWorkspaceId` stays the one home, unchanged.

## Stories

To be broken down by `aof:refine`.

## Dependencies

- **m42 (archived), item 4's one identity home and the clone-time pin.** They define which id is
  canonical.
- **The Windows control node and a worker node.** This standalone MacBook holds no duplicate ids,
  so the real verification runs where they exist.
