---
type: story
number: 01
slug: the-desktop-app-syncs-every-workspace
title: "The desktop app syncs every workspace and catches up when it starts — the daemon tick runs the one sync pass over every registered workspace, not the directory it was launched from"
parent: 164
status: in-review
owner: product-owner
created: 2026-10-19
updated: 2026-10-19
schema: 1
aofVersion: 0.1.0
depends: [00]
reads: [wiki/work/164_milestone_project-changes-reach-the-global-store/ARCHITECTURE.md#adr-004, wiki/work/164_milestone_project-changes-reach-the-global-store/ARCHITECTURE.md#adr-002, wiki/work/164_milestone_project-changes-reach-the-global-store/stories/01_story_the-desktop-app-syncs-every-workspace/EXAMPLES.md, wiki/work/164_milestone_project-changes-reach-the-global-store/stories/01_story_the-desktop-app-syncs-every-workspace/PLAN.md, packages/mesh/src/publisher.mjs, packages/mesh/src/presence.mjs, packages/mesh/src/presence-loop.mjs, packages/mesh/src/sync-cadence.mjs, packages/mesh/src/commands/serve.mjs, packages/core/src/application/bindings/global-work-publisher.mjs, packages/core/src/application/bindings/mesh/presence.mjs, apps/desktop/crates/core/src/supervision.rs, test/mesh/launcher/mesh-coordination-launcher.test.mjs, test/arch/mesh/acd-launcher-seam.test.mjs, test/arch/mesh/acd-presence-aggregates-node-workspaces.test.mjs, test/arch/store/acd-global-publisher-single-seam.test.mjs]
files: [packages/mesh/src/launcher.mjs, packages/mesh/src/publisher.mjs, packages/mesh/src/global-node-registry.mjs, packages/mesh/src/store.mjs, packages/core/src/application/bindings/mesh/launcher.mjs, test/mesh/launcher/mesh-launcher-syncs-every-workspace.test.mjs, test/mesh/launcher/index.mjs, test/arch/mesh/acd-sync-covers-every-registered-workspace.test.mjs, test/arch/mesh/index.mjs]
---
# 01 · The desktop app syncs every workspace and catches up when it starts

## User story

As **the operator, who keeps the desktop app running and works across several projects on one
machine**,
I want **the app's daemon to run the sync pass over every workspace registered on this node on
every tick, and once when it starts**,
so that **a hand edit, `git pull` or scaffold in any project reaches fleet within one tick while
the app runs, and lands as soon as it starts if it was off. Today the daemon publishes only the
directory it was launched from. The desktop app launches it from a directory with no aof config,
so no project is ever re-read.**

## Tasks

- [x] [00 · Every tick syncs every registered workspace](tasks/00_every-tick-syncs-every-registered-workspace.feature)
- [x] [01 · The daemon catches up when it starts](tasks/01_the-daemon-catches-up-when-it-starts.feature)
- [x] [02 · The live desktop app syncs changes made while it was off](tasks/02_the-live-app-syncs-changes-made-while-off.feature) (@manual, live restart)
- [x] [03 · A torn node record never empties a workspace's membership](tasks/03_a-torn-node-record-never-empties-membership.feature) (@bug, verify finding F-02)

## Notes

- **The set** is `resolveAggregationWorkspaces`, which the presence tick already uses: this node's
  registered workspaces, plus the launch cwd when that cwd is a real workspace. Deduplicated by
  normalised path. The tick shares its one store handle across the set (`sharedProjectionStore`),
  with no new opener.
- **The pass** is story 00's `syncWorkspace`, reached through the publisher binding. The cwd-only
  `publishGlobalWorkSnapshot(ws)` in `capturePropagation` is REPLACED (FF-16405), not kept beside
  it.
- **Start** runs the same pass over the same set before the first tick, where the start-up
  `capturePropagation()` runs today.
- **Skips are loud:** a registered workspace whose folder is gone, or that is not propagating,
  is reported once per tick through the existing warning sink, and the tick goes on.
- A restart is the operator's act. Task 02 is the live check (`@manual`): install from the main
  checkout, quit the app from its UI, edit and pull, relaunch with `aof mesh desktop run`, and
  measure at the source.
