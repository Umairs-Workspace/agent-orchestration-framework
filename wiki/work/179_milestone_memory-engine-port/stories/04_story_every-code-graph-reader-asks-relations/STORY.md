---
type: story
number: 04
slug: every-code-graph-reader-asks-relations
title: "Test selection, contract derivation and seam liveness ask relations instead of parsing the graph"
parent: 179
status: in-review
owner: product-owner
created: 2026-10-30
updated: 2026-10-30
schema: 1
aofVersion: 0.1.0
depends: [02]
reads: [wiki/work/179_milestone_memory-engine-port/ARCHITECTURE.md#adr-002, wiki/work/179_milestone_memory-engine-port/ARCHITECTURE.md#adr-004, packages/knowledge/src/engine.mjs, packages/knowledge/src/graphify-code-backend.mjs, packages/knowledge/src/graph-impact.mjs, packages/knowledge/src/graph-normalize.mjs, packages/knowledge/src/graphify.mjs, packages/knowledge/src/memory/graphify-backend.mjs, packages/work/src/audit/census.mjs, test/arch/command/acd-command-layer-imports-downward.test.mjs]
files: [packages/work/src/testing/select.mjs, packages/work/src/story-contract-derive.mjs, packages/work/src/audit/seam-liveness.mjs, packages/core/src/application/bindings/work/test-select.mjs, packages/core/src/application/bindings/story-contract-derive.mjs, packages/core/src/application/bindings/work-audit/seam-liveness.mjs, packages/core/src/application/bindings/knowledge-engine.mjs, packages/core/src/application/assemble.mjs, packages/work/test/testing.test.mjs, packages/work/test/domain-services.test.mjs, packages/work/test/audit.test.mjs, test/work/lifecycle/work-test-select.test.mjs, test/work/lifecycle/work-test-declared.test.mjs, test/work/story-contract-derive.test.mjs, test/work/gate/work-audit-seam-liveness.test.mjs, test/arch/testing/acd-one-selector-one-changed-set.test.mjs, test/arch/testing/acd-test-selection-widens-never-narrows.test.mjs, test/arch/testing/acd-test-command-reports-not-decides.test.mjs, test/arch/testing/acd-suite-registration-single-decider.test.mjs, test/arch/grade/acd-seam-liveness-unknown-is-a-limit.test.mjs, test/arch/planning/acd-derivation-proposes-never-writes.test.mjs, test/arch/graph/acd-codebase-grounding-no-parse.test.mjs, test/arch/graph/acd-codebase-grounding-via-commands.test.mjs, test/arch/graph/acd-code-graph-one-reader.test.mjs, test/arch/graph/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs, test/bundle/yarn-installation.test.mjs]
---
# 04 · Test selection, contract derivation and seam liveness ask relations instead of parsing the graph

## User story

As an operator whose impacted-test lane, refine-time contract proposal and seam-liveness audit all
lean on the code graph,
I want each of them to ask the port's `relations` rather than parse `graph.json` on its own,
so that the code graph has exactly one reader. When a later engine serves `code`, all four callers
move with it, and none of them is left silently reading an artifact the new engine never writes.

## Tasks

- [x] `tasks/00_the-three-readers-ask-relations.feature` — each reader gets `relations`, and every widening, limit and refusal it reports today is reported unchanged
- [x] `tasks/01_the-code-graph-has-one-reader.feature` — FF-17904: only the graphify code backend (and the named exceptions) imports the graph's readers

## Notes

- 179/ADR-004. Each factory takes `relations` (core binds it from the code-only port that
  `knowledge-engine.mjs` composes in 02) in place of `graphJsonPath`/`readGraph`/`normalizeGraph`/
  `graphArtifactBuiltAt`/`computeImpact`.
- Vocabulary mapping, so that nothing a caller reads changes:
  - test selection: `no-graph` stays `no-graph`, and `graph-unreadable` stays `graph-unreadable`;
  - derivation: `no-graph` becomes `absent`, and `graph-unreadable` becomes `unreadable`;
  - seam liveness: today's two limit sentences, the second quoting `cause`.
- Seam liveness asks once, with every candidate, and reads `present` and `dependents`. Its match moves
  from exact-path to `computeImpact`'s suffix rule. The candidates are full repo-relative paths, so
  the findings over the live tree are unchanged. Prove that by comparing the audit's findings before
  and after on this repository.
- Test selection's purity clause holds: `relations` reads per call, and no reader caches it.
- FF-17904 lands here, as a new arch control (`test/arch/graph` 19 to 20, budget row). The graphify
  memory backend is a named exception that reads its own `.aof/memory-graph/` artifact until
  `retire-graphify-memory-backend` deletes it. The control names it, so the exception cannot outlive
  the retirement silently.
- Depends on 02 (`relations` must exist). Shares the engine binding, `assemble.mjs`, the budget and
  the yarn pins with 01 and 02, so it serialises after them.
