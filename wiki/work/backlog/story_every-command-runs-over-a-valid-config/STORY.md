---
type: story
number:
slug: every-command-runs-over-a-valid-config
title: "Every aof command runs over a valid config — a missing mesh.workspaceId is pinned (or refused) before the command runs, not discovered later by the desktop preflight"
status: not-started
owner: product-owner
created: 2026-10-02
updated: 2026-10-02
schema: 1
aofVersion: 0.1.0
tags: [bug, mesh, config]
reads:
  - packages/core/src/cli.mjs
  - packages/core/src/application/bindings/command-core.mjs
  - packages/core/src/application/bindings/work.mjs
  - packages/mesh/src/workspace-identity.mjs
  - packages/mesh/src/global-node-registry.mjs
  - packages/mesh/src/projection-store.mjs
  - packages/mesh/src/commands/desktop-preflight.mjs
files:
  - packages/core/src/application/bindings/command-core.mjs
  - packages/core/src/application/bindings/work.mjs
  - packages/mesh/src/workspace-identity.mjs
  - packages/mesh/src/global-node-registry.mjs
  - packages/mesh/src/projection-store.mjs
---
# Every aof command runs over a valid config

## User story

As **the operator who runs aof across several repositories and machines**,
I want **every `aof` command (`aof work next`, `aof mesh …`, anything else) to check the project's
`.aof/aof.config.json` for the keys the mesh relies on before it does anything — pinning a missing
`mesh.workspaceId` to the id the workspace is already registered under, or refusing with a coded error
that names the key**,
so that **a repository is never half-configured without anyone noticing. Today the gap only shows up
when `aof mesh desktop run` fails its `workspace-identity-pinned` preflight, long after the commands
that should have caught it ran, and a workspace whose identity is unpinned can be re-identified (and
registered twice) depending on where a command was started.**

## Tasks

## Notes

- **Found 2026-10-02** while verifying the desktop app on milestone 142's build. `aof mesh desktop run`
  preflight failed `workspace-identity-pinned` for four of the operator's real downstream repositories
  (named in the preflight output on that machine).

  None of the four has `mesh.workspaceId` in its own `.aof/aof.config.json`, although each is registered
  under a stable id in `~/.aof/mesh/workspaces`. No command checks the config's required keys before it
  runs.
- **Outcomes this story must deliver:**
  1. **One config-validation door that every CLI command passes through.** It pins a missing
     `mesh.workspaceId` to the id the workspace is already registered under, or refuses with a coded
     error naming the key. It is not a check repeated per command.
  2. **A directory that is a dispatch lane or a temporary test fixture never registers as a mesh
     workspace.**
  3. **The desktop preflight passes on these repositories without hand edits.**
- **Related, measured the same day.** Workspace identity is still partly derived from the current
  directory (TECH_DEBT item 4):
  - Launching `aof mesh desktop run` from the home folder registered a bogus `aof-global` workspace at
    the user's home directory. The running `mesh serve` kept republishing it until it was restarted from
    a repository root.
  - Test runs had leaked 341 fixture workspaces into the real `~/.aof/mesh/workspaces`, plus 10 dead
    dispatch-lane registrations, and they flooded the fleet. They were cleaned by hand on 2026-10-02:
    - the records are kept in `~/.aof/mesh/workspaces-pruned-*`;
    - the projection database was backed up before its rows were removed.
- **Cleanup has no door.** Removing the projection rows needed `removeWorkspaceFromCache` for the cache
  rows, plus direct deletes from `global_workspace_descriptors` and `global_node_workspaces`, which have
  no removal path of their own. An unregister door belongs with outcome 2.
