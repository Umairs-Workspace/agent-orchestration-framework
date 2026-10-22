---
type: story
number: 04
slug: the-budget-is-proven-by-a-soak-test
title: "The budget is proven by a soak test — the real daemons run over a generated tree as large as aof's, with the motivating faults planted and a viewer polling, and the gate goes red if either daemon is over budget"
parent: 167
status: done
owner: product-owner
created: 2026-10-20
updated: 2026-10-22
schema: 1
aofVersion: 0.1.0
depends: [01, 02, 03, 05, 06, 07]
reads: [wiki/work/167_milestone_daemon-stays-within-a-resource-budget/ARCHITECTURE.md#adr-007, wiki/work/167_milestone_daemon-stays-within-a-resource-budget/ARCHITECTURE.md#adr-002, wiki/work/167_milestone_daemon-stays-within-a-resource-budget/ARCHITECTURE.md#adr-001, wiki/work/167_milestone_daemon-stays-within-a-resource-budget/stories/04_story_the-budget-is-proven-by-a-soak-test/EXAMPLES.md, wiki/work/167_milestone_daemon-stays-within-a-resource-budget/stories/04_story_the-budget-is-proven-by-a-soak-test/PLAN.md, packages/foundation/src/cost-meter.mjs, packages/mesh/src/presence.mjs, packages/mesh/src/commands/identity.mjs, packages/mesh/src/global-node-registry.mjs, packages/mesh/src/projection-store.mjs, packages/effects/src/journal.mjs, bin/aof.mjs, scripts/test-sharded.mjs, test/support/cache-read-fixture.mjs, apps/ui/src/board/api.ts, apps/ui/src/fleet/api.ts, packages/work/src/discovery.mjs, packages/mesh/src/launcher.mjs, test/arch/testing/acd-source-directory-budget.test.mjs]
files: [test/mesh/budget/index.mjs, test/mesh/budget/soak-harness.mjs, test/mesh/budget/daemon-budget-soak.test.mjs, test/mesh/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs]
---
# 04 · The budget is proven by a soak test

## User story

As **the operator, who found the 17-hour burn in a log rather than in a test**,
I want **a test that runs the real daemons over a tree as large as aof's, with the faults that
caused that burn planted and a viewer polling, and goes red when either daemon is over budget**,
so that **the next change that makes a daemon expensive fails the regression gate on its own
pull request, rather than quietly costing a user's device a core.**

## Tasks

- [x] [00 · The real daemons hold the budget with the motivating faults planted](tasks/00_the-daemons-hold-the-budget-under-soak.feature)
- [x] [01 · The soak runs in the regression gate without touching the live node](tasks/01_the-soak-runs-in-the-gate.feature)

## Notes

- **The harness** (ADR-007) generates the fixture project at test time and starts the real
  `bin/aof.mjs mesh serve --serve` and `mesh ui` under an isolated `AOF_GLOBAL_HOME`. The control
  port comes from the fixture config's `mesh.relay.url`, and the UI port from `--port`, both
  free ports chosen by the harness.
- **The faults** are the three from the SPEC's case: an empty cache, an `event-id-conflict`, and
  dead registrations.
- **The judgement** imports `DAEMON_BUDGET` from 00's meter. It never restates a number
  (FF-16702).
- **It follows 05** only because both stories write `acd-source-directory-budget.test.mjs`, for
  the new `test/mesh/budget/` row. It reads nothing 05 builds.

## Accept decision

2026-10-22 — **ACCEPTED** by `aof:verify 167`. The soak suite is 8 of 8 green in the capped
container after 07, E1 and E2 included. `aof work validate 167/04` passes, and doctor reports no
error and no `control-unresolved`. There is no `@manual` or `@uat` scope, and no blocker
finding. F-10 (the soak not yet run on the Windows host) is an OUTCOME gap that the milestone's
regression gate discharges. F-12 is a Nit. Evidence is in the parent `VERIFICATION.md`.
