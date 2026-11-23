---
type: story
number: 00
slug: portable-fixture
title: "One portable fixture exposes stream and CLI drift"
parent: 205
depends: []
status: done
owner: product-owner
created: 2026-11-22
updated: 2026-11-23
schema: 1
aofVersion: 0.1.0
adrs: [ADR-001, ADR-002, ADR-003]
reads: [wiki/work/205_milestone_work-verb-goldens/ARCHITECTURE.md#ADR-001, wiki/work/205_milestone_work-verb-goldens/ARCHITECTURE.md#ADR-002, wiki/work/205_milestone_work-verb-goldens/ARCHITECTURE.md#ADR-003, wiki/work/205_milestone_work-verb-goldens/stories/00_story_portable-fixture/EXAMPLES.md, wiki/work/205_milestone_work-verb-goldens/RESEARCH.md, test/support/golden/harness.mjs, test/support/golden/baseline-store.mjs, scripts/golden.mjs, test/support/cli-spawn.mjs, test/support/golden/normalise.mjs, test/golden/assets-clean.lane.mjs, test/golden/golden-harness.test.mjs, test/arch/testing/acd-golden-baselines-written-by-the-script.test.mjs, packages/work/src/identity.mjs, packages/work/src/lifecycle.mjs, packages/work/src/insertion/scaffold.mjs, .aof/templates/work/milestone/SPEC.md, .aof/templates/work/milestone/STATE.md, .aof/templates/work/story/STORY.md, .aof/templates/work/chore/CHORE.md, .aof/templates/work/uat/SESSION.md, .aof/templates/work/uat/STATE.md, scripts/test.mjs, test/golden/work-init.test.mjs, test/arch/testing/index.mjs]
files: [test/arch/testing/acd-source-directory-budget.test.mjs, test/arch/work/acd-work-stream-golden-boundary.test.mjs, test/arch/work/index.mjs, test/golden/baselines/work-stream-fixture/, test/golden/fixtures/work-stream/clock.mjs, test/golden/fixtures/work-stream/file-adapter.mjs, test/golden/fixtures/work-stream/run-case.mjs, test/golden/fixtures/work-stream/seed.json, test/golden/fixtures/work-stream/work-stream-fixture.cases.json, test/golden/index.mjs, test/golden/work-stream.lane.mjs, test/golden/work-stream.test.mjs, test/support/golden/lanes.mjs]
---
# 00 · One portable fixture exposes stream and CLI drift

## User story

As a maintainer preparing to change how work is stored, I want one reproducible stream and one way to observe a real CLI invocation so that I can replay the same cases against another store.

## Tasks

- [x] `tasks/00_fixture-shapes.feature` — The same logical seed exposes every supported work shape.
- [x] `tasks/01_repeatable-and-sensitive.feature` — A comparison detects the smallest observable drift and can be replayed.
