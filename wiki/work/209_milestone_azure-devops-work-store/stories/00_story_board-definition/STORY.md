---
type: story
number: 00
slug: board-definition
title: "A project selects a validated board definition"
parent: 209
depends: []
status: in-review
owner: product-owner
created: 2026-11-24
updated: 2026-11-25
schema: 1
aofVersion: 0.1.0
adrs: [ADR-001]
reads: [wiki/work/209_milestone_azure-devops-work-store/ARCHITECTURE.md#ADR-001, packages/work/src/store/work-item-store.mjs, packages/work/src/store/file-store.mjs, packages/core/src/application/bindings/work.mjs, packages/core/src/application/workspace.mjs, test/arch/work/acd-work-item-store-boundary.test.mjs, packages/work/package.json, packages/work/test/work-item-store.suite.mjs]
files: [packages/work/src/store/work-board.schema.json, scripts/workspace-runtime-audit.json, test/bundle/site-build.test.mjs, packages/work/src/store/work-item-store.mjs, packages/work/src/store/board-definition.mjs, packages/work/src/store/board-store.mjs, schemas/aof.schema.json, schemas/work-board.schema.json, packages/work/test/work-item-store.suite.mjs, packages/work/package.json, yarn.lock, test/bundle/yarn-installation.test.mjs, test/arch/work/acd-board-provider-boundary.test.mjs, test/arch/work/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs]
---
# 00 · A project selects a validated board definition

## User story

As a project maintainer, I want to select a board definition and supply its adapter inside my checkout so that my team can add its tracker without a framework release.

## Notes

Own the schema, workspace selection, lazy adapter loader and typed operation bindings. Exercise the public read path with a second project's minimal adapter, including configuration refusals and disabled attachment support. Leave workflow mutations to the publication story.

## Tasks

- [x] [workspace selection](tasks/00_workspace-selection.feature)
- [x] [definition validation](tasks/01_definition-validation.feature)
- [x] [project operations](tasks/02_project-operations.feature)
