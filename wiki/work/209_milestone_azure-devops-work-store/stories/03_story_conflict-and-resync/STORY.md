---
type: story
number: 03
slug: conflict-and-resync
title: "A workflow detects an external edit and recovers on operator request"
parent: 209
depends: [02]
status: done
owner: product-owner
created: 2026-11-24
updated: 2026-11-26
schema: 1
aofVersion: 0.1.0
adrs: [ADR-002, ADR-003]
reads: [wiki/work/209_milestone_azure-devops-work-store/ARCHITECTURE.md#ADR-002, wiki/work/209_milestone_azure-devops-work-store/ARCHITECTURE.md#ADR-003, packages/work/src/store/board-definition.mjs, packages/work/src/store/board-links.mjs, packages/work/src/store/board-publication.mjs, packages/work/src/store/board-placement.mjs, packages/work-loop/src/engine.mjs, packages/core/src/application/bindings/work/dispatch.mjs, packages/work/src/ready-wave.mjs, packages/mesh/src/launcher.mjs, packages/core/src/application/bindings/loop/stop.mjs, packages/core/src/application/bindings/loop/cycle.mjs, packages/work/src/store/work-item-store.mjs, packages/work/src/commands/board-publish.mjs, packages/work-loop/src/dispatch.mjs, .aof/boards/azure-devops/adapter.mjs, packages/work/test/work-item-store.suite.mjs]
files: [packages/work/src/store/board-store.mjs, packages/work/src/store/board-links.mjs, packages/work/src/store/board-conflicts.mjs, packages/work/src/commands/board-resync.mjs, packages/work/src/commands.mjs, packages/work/package.json, packages/core/src/application/bindings/command-core.mjs, packages/core/src/application/assemble.mjs, packages/core/src/application/bindings/loop/cycle.mjs, packages/work-loop/src/cycle.mjs, packages/work-loop/test/services.test.mjs, test/bundle/yarn-installation.test.mjs, test/arch/testing/acd-source-directory-budget.test.mjs, packages/work/src/store/board-publication.mjs, packages/work/test/work-item-store.suite.mjs, packages/work-loop/src/engine.mjs, packages/work-loop/src/dispatch.mjs, packages/work-loop/test/dispatch.test.mjs, packages/work-loop/test/work-loop-stop-set.suite.mjs, test/arch/loop/acd-loop-probe-contract.test.mjs, test/loop/loop-command-stops.test.mjs, test/arch/assignment/acd-assignment-resolves-to-a-loop-call.test.mjs, test/mesh/assignment/mesh-assignment-loop-directive.test.mjs, test/fixtures/application/command-inventory.json, test/arch/work/acd-work-command-route-coverage.test.mjs, test/arch/work/acd-work-command-cli-bijection.test.mjs, test/command/command-core-contract.test.mjs, test/command/application-assembly.test.mjs, packages/work/src/store/work-item-store.mjs, packages/work/src/store/board-placement.mjs, packages/work-loop/src/commands/loop.mjs, packages/work-loop/src/wave.mjs, packages/core/src/application/bindings/commands/loop.mjs, packages/core/test/application.test.mjs, test/loop/loop-command-wave.test.mjs, test/arch/loop/acd-cap-exhaustion-returns-to-the-plan.test.mjs, test/arch/loop/acd-loop-ask-waits-in-place.test.mjs, test/loop/loop-only-fail-redrives.test.mjs, test/arch/loop/acd-loop-narrates-in-flight.test.mjs, test/arch/testing/acd-git-fake-parity.test.mjs]
---
# 03 · A workflow detects an external edit and recovers on operator request

## User story

As the operator of a running workflow, I want an external board edit to identify the affected work and persist a stop so that I can restore AOF's intended values before another step runs.

## Notes

Own observation with no pending edit, restart recovery, stale-write classification, the workflow stop and verified resync. Exercise the poll-to-dispatch boundary, duplicate observations, loss of feed continuity and a second edit during resync. Prove preservation of tracked values and unrelated board content.

## Tasks

- [x] [Detect a board edit AOF did not make](tasks/00_detect-external-edits.feature)
- [x] [Hold board writes and the workflows that contain the item](tasks/01_stop-holds-workflows.feature)
- [x] [Recover detection when the change feed loses its position](tasks/02_feed-continuity.feature)
- [x] [Restore AOF's tracked values with a verified resync](tasks/03_verified-resync.feature)
