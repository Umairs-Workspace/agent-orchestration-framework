---
type: story
number: 05
slug: memory-status-reports-conformance-and-layers
title: "Memory status reports conformance and layers — every record type with its layer, the blank and non-enum counts on both backends, and tags in the block"
parent: 148
status: not-started
owner: product-owner
created: 2026-10-04
updated: 2026-10-04
schema: 1
aofVersion: 0.1.0
depends: [02]
adrs: [ADR-004, ADR-003]
reads:
  - wiki/work/148_milestone_memory-corpus-holds-its-vocabulary/SPEC.md
  - wiki/work/148_milestone_memory-corpus-holds-its-vocabulary/ARCHITECTURE.md#ADR-004
  - wiki/work/148_milestone_memory-corpus-holds-its-vocabulary/ARCHITECTURE.md#ADR-003
  - wiki/planning/research/RESEARCH-agent-memory-procedure.md
  - packages/work/src/memory-vocabulary.mjs
  - packages/knowledge/src/memory/local-indexing.mjs
  - packages/knowledge/src/memory/graphify-backend.mjs
  - packages/knowledge/src/memory/local-backend.mjs
  - packages/knowledge/src/memory/none-backend.mjs
  - packages/core/src/application/bindings/work/memory.mjs
  - packages/core/src/application/bindings/commands/work/memory.mjs
  - test/arch/memory/acd-memory-backend-interface.test.mjs
  - packages/knowledge/test/memory-hooks-inert.suite.mjs
  - packages/knowledge/test/graphify-posture.suite.mjs
files:
  - packages/knowledge/src/memory.mjs
  - packages/knowledge/src/memory/local-retrieval.mjs
  - packages/knowledge/src/commands/memory.mjs
  - packages/knowledge/test/memory-recall-block.suite.mjs
  - test/memory/memory-status.test.mjs
  - test/memory/index.mjs
  - test/memory/memory-integration.test.mjs
  - test/arch/memory/acd-memory-layer-map-total.test.mjs
  - test/arch/memory/index.mjs
---
# 05 · Memory status reports conformance and layers

## User story

As **the operator asking what aof remembers**,
I want **`aof work memory status` to name every record type with the layer it serves (episodic,
semantic or procedural) and to report how many lessons and gaps carry a blank or non-enum value**,
so that **the vocabulary ratchet is visible as a number I can watch fall, and no record type
goes unreported on either backend, as gaps and capabilities do on graphify today**. And an
agent reading a `--block` sees each record's tags (`recurring`, `caught at review`) beside it.

What lands (ADR-004): `RECORD_TYPE_LAYERS` beside `MEMORY_RECORD_FIELDS`, the one partition of
record types, which `episodic-memory-is-recallable` extends rather than duplicates. The seam
composes `status` the way it composes `brief`: the backend's facts, plus `types`, `layers` and
`conformance` over every record. The block line inserts a record's tags before its source, and an
untagged line is unchanged (ADR-003). FF-14803 holds that every
emitted type has a layer and that the counts sum to `recordCount` on both backends.

## Tasks

- [ ] 00 [status accounts for every record by type and layer](tasks/00_status-accounts-for-every-record-by-type-and-layer.feature)
- [ ] 01 [status reports blank and non-enum counts, and the block shows tags](tasks/01_status-reports-blank-and-non-enum-counts-and-the-block-shows-tags.feature)

## Notes

- `test/memory/memory-integration.test.mjs:88-95` sums **every top-level numeric key** of `status`
  against `recordCount`. New numbers go inside objects (`types`, `layers`, `conformance`, `index`),
  never as new top-level numbers, or that row goes red for the wrong reason. Story 02's `index`
  block is already nested for the same reason.
- The none backend reports `{ backend: "none", recordCount: 0 }` and has no records. The composed
  status over it is all zeros, not a throw.
