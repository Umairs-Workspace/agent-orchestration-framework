---
type: story
number: 03
slug: the-record-corpora-sit-behind-the-port
title: "The record corpora sit behind the port, and aof memory answers byte for byte as it does today"
parent: 179
status: done
owner: product-owner
created: 2026-10-30
updated: 2026-10-30
schema: 1
aofVersion: 0.1.0
depends: [01]
reads: [wiki/work/179_milestone_memory-engine-port/ARCHITECTURE.md#adr-001, wiki/work/179_milestone_memory-engine-port/ARCHITECTURE.md#adr-003, packages/knowledge/src/engine.mjs, packages/knowledge/src/commands/memory.mjs, packages/knowledge/src/memory/local-retrieval.mjs, packages/knowledge/src/memory/local-indexing.mjs, packages/knowledge/src/memory/claude-auto-memory.mjs, packages/knowledge/src/memory/recurrence.mjs, packages/core/src/application/bindings/work/memory.mjs, packages/core/src/application/bindings/commands/work/memory.mjs, packages/core/src/application/bindings/memory/local-backend.mjs, packages/core/src/application/bindings/memory/graphify-backend.mjs, packages/knowledge/test/memory-effectiveness.suite.mjs, packages/knowledge/test/memory-recurrence.suite.mjs, packages/knowledge/test/memory-record-origin.suite.mjs, test/graph/graphify-recall.test.mjs, test/graph/graphify-degrade.test.mjs]
files: [packages/knowledge/src/memory.mjs, packages/knowledge/src/memory/local-backend.mjs, packages/knowledge/src/memory/none-backend.mjs, packages/knowledge/src/memory/graphify-backend.mjs, test/arch/memory/acd-memory-backend-interface.test.mjs, test/arch/memory/acd-memory-recall-contract.test.mjs, test/arch/memory/acd-memory-layer-map-total.test.mjs, test/arch/graph/acd-graphify-backend-selection.test.mjs, test/graph/graphify-backend-selection.test.mjs, test/work/lifecycle/work-memory-seam.test.mjs, test/command/work-memory-command.test.mjs, test/command/declared-id.test.mjs, test/arch/command/acd-work-memory-routed.test.mjs, test/memory/memory-integration.test.mjs, test/memory/memory-status.test.mjs, packages/knowledge/test/gap-carries-discharge.suite.mjs]
---
# 03 · The record corpora sit behind the port, and aof memory answers byte for byte as it does today

## User story

As an agent that pastes `aof memory recall --block` into its context and parses `--json`,
I want every memory verb to answer exactly what it answers today, now through the port,
so that memory has one seam a future engine plugs into, and nothing an agent reads or a hook parses
moves while that happens.

## Tasks

- [x] `tasks/00_every-record-backend-declares-the-record-corpora.feature` — every registry backend exports `{ name, corpora, recall, reindex, status }` and declares work, operator and imports, never code (FF-17902)
- [x] `tasks/01_memory-verbs-dispatch-through-the-port.feature` — recall, recurrence, ingest, reindex and status go through the port; both doors answer the same bytes as before; records never come from an engine

## Notes

- 179/ADR-003. `executeMemoryVerb` composes `createKnowledgeEngine({ backends: [backend] })` over the
  resolved backend and dispatches through it. `record-recall` still resolves no backend.
- Every record backend spreads `RECORD_CORPORA` from `engine.mjs` (01). `none` declares it too:
  memory off is "served, empty", never `corpus-unserved`.
- The graphify memory backend gains its `corpora` line and nothing else. Its work-stream graph is not
  a corpus (ADR-003). If `retire-graphify-memory-backend` has landed first, there is one fewer
  backend to declare and these tasks hold unchanged. They name "every registry backend", never
  graphify by name.
- Hand-rolled stub backends in the in-process harnesses gain `corpora: RECORD_CORPORA`, one line
  each. Their assertions do not change, and that unchanged set is the proof the refactor preserves
  behaviour. The harnesses that inject a REAL backend through `resolveConfiguredBackend` need no edit.
  The three exact-key asserts (`acd-memory-backend-interface`, both `graphify-backend-selection`
  files) widen by `corpora`.
- FF-17902 is the amended `acd-memory-backend-interface`, never deleted.
- Runs beside 02 with no shared file. Adds no file, so no budget row moves.
