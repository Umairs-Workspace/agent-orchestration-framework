---
type: story
number: 00
slug: workspace-store
title: "A workspace selects the file store and exposes its tracking data"
parent: 208
depends: []
status: not-started
owner: product-owner
created: 2026-11-23
updated: 2026-11-23
schema: 1
aofVersion: 0.1.0
adrs: [ADR-001, ADR-003]
reads: [wiki/work/208_milestone_work-item-store-seam/ARCHITECTURE.md#ADR-001, wiki/work/208_milestone_work-item-store-seam/ARCHITECTURE.md#ADR-003, wiki/work/208_milestone_work-item-store-seam/RESEARCH.md, wiki/work/208_milestone_work-item-store-seam/stories/00_story_workspace-store/EXAMPLES.md, packages/core/src/workspace.mjs, packages/work/src/discovery.mjs, packages/work/src/records.mjs, packages/work/src/identity.mjs, packages/work/src/item-row.mjs, packages/work/test/discovery.test.mjs, packages/work/test/records.test.mjs, test/golden/fixtures/work-stream/seed.json, packages/work/test/support/work-services.mjs, packages/core/test/application.test.mjs, packages/core/src/application/bindings/work.mjs, packages/core/src/application/workspace.mjs, packages/work/package.json, schemas/aof.schema.json, packages/work/test/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs]
files: [packages/core/src/application/bindings/work.mjs, packages/core/src/application/workspace.mjs, packages/work/package.json, packages/work/src/store/file-store.mjs, packages/work/src/store/work-item-store.mjs, packages/work/test/index.mjs, packages/work/test/work-item-store.suite.mjs, schemas/aof.schema.json, test/arch/testing/acd-source-directory-budget.test.mjs]
---
# 00 · A workspace selects the file store and exposes its tracking data

## User story

As a workspace maintainer, I want existing projects to load through a named store so that introducing the interface requires no configuration migration.

## Tasks

- [ ] `tasks/00_selection.feature` — Workspace configuration selects a tracking provider.
- [ ] `tasks/01_portable-rows.feature` — A snapshot exposes item facts independently of folder parsing.
