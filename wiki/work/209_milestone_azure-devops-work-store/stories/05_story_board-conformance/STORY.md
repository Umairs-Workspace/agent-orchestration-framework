---
type: story
number: 05
slug: board-conformance
title: "The public work verbs and loop are verified against a board"
parent: 209
depends: [01, 02, 03, 04]
status: done
owner: product-owner
created: 2026-11-24
updated: 2026-11-26
schema: 1
aofVersion: 0.1.0
adrs: [ADR-001, ADR-002, ADR-003, ADR-004]
reads: [packages/mesh/src/commands/desktop-preflight.mjs, wiki/work/209_milestone_azure-devops-work-store/ARCHITECTURE.md#ADR-001, wiki/work/209_milestone_azure-devops-work-store/ARCHITECTURE.md#ADR-002, wiki/work/209_milestone_azure-devops-work-store/ARCHITECTURE.md#ADR-003, wiki/work/209_milestone_azure-devops-work-store/ARCHITECTURE.md#ADR-004, packages/work/src/store/board-store.mjs, packages/work/src/store/board-links.mjs, packages/work/src/store/board-conflicts.mjs, .aof/boards/azure-devops/board.yaml, .aof/boards/azure-devops/adapter.mjs, .aof/boards/azure-devops/README.md, wiki/work/209_milestone_azure-devops-work-store/RESEARCH.md, wiki/work/205_milestone_work-verb-goldens/OUTCOME.md, test/golden/fixtures/work-stream/file-adapter.mjs, test/golden/fixtures/work-stream/seed.json, test/golden/work-stream.lane.mjs, test/arch/work/acd-work-stream-golden-boundary.test.mjs, test/support/golden/harness.mjs, scripts/golden.mjs, test/support/cli-spawn.mjs, test/golden/fixtures/work-stream/azure-adapter.test-support.mjs, test/golden/fixtures/work-stream/run-case.mjs, packages/work/src/commands/board-resync.mjs, packages/work/src/commands/board-access.mjs]
files: [test/golden/fixtures/work-stream/run-case.mjs, test/golden/fixtures/work-stream/board-adapter.mjs, test/golden/fixtures/work-stream/azure-recordings.json, test/golden/fixtures/work-stream/alternate-board.yaml, test/golden/fixtures/work-stream/alternate-board.mjs, test/golden/work-stream.test.mjs, test/golden/fixtures/work-stream/file-adapter.mjs, wiki/work/209_milestone_azure-devops-work-store/VERIFICATION.md, packages/work/src/records.mjs, packages/work/src/store/board-store.mjs, packages/work/src/store/board-publication.mjs, packages/work/src/store/board-placement.mjs, packages/work/src/store/board-links.mjs, packages/work/src/doctor/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs, packages/work/src/identity.mjs, scripts/workspace-runtime-audit.json, test/arch/mesh/acd-autostart-is-one-injected-runner.test.mjs]
---
# 05 · The public work verbs and loop are verified against a board

## User story

As a team adopting a board, I want the same public-verb evidence as the file store and a witnessed run on Azure so that I can judge both compatibility and access to our project.

## Notes

Replay all 150 accepted 205 captures over sanitized recorded HTTP. Seed and observe the selected board as well as the repository artifacts, and retain the existing file lanes. Cover the second adapter, an end-to-end loop, a stale write and resync. Record a separate operator-designated live Azure run, including the inherited process and daemon environment actually exercised.

## Tasks

- [x] [Replay the work-verb captures over a recorded Azure board](tasks/00_replay-captures-over-board.feature)
- [x] [A project-owned second board runs through the same entry point](tasks/01_second-adapter.feature)
- [x] [Drive the loop over a recorded board and recover from a conflict](tasks/02_loop-over-board.feature)
- [x] [Record one verified run against a real Azure DevOps project](tasks/03_live-azure-run.feature)
- [x] [The board workflow suite is budgeted in the golden directory it joins](tasks/04_golden-directory-budget.feature) (`@bug`, 209/F-02)
