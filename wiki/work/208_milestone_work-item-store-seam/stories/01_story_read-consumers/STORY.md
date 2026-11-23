---
type: story
number: 01
slug: read-consumers
title: "Readers retain the same answers and source attribution"
parent: 208
depends: [00]
status: not-started
owner: product-owner
created: 2026-11-23
updated: 2026-11-23
schema: 1
aofVersion: 0.1.0
adrs: [ADR-001, ADR-003]
reads: [wiki/work/208_milestone_work-item-store-seam/ARCHITECTURE.md#ADR-001, wiki/work/208_milestone_work-item-store-seam/ARCHITECTURE.md#ADR-003, wiki/work/208_milestone_work-item-store-seam/RESEARCH.md, wiki/work/208_milestone_work-item-store-seam/stories/01_story_read-consumers/EXAMPLES.md, packages/work/src/store/work-item-store.mjs, packages/work/src/store/file-store.mjs, packages/work/test/read.test.mjs, test/store/cache-read-own-records-from-disk.test.mjs, test/golden/work-stream.test.mjs, test/golden/fixtures/work-stream/work-stream-read.cases.json, packages/work/test/command-faces.test.mjs, test/store/cache-read-doctor-overlay.test.mjs, packages/work/src/read.mjs, packages/work/src/readiness.mjs, packages/work/src/ready-wave.mjs, packages/work/src/commands/resolve.mjs, packages/work/src/commands/list.mjs, packages/work/src/commands/find.mjs, packages/work/src/commands/next.mjs, packages/work/src/commands/doc.mjs, packages/work/src/commands/doctor.mjs, packages/work/src/commands/validate.mjs, packages/work/src/commands/counters.mjs, packages/work/src/commands/audit.mjs, packages/work/src/content-read.mjs, packages/work/src/validation.mjs, packages/work/src/doctor/index.mjs, packages/work/src/doctor/lesson-meta.mjs, packages/work/src/integration-routing.mjs, packages/work/src/observe.mjs, packages/work/src/memory-accounting.mjs, packages/work/src/tune/corpus.mjs, packages/diagrams/src/commands/plan.mjs, packages/core/src/application/bindings/work/read.mjs, packages/core/src/application/bindings/work/doctor.mjs, packages/core/src/application/bindings/commands/next.mjs, packages/core/src/application/bindings/commands/diagram/plan.mjs, packages/core/src/application/bindings/commands/validate-shared.mjs, packages/core/src/application/assemble.mjs, test/store/cache-read-seam.test.mjs, test/arch/store/acd-cache-read-surface-boundary.test.mjs]
files: [packages/core/src/application/assemble.mjs, packages/core/src/application/bindings/commands/diagram/plan.mjs, packages/core/src/application/bindings/commands/next.mjs, packages/core/src/application/bindings/commands/validate-shared.mjs, packages/core/src/application/bindings/work/doctor.mjs, packages/core/src/application/bindings/work/read.mjs, packages/diagrams/src/commands/plan.mjs, packages/work/src/commands/audit.mjs, packages/work/src/commands/counters.mjs, packages/work/src/commands/doc.mjs, packages/work/src/commands/doctor.mjs, packages/work/src/commands/find.mjs, packages/work/src/commands/list.mjs, packages/work/src/commands/next.mjs, packages/work/src/commands/resolve.mjs, packages/work/src/commands/validate.mjs, packages/work/src/content-read.mjs, packages/work/src/doctor/index.mjs, packages/work/src/doctor/lesson-meta.mjs, packages/work/src/integration-routing.mjs, packages/work/src/memory-accounting.mjs, packages/work/src/observe.mjs, packages/work/src/read.mjs, packages/work/src/readiness.mjs, packages/work/src/ready-wave.mjs, packages/work/src/tune/corpus.mjs, packages/work/src/validation.mjs, test/arch/store/acd-cache-read-surface-boundary.test.mjs, test/store/cache-read-seam.test.mjs]
---
# 01 · Readers retain the same answers and source attribution

## User story

As an operator, I want work queries and diagnostics to read the selected store so that local, archived and remotely reported items keep their current meaning.

## Tasks

- [ ] `tasks/00_read-answers.feature` — Public reads preserve identity, order and diagnostics.
- [ ] `tasks/01_authority.feature` — Local and projected records keep their provenance.
