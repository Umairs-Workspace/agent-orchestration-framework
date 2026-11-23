---
type: story
number: 02
slug: placement
title: "Promotion and insertion preserve the complete stream delta"
parent: 205
depends: [00]
status: done
owner: product-owner
created: 2026-11-22
updated: 2026-11-23
schema: 1
aofVersion: 0.1.0
adrs: [ADR-001, ADR-002, ADR-003]
reads: [wiki/work/205_milestone_work-verb-goldens/ARCHITECTURE.md#ADR-001, wiki/work/205_milestone_work-verb-goldens/ARCHITECTURE.md#ADR-002, wiki/work/205_milestone_work-verb-goldens/ARCHITECTURE.md#ADR-003, wiki/work/205_milestone_work-verb-goldens/stories/02_story_placement/EXAMPLES.md, wiki/work/205_milestone_work-verb-goldens/RESEARCH.md, test/support/golden/harness.mjs, test/support/golden/baseline-store.mjs, scripts/golden.mjs, test/golden/fixtures/work-stream/seed.json, test/golden/fixtures/work-stream/work-stream-fixture.cases.json, test/golden/work-stream.lane.mjs, test/golden/work-stream.test.mjs, packages/work/src/commands/promote.mjs, packages/work/src/commands/insert-milestone.mjs, packages/work/src/commands/insert-uat.mjs, packages/work/src/commands/insert-story.mjs, packages/work/src/commands/insert-chore.mjs, packages/work/src/insertion/scaffold.mjs, packages/work/src/promote/candidates.mjs, packages/work/src/reindex.mjs, test/work/stream/work-insert-count-gate.test.mjs, test/work/stream/work-insert-story-checklist.test.mjs, test/work/stream/work-promote-mints-the-number.test.mjs, test/golden/fixtures/work-stream/file-adapter.mjs, test/golden/fixtures/work-stream/run-case.mjs, test/golden/baselines/work-stream-fixture/]
files: [test/golden/baselines/work-stream-place/, test/golden/fixtures/work-stream/work-stream-place.cases.json]
---
# 02 · Promotion and insertion preserve the complete stream delta

## User story

As an operator organising the backlog, I want placement changes and refusals captured so that stories, numbers and dependent work keep their meaning through a storage change.

## Tasks

- [x] `tasks/00_backlog-promotion.feature` — Promotion mints a tail number or opens the requested slot.
- [x] `tasks/01_four-insert-verbs.feature` — All four insert verbs record their complete stream changes.
