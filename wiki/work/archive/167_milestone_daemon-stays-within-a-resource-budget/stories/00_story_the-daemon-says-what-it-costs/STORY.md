---
type: story
number: 00
slug: the-daemon-says-what-it-costs
title: "The daemon says what it costs — each daemon measures its own CPU and counts its work by cause, and `aof mesh status` and `aof work doctor` say what it spent its time on and whether that is over budget"
parent: 167
status: done
owner: product-owner
created: 2026-10-20
updated: 2026-10-22
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/167_milestone_daemon-stays-within-a-resource-budget/ARCHITECTURE.md#adr-001, wiki/work/167_milestone_daemon-stays-within-a-resource-budget/ARCHITECTURE.md#adr-002, wiki/work/167_milestone_daemon-stays-within-a-resource-budget/stories/00_story_the-daemon-says-what-it-costs/EXAMPLES.md, wiki/work/167_milestone_daemon-stays-within-a-resource-budget/stories/00_story_the-daemon-says-what-it-costs/PLAN.md, packages/foundation/src/degrade.mjs, packages/foundation/src/fs.mjs, packages/mesh/src/presence.mjs, packages/mesh/src/launcher.mjs, packages/mesh/src/ui-serve.mjs, packages/mesh/src/commands/identity.mjs, packages/mesh/src/commands/ui.mjs, packages/server/src/board-ui.mjs, packages/work/src/read.mjs, packages/work/src/doctor/index.mjs, packages/work/src/doctor/sync.mjs, packages/work/src/commands/doctor.mjs, packages/core/src/application/bindings/mesh/launcher.mjs, packages/core/src/application/bindings/mesh/presence.mjs, packages/core/src/application/bindings/mesh/ui-serve.mjs, packages/core/src/application/bindings/commands/mesh/identity.mjs, packages/core/src/application/bindings/commands/mesh/ui.mjs, packages/core/src/application/bindings/commands/doctor.mjs, apps/ui/src/board/api.ts, apps/ui/src/fleet/api.ts, test/arch/mesh/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs]
files: [packages/foundation/src/cost-meter.mjs, packages/foundation/src/degrade.mjs, packages/mesh/src/presence.mjs, packages/mesh/src/launcher.mjs, packages/mesh/src/ui-serve.mjs, packages/mesh/src/commands/identity.mjs, packages/mesh/src/commands/ui.mjs, packages/server/src/board-ui.mjs, packages/work/src/read.mjs, packages/work/src/doctor/daemon-cost.mjs, packages/work/src/doctor/index.mjs, packages/work/src/commands/doctor.mjs, packages/core/src/application/bindings/mesh/launcher.mjs, packages/core/src/application/bindings/mesh/presence.mjs, packages/core/src/application/bindings/mesh/ui-serve.mjs, packages/core/src/application/bindings/commands/mesh/identity.mjs, packages/core/src/application/bindings/commands/mesh/ui.mjs, packages/core/src/application/bindings/commands/doctor.mjs, apps/ui/src/board/api.ts, apps/ui/src/fleet/api.ts, packages/foundation/test/foundation.test.mjs, test/store/cache-read-boundary-holds.test.mjs, test/mesh/launcher/mesh-launcher-syncs-every-workspace.test.mjs, test/mesh/ui/mesh-ui-serve.test.mjs, test/surfaces/board-api.test.mjs, test/mesh/identity/mesh-identity-status-commands.test.mjs, packages/work/test/doctor.test.mjs, test/arch/mesh/acd-one-cost-meter.test.mjs, test/arch/mesh/acd-daemon-budget-one-home.test.mjs, test/arch/mesh/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs]
---
# 00 · The daemon says what it costs

## User story

As **the operator, whose `mesh serve` held more than one core for 17 hours while nothing said
so**,
I want **each daemon to measure its own CPU and count its work by cause, and one command to show
it**,
so that **the next time a daemon gets expensive I can see what it is spending its time on and for
which workspace, from `aof mesh status` or `aof work doctor`, without reading a log. Today the
only trace is a degrade line, throttled to one every 5 s, that does not even name its workspace.**

## Tasks

- [x] [00 · Each daemon counts its work by cause and writes a cost snapshot](tasks/00_each-daemon-counts-its-work.feature)
- [x] [01 · `aof mesh status` and `aof work doctor` say what each daemon costs](tasks/01_status-and-doctor-say-what-it-costs.feature)

## Notes

- **The meter** (ADR-001) is a zero-import leaf beside `degrade.mjs`. The closed cause set and the
  budget constants (ADR-002) live in it. Every count site passes a workspace label when it has
  one, and so does every degrade line.
- **Two snapshots per node**, `serve` and `ui`, written through `presence.mjs` under
  `meshDir/cost/`. `mesh status --json` reads them into a `cost` block, and the new doctor lane
  `daemon-cost` judges them. A snapshot older than 45 s reads as `not-reporting`.
- **The budget is 2% of a core idle and 10% viewer-open** (Q1, answered 2026-10-20). Nothing else
  in the milestone declares the numbers: 04 imports them, and 05 reads them off the status block.
- `packages/work/src/doctor` rises 13 → 14 for `daemon-cost.mjs`, and `test/arch/mesh` rises
  51 → 53 for FF-16701 and FF-16702, each with its ownership stated.

## Accept decision

2026-10-22 — **ACCEPTED** by `aof:verify 167`. The story's own suites pass with an isolated home:
156 registered cases and 30 native cases, no failures, and every scenario a named `167/00` case.
FF-16701 and FF-16702 are green with recorded red probes. `aof work validate 167/00` passes, and
doctor reports no error and no `control-unresolved`. There is no `@manual` or `@uat` scope, and
no blocker finding. Evidence is in the parent `VERIFICATION.md`.
