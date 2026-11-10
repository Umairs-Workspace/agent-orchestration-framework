---
type: story
number: 07
slug: an-idle-tick-walks-nothing
title: "An idle tick walks nothing — a recursive watch per registered work dir marks it changed; the tick's stat gate, backoff check and presence read walk only a changed tree, with a safety walk every 5 minutes and today's walk when a watch cannot start"
parent: 167
status: done
owner: product-owner
created: 2026-10-22
updated: 2026-10-22
schema: 1
aofVersion: 0.1.0
depends: [00, 01, 03, 06]
reads: [wiki/work/167_milestone_daemon-stays-within-a-resource-budget/ARCHITECTURE.md#adr-009, wiki/work/167_milestone_daemon-stays-within-a-resource-budget/ARCHITECTURE.md#adr-003, wiki/work/167_milestone_daemon-stays-within-a-resource-budget/ARCHITECTURE.md#adr-005, wiki/work/167_milestone_daemon-stays-within-a-resource-budget/ARCHITECTURE.md#adr-001, wiki/work/167_milestone_daemon-stays-within-a-resource-budget/stories/07_story_an-idle-tick-walks-nothing/EXAMPLES.md, wiki/work/167_milestone_daemon-stays-within-a-resource-budget/stories/07_story_an-idle-tick-walks-nothing/PLAN.md, packages/work/src/discovery.mjs, packages/mesh/src/launcher.mjs, packages/mesh/src/publisher.mjs, packages/mesh/src/commands/serve.mjs, packages/foundation/src/cost-meter.mjs, packages/foundation/src/degrade.mjs, test/mesh/budget/soak-harness.mjs, test/arch/mesh/acd-one-cost-meter.test.mjs]
files: [packages/work/src/discovery.mjs, packages/mesh/src/launcher.mjs, packages/mesh/src/commands/serve.mjs, packages/foundation/src/cost-meter.mjs, packages/foundation/README.md, packages/work/test/discovery.test.mjs, packages/foundation/test/foundation.test.mjs, test/mesh/launcher/mesh-launcher-syncs-every-workspace.test.mjs, test/arch/mesh/acd-one-work-tree-walker.test.mjs, test/arch/mesh/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs, test/bundle/yarn-installation.test.mjs]
---
# 07 · An idle tick walks nothing

## User story

As **the operator, whose `mesh serve` still idles at 6–7% of a core after 00–06, because every
15 s tick stat-walks each registered work tree about three times**,
I want **a tick to walk a tree only when something in it has changed, as the OS reports it, with
an occasional safety walk, and today's walk wherever the OS cannot watch**,
so that **an idle daemon costs a fraction of its 2% budget on a tree as large as aof's, on Windows
as well as Linux, and an edit still reaches the store on the next tick. Today one walk of aof's
tree (≈0.4 CPU-s in Linux, ≈1.1 on Windows) spends the whole idle budget by itself.**

## Tasks

- [x] [00 · An unchanged watched tree is not walked](tasks/00_an-unchanged-watched-tree-is-not-walked.feature)
- [x] [01 · The daemon holds one watch per tree it syncs, and walks as today where it cannot](tasks/01_the-daemon-holds-a-watch-per-synced-tree.feature)

## Notes

- Found by profiling F-04 (STATE.md, 2026-10-22): ≈3 walks per tick, from the backoff check
  (`workTreeMovedSince`), the publisher's stat gate and the presence read's memo digest.
- Viewer requests keep their walk. The viewer-open budget (10%) covers them.
- 04's E1 is the acceptance this story exists for, so 04 follows it.
- **ADR-009.** The gate sits inside `statWorkTree`, so no caller changes. `stat-walk` joins the
  cost meter's closed cause set. FF-16706 keeps `discovery.mjs` the only walker and watcher.
- `test/arch/mesh` rises 54 → 55 for FF-16706's arch test.

## Accept decision

2026-10-22 — **ACCEPTED** by `aof:verify 167`. The story's suites pass with an isolated home: 9
launcher cases and 10 discovery cases, with a red probe on the gate itself. FF-16706 is green, with
a recorded red probe. The importer sweep and the work, mesh and foundation package suites are green
in the container. `aof work validate 167/07` passes, and doctor reports no `control-unresolved`.
No `@manual` or `@uat` scope. It discharges F-04 and F-06. F-09 is another item's, and F-11 and
F-13 are Nits. Evidence is in the parent `VERIFICATION.md`.
