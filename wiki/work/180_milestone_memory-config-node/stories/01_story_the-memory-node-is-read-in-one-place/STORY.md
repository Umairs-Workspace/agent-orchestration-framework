---
type: story
number: 01
slug: the-memory-node-is-read-in-one-place
title: "The memory node holds backend, corpora, graph and per-engine settings, and one module reads it in either spelling"
parent: 180
status: done
owner: product-owner
created: 2026-10-30
updated: 2026-10-30
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/180_milestone_memory-config-node/ARCHITECTURE.md#adr-001, wiki/work/180_milestone_memory-config-node/ARCHITECTURE.md#adr-002, wiki/work/180_milestone_memory-config-node/ARCHITECTURE.md#adr-003, wiki/work/180_milestone_memory-config-node/ARCHITECTURE.md#adr-004, wiki/work/180_milestone_memory-config-node/ARCHITECTURE.md#adr-005, packages/knowledge/src/engine.mjs, packages/knowledge/src/memory/local-indexing.mjs, packages/knowledge/src/graphify-code-backend.mjs, packages/knowledge/src/commands/graph-build.mjs, packages/knowledge/src/commands/graph-publish.mjs, packages/knowledge/src/commands/graph-fetch.mjs, packages/knowledge/src/commands/graph-prune.mjs, packages/core/src/application/bindings/commands/project-doctor.mjs, test/arch/memory/acd-memory-backend-selection.test.mjs, test/arch/memory/acd-auto-memory-source.test.mjs, test/arch/graph/acd-graphify-backend-classified.test.mjs, test/integration/features/memory-auto-source.feature, test/integration/steps/memory-auto-source.steps.mjs]
files: [schemas/aof.schema.json, packages/knowledge/src/memory-config.mjs, packages/knowledge/package.json, packages/knowledge/README.md, packages/knowledge/src/memory/claude-auto-memory.mjs, packages/knowledge/src/graphify-backends.mjs, packages/knowledge/src/graph-share.mjs, packages/knowledge/src/memory.mjs, packages/knowledge/src/memory/graphify-backend.mjs, packages/core/src/application/bindings/config-inspect.mjs, packages/knowledge/test/memory-backend-config.suite.mjs, packages/knowledge/test/claude-auto-memory.suite.mjs, packages/knowledge/test/graphify-posture.suite.mjs, test/command/config-inspect.test.mjs, test/graph/graph-share.test.mjs, test/arch/memory/acd-memory-config-one-reader.test.mjs, test/arch/memory/acd-memory-node-schema.test.mjs, test/arch/memory/index.mjs, test/arch/graph/acd-graph-share-code-graph-only.test.mjs, test/arch/testing/acd-source-directory-budget.test.mjs, test/bundle/yarn-installation.test.mjs, README.md, wiki/memory.md, wiki/codex-support.md, wiki/work/TECH_DEBT.md]
---
# 01 · The memory node holds backend, corpora, graph and per-engine settings, and one module reads it in either spelling

## User story

As an operator configuring aof's memory,
I want every memory setting under one `memory` node, read in one place, with the old spelling still
working and telling me its new name,
so that I can see what memory serves in one block, and a later engine's settings arrive as one more
block rather than another root key.

## Tasks

- [x] `tasks/00_each-setting-has-one-home.feature` — the new spelling is read, the old one is read with a warning naming the new key, and both at once is refused by name (FF-18001)
- [x] `tasks/01_corpora-names-what-memory-serves.feature` — absent means work, imports and code; only operator may be left out, and it is today's auto-memory source
- [x] `tasks/02_engine-settings-and-sharing-live-in-the-node.feature` — `backends.graphify` and `memory.graph` behave exactly as their old keys did, and no key configures egress (FF-18002)
- [x] `tasks/03_the-faces-print-the-new-paths.feature` — config inspection, project doctor and memory status name the new paths, and no other command's output changes

## Notes

- 180/ADR-001..005. Wave 1. Stories 02 and 03 call `rewriteLegacyMemoryConfig` and
  `readMemoryConfig` from the module this story creates, and build in parallel after it.
- `memory.backend` keeps its single read site (`selectBackendName`). `memory-config.mjs` never reads
  it, so `acd-memory-backend-selection` does not move.
- 159's delivered `memory-auto-source.feature` still spells `memory.sources`, and it stays green
  unedited. That is the legacy read's standing proof. Delivered criteria are not touched.
- FF-17401 leg (b) is amended in its own file: `graph-share.mjs` may import `memory-config.mjs`
  (ADR-001). Leg (d)'s fixture moves to the new spelling.
- Budget rows: `packages/knowledge/src` goes from 10 to 11 for `memory-config.mjs`, and
  `test/arch/memory` from 29 to 31 for the two controls. Each needs a `why`. The new module needs its
  exports entry and its import pin in `yarn-installation.test.mjs`.
- The TECH_DEBT entry names the legacy read and the release that removes it (ADR-001).
