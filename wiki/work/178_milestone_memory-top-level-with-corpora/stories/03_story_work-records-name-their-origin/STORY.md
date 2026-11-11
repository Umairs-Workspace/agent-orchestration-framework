---
type: story
number: 03
slug: work-records-name-their-origin
title: "A recalled work record names the planning document its item came from"
parent: 178
status: done
owner: product-owner
created: 2026-10-29
updated: 2026-10-29
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/178_milestone_memory-top-level-with-corpora/ARCHITECTURE.md#adr-002, packages/work/src/ref-scope.mjs, packages/work/src/records.mjs, packages/knowledge/src/memory/episodic-indexing.mjs, packages/knowledge/src/memory/claude-auto-memory.mjs, packages/core/src/application/bindings/memory/local-indexing.mjs, test/memory/import-into-memory.test.mjs, test/memory/import-digest.test.mjs, test/memory/memory-status.test.mjs]
files: [packages/knowledge/src/memory/local-indexing.mjs, packages/knowledge/src/memory/local-retrieval.mjs, packages/knowledge/src/memory/graphify-backend.mjs, packages/knowledge/src/memory.mjs, packages/knowledge/test/memory-recall-block.suite.mjs, packages/knowledge/test/memory-record-origin.suite.mjs, packages/knowledge/test/index.mjs, test/memory/memory-indexing.test.mjs, test/arch/run/acd-outcome-record-frozen-shape.test.mjs, test/arch/memory/acd-record-origin-resolves.test.mjs, test/arch/memory/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs, packages/knowledge/test/memory-meta-normalised.suite.mjs, test/integration/features/memory-episodic-records.feature, test/graph/graphify-reranking.test.mjs, test/arch/graph/acd-graphify-records-from-parsers.test.mjs, packages/knowledge/test/memory-backend-config.suite.mjs, packages/knowledge/src/memory/episodic-indexing.mjs, packages/knowledge/src/memory/claude-auto-memory.mjs, test/memory/import-recovery.test.mjs, test/arch/memory/acd-import-artifact-shape.test.mjs, test/arch/memory/acd-memory-aof-digest.test.mjs, test/run/outcome-index-any-item.test.mjs, test/integration/steps/memory-auto-source.steps.mjs, test/arch/command/acd-declared-id-single-home.test.mjs, test/command/declared-id.test.mjs, test/arch/memory/acd-memory-index-location.test.mjs, test/command/work-memory-command.test.mjs]
---
# 03 · A recalled work record names the planning document its item came from

## User story

As an agent refining or building a work item,
I want a recalled lesson or ADR to name the PRD its milestone was framed from,
so that I can open the planning decision behind a record without searching for it, while recall
keeps searching only the work stream.

## Tasks

- [x] `tasks/00_work-records-carry-their-resolved-origin.feature` — every work record carries its item's resolved origin; unresolved values are dropped and counted (FF-17803)
- [x] `tasks/01_recall-shows-origin-and-never-scores-it.feature` — block, text and JSON show origin, ranking is untouched, and the index version moves 3 → 4

## Notes

- 178/ADR-002: `origin` is a resolved, project-root-relative path list. A story inherits its
  top-level driver's. Values are tried root-relative, then doc-relative. Unresolved values are
  dropped and counted in `status` as `origin.unresolved`. It is shown and never scored.
- `INDEX_VERSION` and `GRAPHIFY_INDEX_VERSION` move 3 → 4 in lockstep. A version-3 store reports
  stale until an ingest.
- A record with `origin: []` renders its block line byte for byte as before.
- It shares `packages/knowledge/src/memory.mjs` with 01 (the usage line versus `renderRecallBlock`),
  so the two serialise on that file.
- FF-17803 lands here.
- Ratified while authoring this contract (STATE, 2026-10-29): a third resolution candidate, the
  doc's folder as it stood at the work root before archiving. Every doc-relative `origin:` in the
  live stream is on an archived item. Without it 49 of 85 values drop; with it 6 drop, all naming
  `RESEARCH-agent-loop-economics.md`, which has since moved to `wiki/planning/research/`.
- New files move the `packages/knowledge/test` and `test/arch/memory` budget rows (allowance 0).
- The version bump reaches suites that pin version 3 (`memory-meta-normalised`, the episodic
  integration feature) and fixtures run through recall (`graphify-reranking`,
  `acd-graphify-records-from-parsers`, `memory-backend-config`), so they are in `files:`.
