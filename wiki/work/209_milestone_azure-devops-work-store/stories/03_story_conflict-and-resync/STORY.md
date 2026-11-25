---
type: story
number: 03
slug: conflict-and-resync
title: "A workflow detects an external edit and recovers on operator request"
parent: 209
depends: [02]
status: not-started
owner: product-owner
created: 2026-11-24
updated: 2026-11-24
schema: 1
aofVersion: 0.1.0
adrs: [ADR-002, ADR-003]
reads: [wiki/work/209_milestone_azure-devops-work-store/ARCHITECTURE.md#ADR-002, wiki/work/209_milestone_azure-devops-work-store/ARCHITECTURE.md#ADR-003, packages/work/src/store/board-definition.mjs, packages/work/src/store/board-links.mjs, packages/work/src/store/board-publication.mjs, packages/work/src/store/board-placement.mjs, packages/work-loop/src/engine.mjs, packages/core/src/application/bindings/work/dispatch.mjs, packages/work/src/ready-wave.mjs, packages/mesh/src/launcher.mjs, packages/core/src/application/bindings/loop/stop.mjs, packages/core/src/application/bindings/loop/cycle.mjs, packages/work/src/store/work-item-store.mjs]
files: [packages/work/src/store/board-store.mjs, packages/work/src/store/board-links.mjs, packages/work/src/store/board-conflicts.mjs, packages/work/src/commands/board-resync.mjs, packages/work/src/commands.mjs, packages/work/package.json, packages/core/src/application/bindings/command-core.mjs, packages/core/src/application/assemble.mjs, packages/core/src/application/bindings/loop/cycle.mjs, packages/work-loop/src/cycle.mjs, packages/work-loop/test/services.test.mjs, packages/work/test/observation.test.mjs, test/bundle/yarn-installation.test.mjs, test/arch/testing/acd-source-directory-budget.test.mjs]
---
# 03 · A workflow detects an external edit and recovers on operator request

## User story

As the operator of a running workflow, I want an external board edit to identify the affected work and persist a stop so that I can restore AOF's intended values before another step runs.

## Notes

Own observation with no pending edit, restart recovery, stale-write classification, the workflow stop and verified resync. Exercise the poll-to-dispatch boundary, duplicate observations, loss of feed continuity and a second edit during resync. Prove preservation of tracked values and unrelated board content.

## Tasks

Task contracts are authored at story refinement.
