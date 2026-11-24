---
type: story
number: 04
slug: mesh-observation
title: "Mesh refresh and publication observe the selected store"
parent: 208
depends: [00]
status: done
owner: product-owner
created: 2026-11-23
updated: 2026-11-24
schema: 1
aofVersion: 0.1.0
adrs: [ADR-001, ADR-003]
reads: [packages/work/src/records.mjs, test/arch/work/acd-work-items-single-writer.test.mjs, wiki/work/208_milestone_work-item-store-seam/ARCHITECTURE.md#ADR-001, wiki/work/208_milestone_work-item-store-seam/ARCHITECTURE.md#ADR-003, wiki/work/208_milestone_work-item-store-seam/RESEARCH.md, wiki/work/208_milestone_work-item-store-seam/stories/04_story_mesh-observation/EXAMPLES.md, packages/work/src/store/work-item-store.mjs, packages/work/src/store/file-store.mjs, packages/work/src/discovery.mjs, packages/work/src/item-row.mjs, test/store/cache-authority-own-disk-read.test.mjs, test/store/sync-local-change-owed.test.mjs, test/arch/store/acd-store-never-writes-records.test.mjs, test/arch/store/acd-global-publisher-single-seam.test.mjs, packages/mesh/test/support/mesh-services.mjs, packages/mesh/src/publisher.mjs, packages/mesh/src/launcher.mjs, packages/mesh/src/projection-store.mjs, packages/core/src/application/bindings/global-work-publisher.mjs, packages/core/src/application/bindings/global-work-store.mjs, packages/core/src/application/bindings/mesh/launcher.mjs, packages/core/src/application/assemble.mjs, packages/mesh/test/projections.test.mjs, test/store/global-work-store.test.mjs, test/store/global-work-propagation.test.mjs, test/arch/mesh/acd-one-work-tree-walker.test.mjs, packages/mesh/src/effects.mjs, test/mesh/launcher/mesh-launcher-syncs-every-workspace.test.mjs, packages/work/test/work-item-store.suite.mjs, test/bundle/yarn-installation.test.mjs, test/arch/store/acd-cache-read-surface-boundary.test.mjs]
files: [packages/core/src/application/assemble.mjs, packages/core/src/application/bindings/global-work-publisher.mjs, packages/core/src/application/bindings/global-work-store.mjs, packages/core/src/application/bindings/mesh/launcher.mjs, packages/mesh/src/launcher.mjs, packages/mesh/src/projection-store.mjs, packages/mesh/src/publisher.mjs, packages/mesh/test/projections.test.mjs, test/arch/mesh/acd-one-work-tree-walker.test.mjs, test/store/global-work-propagation.test.mjs, test/store/global-work-store.test.mjs, packages/work/src/store/work-item-store.mjs, packages/work/src/store/file-store.mjs, packages/mesh/src/effects.mjs, test/mesh/launcher/mesh-launcher-syncs-every-workspace.test.mjs, packages/work/test/work-item-store.suite.mjs, test/bundle/yarn-installation.test.mjs, test/arch/store/acd-cache-read-surface-boundary.test.mjs]
---
# 04 · Mesh refresh and publication observe the selected store

## User story

As an operator with several workspaces, I want each workspace to publish changes reported by its store while preserving the existing mesh cache and idle behavior.

## Tasks

- [x] `tasks/00_publication.feature` — Projection refresh uses the workspace tracking source.
- [x] `tasks/01_observation.feature` — Observation works across change mechanisms and workspace lifetimes.
