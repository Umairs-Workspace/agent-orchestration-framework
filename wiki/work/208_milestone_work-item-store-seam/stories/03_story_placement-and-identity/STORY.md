---
type: story
number: 03
slug: placement-and-identity
title: "Promotion, insertion and moves preserve the work stream"
parent: 208
depends: [00]
status: not-started
owner: product-owner
created: 2026-11-23
updated: 2026-11-23
schema: 1
aofVersion: 0.1.0
adrs: [ADR-001, ADR-002]
reads: [wiki/work/208_milestone_work-item-store-seam/ARCHITECTURE.md#ADR-001, wiki/work/208_milestone_work-item-store-seam/ARCHITECTURE.md#ADR-002, wiki/work/208_milestone_work-item-store-seam/RESEARCH.md, wiki/work/208_milestone_work-item-store-seam/stories/03_story_placement-and-identity/EXAMPLES.md, packages/work/src/store/work-item-store.mjs, packages/core/src/application/bindings/work.mjs, packages/work/src/dependencies.mjs, packages/work/src/identity.mjs, test/work/stream/work-archive-is-a-move.test.mjs, test/golden/fixtures/work-stream/work-stream-place.cases.json, test/golden/fixtures/work-stream/work-stream-life.cases.json, test/work/stream/work-prototype-four-moves.test.mjs, packages/work/src/commands/migrate-folder.mjs, packages/work/test/insertion.test.mjs, packages/work/test/mutations.test.mjs, packages/work/test/promotion.test.mjs, packages/work/src/promote/candidates.mjs, packages/work/src/promote/promotion.mjs, packages/work/src/insertion/scaffold.mjs, packages/work/src/commands/promote.mjs, packages/work/src/commands/prototype.mjs, packages/work/src/commands/promote-gap-to-chore.mjs, packages/work/src/commands/promote-finding-to-chore.mjs, packages/work/src/commands/insert-milestone.mjs, packages/work/src/commands/insert-chore.mjs, packages/work/src/commands/insert-uat.mjs, packages/work/src/commands/insert-story.mjs, packages/work/src/commands/archive.mjs, packages/work/src/commands/renumber.mjs, packages/work/src/stream-transitions.mjs, packages/work/src/renumber.mjs, packages/work/src/reindex.mjs, packages/work/src/archive.mjs, packages/work/src/upgrade.mjs, packages/core/src/application/bindings/effects/stream-transitions.mjs, packages/core/src/application/bindings/commands/insert-shared.mjs, packages/core/src/application/bindings/commands/promote.mjs, packages/core/src/application/bindings/commands/prototype.mjs, packages/core/src/application/bindings/commands/migrate-folder.mjs, packages/core/src/application/bindings/work/upgrade.mjs, test/work/stream/work-renumber.test.mjs, test/work/stream/work-insert-atomic-preflight.test.mjs, test/work/stream/work-promote-mints-the-number.test.mjs, packages/work/src/promote/chore-seed.mjs, test/work/stream/work-upgrade-idempotent.test.mjs]
files: [packages/core/src/application/bindings/commands/insert-shared.mjs, packages/core/src/application/bindings/commands/migrate-folder.mjs, packages/core/src/application/bindings/commands/promote.mjs, packages/core/src/application/bindings/commands/prototype.mjs, packages/core/src/application/bindings/effects/stream-transitions.mjs, packages/core/src/application/bindings/work/upgrade.mjs, packages/work/src/archive.mjs, packages/work/src/commands/archive.mjs, packages/work/src/commands/insert-chore.mjs, packages/work/src/commands/insert-milestone.mjs, packages/work/src/commands/insert-story.mjs, packages/work/src/commands/insert-uat.mjs, packages/work/src/commands/migrate-folder.mjs, packages/work/src/commands/promote-finding-to-chore.mjs, packages/work/src/commands/promote-gap-to-chore.mjs, packages/work/src/commands/promote.mjs, packages/work/src/commands/prototype.mjs, packages/work/src/commands/renumber.mjs, packages/work/src/insertion/scaffold.mjs, packages/work/src/promote/candidates.mjs, packages/work/src/promote/chore-seed.mjs, packages/work/src/promote/promotion.mjs, packages/work/src/reindex.mjs, packages/work/src/renumber.mjs, packages/work/src/store/file-placement.mjs, packages/work/src/store/file-store.mjs, packages/work/src/stream-transitions.mjs, packages/work/src/upgrade.mjs, test/work/stream/work-insert-atomic-preflight.test.mjs, test/work/stream/work-promote-mints-the-number.test.mjs, test/work/stream/work-renumber.test.mjs, test/work/stream/work-upgrade-idempotent.test.mjs]
---
# 03 · Promotion, insertion and moves preserve the work stream

## User story

As a maintainer, I want identity-changing verbs to operate on the selected store so that numbering, dependencies, documents and evidence stay together.

## Tasks

- [ ] `tasks/00_place.feature` — Placement preserves number spaces and dependency targets.
- [ ] `tasks/01_moves.feature` — Archive and renumber preserve identity and evidence.
- [ ] `tasks/02_other-writers.feature` — Other managed-item writers preserve existing identities.
