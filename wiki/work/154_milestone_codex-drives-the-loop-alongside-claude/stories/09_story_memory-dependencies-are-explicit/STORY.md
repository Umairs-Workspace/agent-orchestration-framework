---
type: story
number: 9
slug: memory-dependencies-are-explicit
title: "Codex projects can choose an explicit memory backend"
parent: 154
status: not-started
owner: product-owner
created: 2026-10-06
updated: 2026-10-06
schema: 1
aofVersion: 0.1.0
depends: [01]
reads: ["packages/core/src/adapter-warnings.mjs","packages/core/src/aof-gitignore.mjs","packages/core/src/application/bindings/config-inspect.mjs","packages/core/src/application/bindings/memory/graphify-backend.mjs","packages/core/src/application/bindings/work/memory.mjs","packages/core/src/asset-references.mjs","packages/core/src/diagrams/generators.mjs","packages/core/src/lock.mjs","packages/core/src/model.mjs","packages/core/src/packages.mjs","packages/core/src/render-plan.mjs","packages/core/src/tool-store.mjs","packages/core/src/work/bundle.mjs","packages/knowledge/src/commands/memory.mjs","packages/knowledge/src/graph-normalize.mjs","packages/knowledge/src/graphify.mjs","packages/knowledge/src/memory.mjs","packages/knowledge/src/memory/graphify-backend.mjs","packages/knowledge/src/memory/local-backend.mjs","packages/knowledge/src/memory/local-indexing.mjs","packages/knowledge/src/memory/local-retrieval.mjs","packages/knowledge/src/memory/none-backend.mjs","packages/knowledge/test/index.mjs","packages/knowledge/test/memory-backend-config.suite.mjs","packages/work/src/declared-id.mjs","packages/work/src/memory-vocabulary.mjs","schemas/aof.schema.json","test/command/config-inspect.test.mjs","test/memory/memory-integration.test.mjs","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-008-explicit-memory-choice-and-configuration-only-ui"]
files: ["packages/core/src/application/bindings/config-inspect.mjs","packages/core/src/application/bindings/memory/graphify-backend.mjs","packages/core/src/application/bindings/work/memory.mjs","packages/knowledge/src/memory.mjs","packages/knowledge/src/memory/graphify-backend.mjs","packages/knowledge/test/index.mjs","packages/knowledge/test/memory-backend-config.suite.mjs","schemas/aof.schema.json","test/command/config-inspect.test.mjs","test/memory/memory-integration.test.mjs"]
---
# 154/09 · Codex projects can choose an explicit memory backend

## User story

As a Codex operator, I want memory extraction dependencies visible and configurable, so that I can run without unexpectedly launching Claude.

## Tasks

- [ ] `tasks/00_backend-selection.feature` — backend selection
- [ ] `tasks/01_dependency-diagnostics.feature` — dependency diagnostics

## Notes

- Decisions: ADR-008 in the milestone architecture.
- Boundary derived with the shipped story-contract deriver, then narrowed to this outcome.
  Fresh graph refresh timed out; graph coupling is unavailable, not empty. Direct source imports,
  cited subjects and owning suites supply the fallback; conventional root test guesses were replaced
  with the workspace's actual suite and registration paths. No stale graph was used.
- Shared registries/configuration appear in write sets deliberately; the wave planner must serialize
  overlaps. Dependencies express delivered interfaces, not an assertion that all stories can run together.
- Examples are proposed from the agreed milestone scope; there are no unanswered business questions.
  Build must implement executable traceability and register each new suite before reporting green.

