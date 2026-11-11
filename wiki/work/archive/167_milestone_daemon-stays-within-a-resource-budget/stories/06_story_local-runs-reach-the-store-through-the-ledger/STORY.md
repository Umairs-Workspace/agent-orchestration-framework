---
type: story
number: 06
slug: local-runs-reach-the-store-through-the-ledger
title: "Local runs reach the store through the ledger — run.started and run.completed publish the run record into the store, and the presence tick reads running runs and loops from there instead of walking every item's runs/ folder"
parent: 167
status: done
owner: product-owner
created: 2026-10-21
updated: 2026-10-22
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/167_milestone_daemon-stays-within-a-resource-budget/ARCHITECTURE.md#adr-008, wiki/work/167_milestone_daemon-stays-within-a-resource-budget/ARCHITECTURE.md#adr-001, wiki/work/164_milestone_project-changes-reach-the-global-store/ARCHITECTURE.md#adr-003, wiki/work/164_milestone_project-changes-reach-the-global-store/ARCHITECTURE.md#adr-006, wiki/work/167_milestone_daemon-stays-within-a-resource-budget/stories/06_story_local-runs-reach-the-store-through-the-ledger/EXAMPLES.md, wiki/work/167_milestone_daemon-stays-within-a-resource-budget/stories/06_story_local-runs-reach-the-store-through-the-ledger/PLAN.md, packages/execution/src/run-transitions.mjs, packages/execution/src/runs.mjs, packages/execution/src/reconcile.mjs, packages/mesh/src/publisher.mjs, packages/mesh/src/commands/heartbeat.mjs, test/arch/command/acd-effects-ledger.test.mjs, test/arch/mesh/acd-presence-aggregates-node-workspaces.test.mjs, test/mesh/budget/daemon-budget-soak.test.mjs, scripts/test-docker.mjs]
files: [packages/mesh/src/effects.mjs, packages/core/src/application/bindings/effects/table.mjs, packages/mesh/src/projection-store.mjs, packages/core/src/application/bindings/global-work-store.mjs, packages/mesh/src/presence.mjs, packages/core/src/application/bindings/mesh/presence.mjs, packages/mesh/src/launcher.mjs, packages/core/src/application/bindings/mesh/launcher.mjs, packages/mesh/src/cache-read.mjs, test/mesh/presence/mesh-presence-reads-runs-from-the-store.test.mjs, test/mesh/presence/index.mjs, test/mesh/presence/mesh-presence-aggregate-workspaces.test.mjs, test/mesh/mesh-workspace-workdir-absolute.test.mjs, test/mesh/launcher/mesh-launcher-session-wire-complete.test.mjs, packages/mesh/test/mesh-presence-session-wire.suite.mjs, test/arch/mesh/acd-presence-reads-runs-from-the-store.test.mjs, test/arch/mesh/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs]
---
# 06 · Local runs reach the store through the ledger

## User story

As **the operator, whose `mesh serve` holds 12% of a core while idle because every 15 s tick
reads a `runs/` folder for each of about 1,800 items, twice, to ask what is running**,
I want **each workspace to put its own runs into the store through the ledger it already writes
(164's effects journal), and the daemon to read what is running from the store**,
so that **the daemon's idle cost stops growing with the size of the work trees it covers, and
"what is running on this node" has one answer that the workspace keeps up to date, rather than
one the daemon rebuilds by walking every workspace on every tick.**

## Tasks

- [x] [00 · A run on this node reaches the store through the ledger](tasks/00_a-run-reaches-the-store-through-the-ledger.feature)
- [x] [01 · The presence tick reads what is running from the store](tasks/01_presence-reads-runs-from-the-store.feature)

## Notes

- Found by 167/04's soak (2026-10-21), measured in a Linux container with `--cpu-prof`:
  `readActiveRuns` and `readActiveLoops` (`packages/mesh/src/presence.mjs`) each call `readRuns`
  for every item, archived ones included.
- The ledger exists: `run.started` and `run.completed` are already journal events, and the
  reconciler backfills a missed `run.started`. Their `@aof/mesh` reactor, `publish-projection`,
  republishes item rows only. `work_item_runs` and its reader `readCachedActiveRunIds` exist, and
  today only worker streams fill them.
- The wrinkle for refine: a loop's `lastActivityAt` is the run's `heartbeatAt`, which the heartbeat
  writes without raising an event.

## Accept decision

2026-10-22 — **ACCEPTED** by `aof:verify 167/06`. The story's two suites pass: 14 cases (E1–E9,
the completed-run tick and FF-16705's 4), with an isolated home. FF-16705 has a recorded red
probe, and FF-16701–16704 were probed at the same time. `aof work validate 167/06` passes, and doctor
reports no errors and no `control-unresolved`. There is no `@manual` or `@uat` scope. None of the
findings is a blocker: F-01 (E4 is proven at the seam, not through the verb) is closed in OUTCOME,
F-02 and F-03 are OUTCOME gaps, and F-04 (serve still idle at 6% against 2%) is open against 167/04
and the milestone's accept. Evidence is in the parent `VERIFICATION.md`.
