---
type: story
number: 05
slug: enforce-and-replay
title: "A registered control guards tracking and every 205 capture still matches"
parent: 208
depends: [01, 02, 03, 04]
status: not-started
owner: product-owner
created: 2026-11-23
updated: 2026-11-23
schema: 1
aofVersion: 0.1.0
adrs: [ADR-001, ADR-002, ADR-003, ADR-004]
reads: [wiki/work/208_milestone_work-item-store-seam/ARCHITECTURE.md#ADR-001, wiki/work/208_milestone_work-item-store-seam/ARCHITECTURE.md#ADR-002, wiki/work/208_milestone_work-item-store-seam/ARCHITECTURE.md#ADR-003, wiki/work/208_milestone_work-item-store-seam/ARCHITECTURE.md#ADR-004, wiki/work/208_milestone_work-item-store-seam/RESEARCH.md, wiki/work/208_milestone_work-item-store-seam/stories/05_story_enforce-and-replay/EXAMPLES.md, packages/work/src/store/work-item-store.mjs, packages/work/src/store/file-store.mjs, packages/work/src/store/file-lifecycle.mjs, packages/work/src/store/file-placement.mjs, packages/work/src/read.mjs, packages/mesh/src/publisher.mjs, packages/mesh/src/launcher.mjs, test/arch/work/acd-work-stream-golden-boundary.test.mjs, test/arch/mesh/acd-one-work-tree-walker.test.mjs, test/store/cache-read-seam.test.mjs, test/support/golden/harness.mjs, scripts/golden.mjs, test/golden/work-stream.lane.mjs, test/golden/fixtures/work-stream/seed.json, wiki/work/205_milestone_work-verb-goldens/OUTCOME.md, test/support/golden/lanes.mjs, test/support/golden/baseline-store.mjs, test/arch/work/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs, test/golden/work-stream.test.mjs, test/golden/fixtures/work-stream/file-adapter.mjs, test/golden/fixtures/work-stream/run-case.mjs]
files: [test/arch/testing/acd-source-directory-budget.test.mjs, test/arch/work/acd-work-item-store-boundary.test.mjs, test/arch/work/index.mjs, test/golden/fixtures/work-stream/file-adapter.mjs, test/golden/fixtures/work-stream/run-case.mjs, test/golden/work-stream.test.mjs]
---
# 05 · A registered control guards tracking and every 205 capture still matches

## User story

As a reviewer, I want new tracking bypasses to fail the normal suite and the accepted verb captures to replay unchanged so that future providers have an enforceable contract.

## Tasks

- [ ] `tasks/00_regression.feature` — The accepted stream captures replay through the selected provider.
