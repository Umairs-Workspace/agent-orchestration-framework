---
type: story
number: 01
slug: the-port-and-its-capability-declaration
title: "The knowledge-engine port answers four verbs and routes each by a backend's declared corpora"
parent: 179
status: done
owner: product-owner
created: 2026-10-30
updated: 2026-10-30
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/179_milestone_memory-engine-port/ARCHITECTURE.md#adr-001, packages/knowledge/src/memory.mjs, packages/knowledge/src/memory/none-backend.mjs, packages/knowledge/src/memory/local-backend.mjs, packages/knowledge/src/graphify-backends.mjs, packages/core/src/application/bindings/work/memory.mjs, packages/core/src/application/bindings/graphify.mjs, test/arch/memory/acd-memory-backend-interface.test.mjs, test/arch/memory/acd-record-origin-resolves.test.mjs]
files: [packages/knowledge/src/engine.mjs, packages/knowledge/package.json, packages/knowledge/README.md, packages/knowledge/test/engine.suite.mjs, packages/knowledge/test/index.mjs, packages/core/src/application/bindings/knowledge-engine.mjs, packages/core/src/application/assemble.mjs, test/arch/memory/acd-knowledge-engine-port.test.mjs, test/arch/memory/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs, test/bundle/yarn-installation.test.mjs]
---
# 01 · The knowledge-engine port answers four verbs and routes each by a backend's declared corpora

## User story

As a maintainer who will one day plug a second knowledge engine into aof,
I want one port with four verbs, and a backend that states which corpora it serves,
so that a new engine is one module that declares what it holds, and a question it cannot answer is
reported as a fact rather than answered by whichever engine happens to be there.

## Tasks

- [x] `tasks/00_the-port-routes-by-declared-corpus.feature` — the four verbs route to the one backend that declared the pair, and an unserved pair answers `corpus-unserved`
- [x] `tasks/01_a-misdeclared-backend-is-refused-at-construction.feature` — a declaration outside the vocabulary, without a method, or claimed twice is refused by name (FF-17901)

## Notes

- 179/ADR-001. The port lives in `packages/knowledge/src/engine.mjs` and imports no backend.
  Wave 1: stories 02 and 03 each wire a corpus behind it, in parallel.
- A record backend's `ingest` is its existing `reindex`, called as `reindex(input.only ?? null, ctx)`.
  The port holds that one mapping; record backends keep 05's method names.
- `none` serving the record corpora with empty answers is 03's to declare. This story proves routing
  against stub backends only.
- FF-17901 lands here. Story 02 adds its "no `code` backend declares `recall`" case over the real
  graphify code backend.
- New files move three budget rows:
  - `packages/knowledge/src` goes from 8 to 9 files, over the flat-layer threshold, so its exemption
    becomes a row;
  - `packages/knowledge/test` goes from 18 to 19;
  - `test/arch/memory` goes from 28 to 29.

  A core binding also joins `bindings/`, so its row moves too. The new knowledge module needs its
  import pin in `yarn-installation.test.mjs`.
- The knowledge README gains the port's section: four verbs, the vocabulary, the declaration and the
  miss. It is the page an outsider reads to verify the milestone.
