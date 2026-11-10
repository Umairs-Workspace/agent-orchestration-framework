---
type: story
number: 03
slug: a-permanent-fault-is-said-once-and-backed-off
title: "A permanent fault is said once and backed off — the daemon tick names a sync failure that will not fix itself once, stops retrying it every tick, and stops walking registrations whose workspace is gone"
parent: 167
status: done
owner: product-owner
created: 2026-10-20
updated: 2026-10-22
schema: 1
aofVersion: 0.1.0
depends: [00, 01]
reads: [wiki/work/167_milestone_daemon-stays-within-a-resource-budget/ARCHITECTURE.md#adr-005, wiki/work/167_milestone_daemon-stays-within-a-resource-budget/ARCHITECTURE.md#adr-003, wiki/work/164_milestone_project-changes-reach-the-global-store/ARCHITECTURE.md#adr-004, wiki/work/167_milestone_daemon-stays-within-a-resource-budget/stories/03_story_a-permanent-fault-is-said-once-and-backed-off/EXAMPLES.md, wiki/work/167_milestone_daemon-stays-within-a-resource-budget/stories/03_story_a-permanent-fault-is-said-once-and-backed-off/PLAN.md, packages/foundation/src/cost-meter.mjs, packages/mesh/src/presence.mjs, packages/mesh/src/publisher.mjs, packages/work/src/discovery.mjs, packages/core/src/application/bindings/mesh/launcher.mjs, packages/core/src/application/bindings/global-node-registry.mjs, test/arch/mesh/acd-sync-covers-every-registered-workspace.test.mjs]
files: [packages/mesh/src/launcher.mjs, packages/mesh/src/global-node-registry.mjs, test/mesh/launcher/mesh-launcher-syncs-every-workspace.test.mjs, test/mesh/mesh-workspace-workdir-absolute.test.mjs]
---
# 03 · A permanent fault is said once and backed off

## User story

As **the operator, whose daemon retried an `event-id-conflict` 83 times and walked 58 deleted
worktrees on every tick**,
I want **a sync failure that cannot fix itself said once, with its workspace, and then left alone
until something changes, and a registration whose folder is gone to stop costing anything**,
so that **one bad workspace costs the daemon one warning instead of a retry and two log lines
every 15 s for as long as it runs, and the warnings I do get are about something I can act on.**

## Tasks

- [x] [00 · A permanent sync failure is said once and backed off](tasks/00_a-permanent-failure-is-said-once.feature)
- [x] [01 · A registration whose folder is gone stops costing anything](tasks/01_a-gone-registration-stops-costing.feature)

## Notes

- **One resolve per tick** (ADR-005): the sync pass and the presence aggregation share one
  `resolveTickWorkspaces` result, so each unresolvable registration is reported once a tick at
  most, and then not at all under the backoff.
- **Permanent codes** are a closed set in the launcher: `event-id-conflict`, `workdir-missing`,
  `not-a-directory` and `no-descriptor`. Every other code keeps today's per-tick retry, and a
  failed journal step keeps 164/ADR-006's retry until done.
- **Backoff** doubles from one tick to a 1-hour cap. It ends early when the workspace's stat
  digest moves (01's `workTreeStatDigest`). A restart clears it.
- **A gone registration is removed at once** (Q1, answered 2026-10-20), with one line naming the
  workspace and its path. The next aof command in that folder registers it again. The removal is
  written by `global-node-registry.mjs`, the registry's one writer, and touches only this node's
  rows.
- Counted with 00's meter: a pass is `sync-pass`, a failure is `sync-failure` labelled with its
  workspace and code, and a skipped pass is `sync-pass` labelled `backoff`.

## Accept decision

2026-10-22 — **ACCEPTED** by `aof:verify 167`. The launcher and workdir suites pass with an
isolated home and no failures, every scenario a named `167/03` case. `aof work validate 167/03`
passes, and doctor reports no `control-unresolved`. No `@manual` or `@uat` scope. F-05 and F-06
are non-blocking OUTCOME gaps, and F-06 feeds F-04. Evidence is in the parent `VERIFICATION.md`.
