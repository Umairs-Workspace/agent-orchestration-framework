---
type: story
number: 02
slug: guarded-lifecycle
title: "Status moves and run effects use the selected store"
parent: 208
depends: [00]
status: not-started
owner: product-owner
created: 2026-11-23
updated: 2026-11-23
schema: 1
aofVersion: 0.1.0
adrs: [ADR-001, ADR-002]
reads: [wiki/work/208_milestone_work-item-store-seam/ARCHITECTURE.md#ADR-001, wiki/work/208_milestone_work-item-store-seam/ARCHITECTURE.md#ADR-002, wiki/work/208_milestone_work-item-store-seam/RESEARCH.md, wiki/work/208_milestone_work-item-store-seam/stories/02_story_guarded-lifecycle/EXAMPLES.md, packages/work/src/store/work-item-store.mjs, packages/core/src/application/bindings/work.mjs, packages/work/src/lifecycle.mjs, packages/work/test/records.test.mjs, packages/work/test/status-gate.test.mjs, packages/work/test/transitions.test.mjs, test/golden/fixtures/work-stream/work-stream-life.cases.json, packages/execution/test/transitions.test.mjs, packages/work/test/effects.test.mjs, packages/work/src/records.mjs, packages/work/src/item-transitions.mjs, packages/work/src/effects.mjs, packages/work/src/commands/item-status.mjs, packages/core/src/application/bindings/effects/item-transitions.mjs, packages/core/src/application/bindings/effects/table.mjs, packages/execution/src/run-transitions.mjs, packages/work/src/store-metadata.mjs, test/work/stream/work-frontmatter-writer.test.mjs, test/work/stream/work-prototype-four-moves.test.mjs, test/arch/work/acd-status-rollback-bounded.test.mjs]
files: [packages/core/src/application/bindings/effects/item-transitions.mjs, packages/core/src/application/bindings/effects/table.mjs, packages/execution/src/run-transitions.mjs, packages/work/src/commands/item-status.mjs, packages/work/src/effects.mjs, packages/work/src/item-transitions.mjs, packages/work/src/records.mjs, packages/work/src/store-metadata.mjs, packages/work/src/store/file-lifecycle.mjs, packages/work/src/store/file-store.mjs, test/arch/work/acd-status-rollback-bounded.test.mjs, test/work/stream/work-frontmatter-writer.test.mjs, test/work/stream/work-prototype-four-moves.test.mjs]
---
# 02 · Status moves and run effects use the selected store

## User story

As an operator, I want direct and run-driven lifecycle moves to use the same guard so that retries retain the current status semantics.

## Tasks

- [ ] `tasks/00_move.feature` — The item type and current state govern the move.
- [ ] `tasks/01_run-effects.feature` — Run effects retain their narrower status preconditions.
