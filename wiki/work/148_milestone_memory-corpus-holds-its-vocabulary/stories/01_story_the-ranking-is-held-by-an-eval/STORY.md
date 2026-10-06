---
type: story
number: 01
slug: the-ranking-is-held-by-an-eval
title: "The ranking is held by an eval — real recall pairs stay in the five-line block as the corpus grows"
parent: 148
status: in-review
owner: product-owner
created: 2026-10-04
updated: 2026-10-05
schema: 1
aofVersion: 0.1.0
adrs: [ADR-005]
reads:
  - wiki/work/148_milestone_memory-corpus-holds-its-vocabulary/SPEC.md
  - wiki/work/148_milestone_memory-corpus-holds-its-vocabulary/ARCHITECTURE.md#ADR-005
  - packages/knowledge/src/memory/local-retrieval.mjs
  - packages/knowledge/src/memory/local-indexing.mjs
  - packages/knowledge/src/memory.mjs
  - test/arch/memory/acd-memory-derived-index.test.mjs
  - test/arch/memory/acd-memory-ranking.test.mjs
  - wiki/work/archive/05_milestone_work-memory/spike/FINDINGS.md
  - wiki/work/134_milestone_discovery-the-example-map/ARCHITECTURE.md
  - wiki/work/135_milestone_key-examples-in-the-contract/ARCHITECTURE.md
  - wiki/work/136_milestone_discovery-questions-in-the-loop/ARCHITECTURE.md
  - wiki/work/143_milestone_the-loop-starts-from-the-backlog-on-chosen-models/ARCHITECTURE.md
  - wiki/work/archive/124_milestone_the-edges-aof-does-not-draw/ARCHITECTURE.md
  - wiki/work/archive/126_milestone_the-declaration-is-the-unit/ARCHITECTURE.md
  - wiki/work/archive/127_milestone_backlog-and-archive/ARCHITECTURE.md
  - wiki/work/archive/129_milestone_loop-concurrency/ARCHITECTURE.md
  - wiki/work/archive/130_milestone_stop-a-running-loop/ARCHITECTURE.md
  - wiki/work/archive/131_milestone_the-human-in-the-loop/ARCHITECTURE.md
  - wiki/work/archive/133_milestone_architecture-diagrams/ARCHITECTURE.md
  - wiki/work/archive/138_milestone_terminal-emulator/ARCHITECTURE.md
files:
  - test/arch/memory/acd-memory-retrieval-eval.test.mjs
  - test/arch/memory/index.mjs
  - test/memory/retrieval-eval.test.mjs
  - test/memory/index.mjs
---
# 01 · The ranking is held by an eval

## User story

As **an agent recalling memory at a declared edge** (the architect at refine, the developer at
build),
I want **a fixed set of real recalls, each with the record it surfaced, to keep that record within
the five lines I am shown as the corpus grows**,
so that **a change that pushes a lesson out of my block fails a test where it is made, rather than
quietly hiding the lesson from every later recall**.

What lands (ADR-005): FF-14801, an arch test over the live corpus. Records are built in memory from
the real `wiki/work`, ranked by the base ranking both backends share, and each of 20 or more cited
pairs must rank its record within the first five. A pair whose record is gone reds as gone. It
lands first: story 03 is the first change to the pool that it guards.

## Tasks

- [x] 00 [the eval holds each pair in the block, and names the one it loses](tasks/00_the-eval-holds-each-pair-in-the-block-and-names-the-one-it-loses.feature)
- [x] 01 [the live corpus holds every cited pair](tasks/01_the-live-corpus-holds-every-cited-pair.feature)

## Notes

- The pairs come from recorded recalls: the "Memory recall" sections of the ARCHITECTURE files
  in `reads:`, and the 05 spike's two. The two named in the origin come first, and both rank first
  today: "content addressed hash cross platform" gives 01/R2, and "fitness function asserts a
  symbol appears in a file" gives 01/R1.
- An expected record is named `<item>/<id>`, because ids collide across items (`R1` recurs in
  every milestone).
