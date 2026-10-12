---
type: story
number: 01
slug: recall-operator-auto-memory
title: "Recall the operator's local auto-memory beside work-stream lessons"
parent: 159
status: not-started
owner: product-owner
created: 2026-10-12
updated: 2026-10-12
schema: 1
aofVersion: 0.1.0
# Refine replaces these empty inline lists. A named document section is path#anchor.
reads: [wiki/work/159_milestone_operator-auto-memory-source/ARCHITECTURE.md#adr-001-compose-an-opt-in-source-at-the-common-record-builder, wiki/work/159_milestone_operator-auto-memory-source/ARCHITECTURE.md#adr-002-preserve-procedural-content-without-inventing-source-metadata, wiki/work/159_milestone_operator-auto-memory-source/ARCHITECTURE.md#adr-003-external-source-resolution-is-a-constrained-read-capability, wiki/work/159_milestone_operator-auto-memory-source/RESEARCH.md, packages/work/src/memory-vocabulary.mjs, packages/work/src/observe.mjs, packages/knowledge/src/memory.mjs, packages/knowledge/src/memory/local-backend.mjs, packages/knowledge/src/memory/graphify-backend.mjs, packages/knowledge/src/memory/local-retrieval.mjs, packages/knowledge/test/memory-backend-config.suite.mjs, packages/core/src/aof-gitignore.mjs, test/arch/memory/acd-memory-index-never-on-mesh.test.mjs, test/arch/memory/acd-memory-derived-index.test.mjs, test/arch/memory/acd-memory-retrieval-eval.test.mjs, test/integration/steps/memory-episodic-records.steps.mjs, scripts/test.mjs, test/integration/README.md, test/integration/cli.mjs, test/integration/support/feature-runner.mjs, test/integration/support/step-registry.mjs, test/integration/support/common-steps.mjs, test/integration/support/work-stream-fixture.mjs, test/integration/support/cli-context.mjs]
files: [schemas/aof.schema.json, packages/knowledge/src/memory/claude-auto-memory.mjs, packages/knowledge/src/memory/local-indexing.mjs, packages/core/src/application/bindings/memory/local-indexing.mjs, packages/knowledge/test/claude-auto-memory.suite.mjs, packages/knowledge/test/index.mjs, test/memory/memory-indexing.test.mjs, test/arch/memory/acd-auto-memory-source.test.mjs, test/arch/memory/index.mjs, test/integration/features/memory-auto-source.feature, test/integration/steps/memory-auto-source.steps.mjs, wiki/memory.md]
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 01 · Recall Operator Auto Memory

## User story

As the operator using recall on the node that holds my Claude auto-memory,
I want to opt in to its feedback and project entries alongside repository lessons,
so that reasons and instructions I already recorded can inform the next decision.

<!-- The "so that" must be a real benefit, not a reworded want. A standalone story's scope is its
     user story + its tasks; a milestone-bound story also serves the milestone Objective. -->

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [ ] `tasks/00_opt-in-local-source.feature` — opt-in configuration, backend parity and local discovery.
- [ ] `tasks/01_map-procedural-entries.feature` — measured entry grammar, content, provenance and diagnostics.
- [ ] `tasks/02_hold-the-kind-policy.feature` — operator-approved kind mapping and existing scope/status behavior.
- [ ] `tasks/03_recall-and-rebuild.feature` — separate sources, lifecycle, live comparison and operator documentation.

## Notes

Dependency 148 is done. One vertical slice; no sibling dependencies. The source
remains authoritative. No copied corpus, source edits, deduplication, worker access
or UI. The ownership proposal was derived with the fresh graph unavailable, then
conventional test guesses were replaced by registered lanes (RESEARCH.md).

Q1 is answered: both types map to near-miss with the source type preserved in tags.
E7/E8 carry that answer; other examples remain proposed. The pre-formulation doctor
passed with zero errors. PO headlines, QA edge tables and developer feasibility
were completed inline in one authoring beat. The integration runner expands task
outlines into explicit scenarios; it must cover every executable case, not only E ids.
FF-15901 through FF-15903 own the structural negative probes in ARCHITECTURE.md.
The two manual scenarios are agent-runnable. No human-only UAT lane is required
for this CLI adapter; the product decision already has the operator's recorded answer.

<!-- Anything story-specific not covered by the milestone docs. Keep light. -->
