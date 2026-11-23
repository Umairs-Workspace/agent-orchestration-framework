---
type: story
number: 01
slug: read-output
title: "Read verbs preserve their JSON and terminal output"
parent: 205
depends: [00]
status: done
owner: product-owner
created: 2026-11-22
updated: 2026-11-23
schema: 1
aofVersion: 0.1.0
adrs: [ADR-001, ADR-002, ADR-003]
reads: [wiki/work/205_milestone_work-verb-goldens/ARCHITECTURE.md#ADR-001, wiki/work/205_milestone_work-verb-goldens/ARCHITECTURE.md#ADR-002, wiki/work/205_milestone_work-verb-goldens/ARCHITECTURE.md#ADR-003, wiki/work/205_milestone_work-verb-goldens/stories/01_story_read-output/EXAMPLES.md, wiki/work/205_milestone_work-verb-goldens/RESEARCH.md, test/support/golden/harness.mjs, test/support/golden/baseline-store.mjs, scripts/golden.mjs, test/golden/fixtures/work-stream/seed.json, test/golden/fixtures/work-stream/work-stream-fixture.cases.json, test/golden/work-stream.lane.mjs, test/golden/work-stream.test.mjs, packages/work/src/commands/list.mjs, packages/work/src/commands/next.mjs, packages/work/src/commands/find.mjs, packages/work/src/commands/doc.mjs, packages/work/src/commands/validate.mjs, packages/work/src/commands/doctor.mjs, packages/work/src/doctor/index.mjs, packages/work/src/doctor/coherence.mjs, packages/work/src/doctor/freshness.mjs, packages/work/src/doctor/budget.mjs, packages/work/src/doctor/depends.mjs, packages/work/src/doctor/rubric.mjs, packages/work/src/doctor/loop-record.mjs, packages/work/src/doctor/lesson-meta.mjs, packages/work/src/doctor/memory-effectiveness.mjs, packages/work/src/audit/controls.mjs, packages/diagrams/src/doctor-lane.mjs, packages/specification-by-example/src/doctor-lane.mjs, packages/core/src/application/bindings/work/doctor.mjs, test/golden/fixtures/work-stream/file-adapter.mjs, test/golden/fixtures/work-stream/run-case.mjs, test/golden/baselines/work-stream-fixture/]
files: [test/golden/baselines/work-stream-read/, test/golden/fixtures/work-stream/work-stream-read.cases.json]
---
# 01 · Read verbs preserve their JSON and terminal output

## User story

As a CLI consumer, I want the answers to stream queries held in both formats so that a storage migration cannot silently change scripts, ordering or diagnostics.

## Tasks

- [x] `tasks/00_query-output.feature` — The read verbs keep their two output formats and exit codes.
- [x] `tasks/01_ready-and-blocked.feature` — Readiness distinguishes a ready story from unsatisfied dependencies.
- [x] `tasks/02_validation-and-doctor.feature` — Validation and stream diagnostics retain each finding and exit.
