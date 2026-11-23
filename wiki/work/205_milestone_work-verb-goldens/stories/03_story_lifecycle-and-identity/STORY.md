---
type: story
number: 03
slug: lifecycle-and-identity
title: "Archive, status and renumber preserve mutations and refusals"
parent: 205
depends: [00]
status: done
owner: product-owner
created: 2026-11-22
updated: 2026-11-23
schema: 1
aofVersion: 0.1.0
adrs: [ADR-001, ADR-002, ADR-003]
reads: [wiki/work/205_milestone_work-verb-goldens/ARCHITECTURE.md#ADR-001, wiki/work/205_milestone_work-verb-goldens/ARCHITECTURE.md#ADR-002, wiki/work/205_milestone_work-verb-goldens/ARCHITECTURE.md#ADR-003, wiki/work/205_milestone_work-verb-goldens/stories/03_story_lifecycle-and-identity/EXAMPLES.md, wiki/work/205_milestone_work-verb-goldens/RESEARCH.md, test/support/golden/harness.mjs, test/support/golden/baseline-store.mjs, scripts/golden.mjs, test/golden/fixtures/work-stream/seed.json, test/golden/fixtures/work-stream/work-stream-fixture.cases.json, test/golden/work-stream.lane.mjs, test/golden/work-stream.test.mjs, packages/work/src/commands/archive.mjs, packages/work/src/commands/item-status.mjs, packages/work/src/commands/renumber.mjs, packages/work/src/lifecycle.mjs, packages/work/src/records.mjs, packages/work/src/renumber.mjs, test/work/stream/work-archive-is-a-move.test.mjs, test/work/stream/work-renumber.test.mjs, test/golden/fixtures/work-stream/file-adapter.mjs, test/golden/fixtures/work-stream/run-case.mjs, test/golden/baselines/work-stream-fixture/]
files: [test/golden/fixtures/work-stream/file-adapter.mjs, test/golden/work-stream.test.mjs, test/golden/fixtures/work-stream/run-case.mjs, test/golden/baselines/work-stream-life/, test/golden/fixtures/work-stream/work-stream-life.cases.json]
---
# 03 · Archive, status and renumber preserve mutations and refusals

## User story

As an operator maintaining numbered work, I want the exact effects of archiving, moving status and renumbering held to baselines so that links and records remain compatible after a storage change.

## Tasks

- [x] `tasks/00_archive.feature` — Archiving preserves item identity and the links that cross its move.
- [x] `tasks/01_status.feature` — Status moves follow the lifecycle of the requested item.
- [x] `tasks/02_renumber.feature` — Renumbering preserves the observed changes in each number space.
