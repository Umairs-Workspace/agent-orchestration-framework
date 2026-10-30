---
type: story
number: 02
slug: graphify-serves-the-code-corpus-behind-the-port
title: "graphify serves the code corpus behind the port, and aof graph build and impact answer through it unchanged"
parent: 179
status: in-review
owner: product-owner
created: 2026-10-30
updated: 2026-10-30
schema: 1
aofVersion: 0.1.0
depends: [01]
reads: [wiki/work/179_milestone_memory-engine-port/ARCHITECTURE.md#adr-001, wiki/work/179_milestone_memory-engine-port/ARCHITECTURE.md#adr-002, packages/knowledge/src/engine.mjs, packages/knowledge/src/graphify.mjs, packages/knowledge/src/graphify-backends.mjs, packages/knowledge/src/graph-normalize.mjs, packages/knowledge/src/graph-share.mjs, packages/knowledge/src/commands/shared.mjs, packages/knowledge/src/memory/graphify-backend.mjs, packages/core/src/aof-gitignore.mjs, packages/core/src/application/bindings/graphify.mjs, packages/core/src/application/bindings/graph-mcp-server.mjs, test/graph/graphify-reindex.test.mjs, test/graph/graphify-degrade.test.mjs, test/graph/graph-mcp-server.test.mjs, test/arch/graph/acd-graphify-backend-via-command.test.mjs, test/arch/graph/acd-graph-no-face-spawn.test.mjs, test/arch/graph/acd-graph-binary-absent.test.mjs]
files: [packages/knowledge/src/graphify-code-backend.mjs, packages/knowledge/src/graph-impact.mjs, packages/knowledge/src/commands/graph-build.mjs, packages/knowledge/src/commands/graph-impact.mjs, packages/knowledge/package.json, packages/knowledge/test/graph-impact.suite.mjs, packages/knowledge/test/services.test.mjs, packages/knowledge/test/graphify-posture.suite.mjs, packages/core/src/application/bindings/knowledge-engine.mjs, packages/core/src/application/bindings/commands/graph/build.mjs, packages/core/src/application/bindings/commands/graph/impact.mjs, packages/core/src/application/bindings/command-core.mjs, packages/core/src/application/assemble.mjs, test/graph/graph-command-core.test.mjs, test/graph/graph-build-failure-propagation.test.mjs, test/graph/graph-share.test.mjs, test/graph/graph-bundle.test.mjs, test/arch/graph/acd-graph-command-cli-bijection.test.mjs, test/arch/graph/acd-graphify-backend-classified.test.mjs, test/arch/graph/acd-graph-privacy-boundary.test.mjs, test/arch/graph/acd-graphify-binary-absent-degrades.test.mjs, test/arch/graph/acd-graph-share-code-graph-only.test.mjs, test/arch/graph/acd-codebase-grounding-via-commands.test.mjs, test/arch/graph/acd-codebase-grounding-no-parse.test.mjs, test/arch/memory/acd-import-no-graphify-spawn.test.mjs, test/arch/memory/acd-knowledge-engine-port.test.mjs, test/arch/testing/acd-source-directory-budget.test.mjs, test/bundle/yarn-installation.test.mjs]
---
# 02 · graphify serves the code corpus behind the port, and aof graph build and impact answer through it unchanged

## User story

As an agent that grounds a story boundary or a review in `aof graph build` and `aof graph impact`,
I want those two commands to answer exactly as they do today, through the port,
so that the code graph has one owner that builds it, reads its edges and reports its absence. That
owner is also what a later engine replaces. And `aof graph build .` stops leaving `graphify-out/`
untracked in my repository.

## Tasks

- [x] `tasks/00_graph-build-ingests-the-code-corpus.feature` — `graph build` is `ingest("code")`, same `BuildResult`, the nested ignore written on every build (149's gap)
- [x] `tasks/01_graph-impact-asks-relations.feature` — `graph impact` is `relations(paths)`, same answer, one pass over the edges per call, `no-graph` and `graph-unreadable` from one place
- [x] `tasks/02_the-graph-faces-read-no-artifact.feature` — FF-17903 (the amended bijection) and FF-17901's code-backend case

## Notes

- 179/ADR-002. `graphify-code-backend.mjs` declares `code: ["ingest", "relations", "status"]` and is
  composed in the core binding `knowledge-engine.mjs` that 01 created.
- `graph:impact` becomes a factory (it needs `relations`), so it gains a binding
  (`bindings/commands/graph/impact.mjs`) and its `command-core.mjs` registration changes from an
  import to the binding's export. Its id, route, schema, render and json are unchanged.
- `classifyEgress`, `isNetworkBackend` and `isKnownNetworkBackend` move with the build body. The
  `assemble.mjs` application surface that exposes them (`commandsGraphBuild.isNetworkBackend`)
  keeps answering. Re-export them from `graph-build.mjs`, or repoint the surface, but do not drop it.
- Share (174) stays in `graph:build`, around `ingest`.
- The graphify memory backend's `invoke("graph:build", { outRoot: .aof/memory-graph })` rides
  `ingest("code")` from here on. That is the named wart in ADR-002, and its suites
  (`graphify-reindex`, `graphify-degrade`) must stay green unchanged. They are read, not written.
- Serialises after 01 (the budget control, the yarn pins and the engine binding are shared). It runs
  beside 03, which shares no file with it.
