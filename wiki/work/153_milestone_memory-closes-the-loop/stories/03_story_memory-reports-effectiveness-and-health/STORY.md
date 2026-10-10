---
type: story
number: 03
slug: memory-reports-effectiveness-and-health
title: "Memory reports effectiveness and health"
parent: 153
status: not-started
owner: product-owner
created: 2026-10-10
updated: 2026-10-10
depends: [153/02]
schema: 1
aofVersion: 0.1.0
reads: ["packages/work/src/memory-accounting.mjs","packages/work/package.json","packages/work/src/doctor/memory-effectiveness.mjs","packages/work/src/doctor/index.mjs","packages/work/src/commands/doctor.mjs","packages/knowledge/src/memory.mjs","packages/knowledge/src/commands/memory.mjs","packages/work/test/memory-accounting.suite.mjs","packages/work/test/memory-effectiveness.suite.mjs","packages/work/test/index.mjs","packages/knowledge/test/memory-effectiveness.suite.mjs","packages/knowledge/test/index.mjs","test/command/work-memory-command.test.mjs","test/integration/features/memory-effectiveness.feature","test/integration/steps/memory-effectiveness.steps.mjs","packages/work/src/feedback-records.mjs","packages/work/src/memory-vocabulary.mjs","packages/work/src/discovery.mjs","packages/work/src/ref-scope.mjs","packages/work/src/doctor/lesson-meta.mjs","packages/work/src/doctor/freshness.mjs","packages/work/src/counters.mjs","packages/knowledge/src/memory/local-indexing.mjs","packages/knowledge/src/memory/local-retrieval.mjs","packages/work/src/commands/validate.mjs","test/arch/loop/acd-loop-record-never-gates.test.mjs","packages/work/src/citation-history.mjs","packages/work/src/doctor/rubric.mjs","packages/work/src/doctor/loop-ready.mjs","packages/foundation/src/fs.mjs","packages/contracts/src/error.mjs","packages/knowledge/src/memory/none-backend.mjs","packages/knowledge/src/graphify-backends.mjs","test/support/cli-spawn.mjs","test/support/source-slice.mjs","test/integration/support/feature-runner.mjs","test/integration/support/cli-context.mjs","test/integration/support/step-registry.mjs","test/integration/support/common-steps.mjs","scripts/test.mjs","scripts/test-unit.mjs","scripts/test-workspace.mjs","wiki/work/153_milestone_memory-closes-the-loop/ARCHITECTURE.md#adr-003-one-read-model-supplies-accounting-and-advisory-health"]
files: ["packages/work/src/memory-accounting.mjs","packages/work/package.json","packages/work/src/doctor/memory-effectiveness.mjs","packages/work/src/doctor/index.mjs","packages/work/src/commands/doctor.mjs","packages/knowledge/src/memory.mjs","packages/knowledge/src/commands/memory.mjs","packages/work/test/memory-accounting.suite.mjs","packages/work/test/memory-effectiveness.suite.mjs","packages/work/test/index.mjs","packages/knowledge/test/memory-effectiveness.suite.mjs","packages/knowledge/test/index.mjs","test/command/work-memory-command.test.mjs","test/integration/features/memory-effectiveness.feature","test/integration/steps/memory-effectiveness.steps.mjs"]
---

# 153/03 · Memory reports effectiveness and health

## User story

As an AOF operator, I want to see how often lessons were surfaced, honoured and repeated, including aged lessons with no promotion, so that I can find lessons whose preventive action needs attention.

## Tasks

- [ ] `tasks/01_account-for-memory-effectiveness.feature` — report per-type and optional per-lesson observations and recurrences
- [ ] `tasks/02_report-recurring-and-unpromoted-lessons.feature` — report advisory recurrence and default age-five promotion warnings

## Notes

Read/write sets were derived then narrowed; see the milestone RESEARCH for the unavailable graph and owning-suite substitutions. No delivered feature is amended. 

The operator answered 153/03 Q1 with the recommended threshold of five later accepted milestones.
E4 is stated from that recorded answer. The example map passed doctor before either task was authored.
