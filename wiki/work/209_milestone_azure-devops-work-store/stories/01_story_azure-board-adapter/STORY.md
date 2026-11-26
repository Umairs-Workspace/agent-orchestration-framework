---
type: story
number: 01
slug: azure-board-adapter
title: "An Azure project supplies the mapped reads and guarded writes"
parent: 209
depends: [00]
status: done
owner: product-owner
created: 2026-11-24
updated: 2026-11-26
schema: 1
aofVersion: 0.1.0
adrs: [ADR-001, ADR-004]
reads: [wiki/work/209_milestone_azure-devops-work-store/ARCHITECTURE.md#ADR-001, wiki/work/209_milestone_azure-devops-work-store/ARCHITECTURE.md#ADR-004, packages/work/src/store/board-definition.mjs, packages/work/src/store/board-store.mjs, schemas/work-board.schema.json, packages/work/src/lifecycle.mjs, packages/work/src/identity.mjs, wiki/work/206_spike_azure-devops-work-items/SPIKE.md, wiki/work/209_milestone_azure-devops-work-store/RESEARCH.md, test/golden/fixtures/work-stream/run-case.mjs]
files: [.aof/boards/azure-devops/board.yaml, .aof/boards/azure-devops/adapter.mjs, .aof/boards/azure-devops/http.mjs, .aof/boards/azure-devops/README.md, test/golden/fixtures/work-stream/azure-adapter.test-support.mjs, test/golden/work-stream.test.mjs]
---
# 01 · An Azure project supplies the mapped reads and guarded writes

## User story

As an Azure project maintainer, I want an opt-in board definition and adapter that understand our inherited process so that AOF can address the right item and detect a stale write.

## Notes

Own the copyable project definition, process setup guide and provider module. Cover batch hydration, all mapped types/states, relations, ranks, revision polling, guards, partial batch results and optional attachment links. Prove the adapter through a recorded transport, including a stale patch and a snapshot above 1,000 items.

## Tasks

- [x] [project access](tasks/00_project-access.feature)
- [x] [mapped reads](tasks/01_mapped-reads.feature)
- [x] [guarded changes](tasks/02_guarded-changes.feature)
- [x] [revision feed](tasks/03_revision-feed.feature)
