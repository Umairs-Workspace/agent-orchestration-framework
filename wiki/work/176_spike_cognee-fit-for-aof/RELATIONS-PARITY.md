# 176 · Relations parity evidence (question 2)

Measured 2026-10-28 at commit `e2eba906`. Reference: `computeImpact` (`packages/knowledge/src/graph-impact.mjs`)
replicated over `graphify-out/graph.json`. cognee: its own `map_facts_to_data_points` + `build_code_graph_edges`
over enola 0.4.30's facts for the same tree, read the same way (every edge between nodes of different files).
cognee's file-anchored `neighbors` and depth-1 `impact_analysis` returned no other file for any row, so they
are not tabulated. `real` marks an edge the file's own import statements confirm (relative and `@aof/*`
export-map specifiers resolved); a call edge can be correct without being `real`.

Sample: 20 files, `random.Random(176)`, round-robin across the 17 packages.

| file | deps jaccard | dependents jaccard |
|---|---|---|
| `packages/knowledge/src/graphify.mjs` | 0.50 | 0.33 |
| `packages/specification-by-example/src/doctor-lane.mjs` | 0.75 | 0.20 |
| `packages/integration-notion/src/notion-sync-work.mjs` | 0.00 | 0.67 |
| `packages/effects/src/registry.mjs` | 0.00 | 0.50 |
| `packages/diagrams/src/layout.mjs` | 0.75 | 0.64 |
| `packages/mesh/src/role.mjs` | 0.50 | 0.67 |
| `packages/work-loop/src/engine.mjs` | 0.00 | 0.85 |
| `packages/messaging/src/ask-messages.mjs` | 0.50 | 0.50 |
| `packages/integration-hyperagent/src/commands.mjs` | 0.00 | 1.00 |
| `packages/execution/src/run-transitions.mjs` | 0.00 | 0.50 |
| `packages/foundation/src/git-args.mjs` | 0.00 | 0.75 |
| `packages/work-graph/src/shapes.mjs` | 0.00 | 1.00 |
| `packages/work/src/feedback-records.mjs` | 0.00 | 0.50 |
| `packages/diagrams-ui/src/library-search.mjs` | 0.00 | 1.00 |
| `packages/server/src/board-serve.mjs` | 0.00 | 0.10 |
| `packages/core/src/application/bindings/commands/assets/validate.mjs` | 0.50 | 0.00 |
| `packages/contracts/src/commands.mjs` | 0.33 | 0.09 |
| `packages/knowledge/src/memory/claude-auto-memory.mjs` | 0.33 | 1.00 |
| `packages/specification-by-example/src/story-probe.mjs` | 0.50 | 0.50 |
| `packages/integration-notion/src/projection.mjs` | 0.50 | 0.30 |

## `packages/knowledge/src/graphify.mjs`

- dependency only in cognee: `packages/knowledge/src`
- dependent only in cognee: `wiki/work/archive/12_milestone_managed-tool-provisioning/stories/02_story_graphify-retrofit/STORY.md`
- dependent only in cognee: `wiki/work/archive/142_milestone_yarn-workspace-modularization/RESEARCH.md`

## `packages/specification-by-example/src/doctor-lane.mjs`

- dependency only in cognee: `packages/specification-by-example/src`
- dependent only in graph impact: `packages/specification-by-example/test/example-trace.suite.mjs` (real)
- dependent only in cognee: `wiki/work/135_milestone_key-examples-in-the-contract/ARCHITECTURE.md`
- dependent only in cognee: `wiki/work/135_milestone_key-examples-in-the-contract/VERIFICATION.md`
- dependent only in cognee: `wiki/work/136_milestone_discovery-questions-in-the-loop/VERIFICATION.md`

## `packages/integration-notion/src/notion-sync-work.mjs`

- dependency only in cognee: `packages/integration-notion/src`
- dependent only in graph impact: `packages/integration-notion/test/services.test.mjs`

## `packages/effects/src/registry.mjs`

- dependency only in graph impact: `packages/effects/test/registry.test.mjs`
- dependency only in cognee: `packages/effects/src`
- dependent only in graph impact: `packages/effects/test/effects.test.mjs` (real)
- dependent only in graph impact: `packages/effects/test/registry.test.mjs` (real)

## `packages/diagrams/src/layout.mjs`

- dependency only in cognee: `packages/diagrams/src`
- dependent only in graph impact: `packages/diagrams/test/diagram-layout.suite.mjs` (real)
- dependent only in graph impact: `test/arch/diagrams/acd-diagram-layout-single-home.test.mjs` (real)
- dependent only in graph impact: `test/diagrams/loop-diagram-command.test.mjs` (real)
- dependent only in graph impact: `test/work/doctor-diagrams-lane.test.mjs` (real)

## `packages/mesh/src/role.mjs`

- dependency only in cognee: `packages/mesh/src`
- dependent only in graph impact: `packages/mesh/test/coordination.test.mjs` (real)

## `packages/work-loop/src/engine.mjs`

- dependency only in graph impact: `packages/contracts/src/freshness.mjs`
- dependency only in graph impact: `packages/core/src/cli.mjs`
- dependency only in graph impact: `packages/work/src/grade.mjs`
- dependency only in cognee: `packages/work-loop/src`
- dependent only in graph impact: `packages/core/src/application/bindings/commands/run-status.mjs` (real)
- dependent only in graph impact: `packages/execution/src/runtime-session.mjs`
- dependent only in graph impact: `packages/work-loop/test/trigger-level-ceiling.suite.mjs` (real)
- dependent only in graph impact: `test/mesh/assignment/mesh-assignment-loop-directive.test.mjs` (real)
- dependent only in graph impact: `test/planning/promote-finding-to-chore.test.mjs` (real)
- dependent only in graph impact: `test/run/run-status-render.test.mjs` (real)
- dependent only in graph impact: `test/work/four-deadlines.test.mjs` (real)
- dependent only in graph impact: `test/work/story-context-contract.test.mjs` (real)
- dependent only in cognee: `packages/work-loop/src/progress.mjs`
- dependent only in cognee: `wiki/work/155_story_one-agent-mode-setting/STORY.md`

## `packages/messaging/src/ask-messages.mjs`

- dependency only in cognee: `packages/messaging/src`
- dependent only in graph impact: `packages/messaging/test/services.test.mjs` (real)

## `packages/integration-hyperagent/src/commands.mjs`

- dependency only in graph impact: `packages/contracts/src/error.mjs`
- dependency only in cognee: `packages/integration-hyperagent/src`
- dependency only in cognee: `packages/integration-hyperagent/src/brief.mjs` (real)
- dependency only in cognee: `packages/integration-hyperagent/src/check.mjs` (real)
- dependency only in cognee: `packages/integration-hyperagent/src/config.mjs` (real)
- dependency only in cognee: `packages/integration-hyperagent/src/doctor.mjs` (real)
- dependency only in cognee: `packages/integration-hyperagent/src/package.mjs` (real)
- dependency only in cognee: `packages/integration-hyperagent/src/plan-result.mjs` (real)

## `packages/execution/src/run-transitions.mjs`

- dependency only in cognee: `packages/execution/src`
- dependency only in cognee: `packages/execution/src/runtime-events.mjs`
- dependent only in graph impact: `packages/execution/test/transitions.test.mjs` (real)

## `packages/foundation/src/git-args.mjs`

- dependency only in cognee: `packages/foundation/src`
- dependent only in graph impact: `packages/foundation/test/foundation.test.mjs` (real)

## `packages/work-graph/src/shapes.mjs`

- dependency only in cognee: `packages/work-graph/src`
- cognee could not resolve the file as a seed: `CodeSeedNotFoundError: CodeSearchValidationError: CODE neighbors anchor name 'pa…`

## `packages/work/src/feedback-records.mjs`

- dependency only in graph impact: `test/arch/work/acd-migrate-command-cli-bijection.test.mjs`
- dependency only in cognee: `packages/work/src`
- dependency only in cognee: `packages/work/src/grade.mjs`
- dependent only in graph impact: `packages/core/src/application/bindings/memory/local-indexing.mjs` (real)
- dependent only in graph impact: `test/arch/loop/acd-trigger-never-classifies.test.mjs` (real)
- dependent only in graph impact: `test/arch/session/acd-raw-capture-before-classification.test.mjs` (real)
- dependent only in graph impact: `test/integration/steps/memory-recall-ledger.steps.mjs` (real)
- dependent only in graph impact: `test/session/raw-capture-before-classification.test.mjs` (real)
- dependent only in cognee: `wiki/memory.md`

## `packages/diagrams-ui/src/library-search.mjs`

- dependency only in cognee: `packages/diagrams-ui/src`

## `packages/server/src/board-serve.mjs`

- dependency only in cognee: `packages/server/src`
- dependent only in graph impact: `packages/server/test/transports.test.mjs` (real)
- dependent only in cognee: `wiki/work/TECH_DEBT.md`
- dependent only in cognee: `wiki/work/archive/23_milestone_control-node-relay/stories/01_story_thin-relay/STORY.md`
- dependent only in cognee: `wiki/work/archive/44_spike_terminal-origin-boundary/SPIKE.md`
- dependent only in cognee: `wiki/work/archive/45_milestone_ui-app-shell-routing/SPEC.md`
- dependent only in cognee: `wiki/work/archive/45_milestone_ui-app-shell-routing/stories/02_story_static-serve-history-fallback/STORY.md`
- dependent only in cognee: `wiki/work/archive/45_milestone_ui-app-shell-routing/stories/04_story_advertised-entry-points/STORY.md`
- dependent only in cognee: `wiki/work/archive/46_milestone_terminal-control-unification/ARCHITECTURE.md`
- dependent only in cognee: `wiki/work/archive/46_milestone_terminal-control-unification/stories/02_story_terminal-origin-seam/STORY.md`

## `packages/core/src/application/bindings/commands/assets/validate.mjs`

- dependency only in cognee: `packages/core/src/application/bindings/commands/assets`
- dependent only in graph impact: `packages/core/src/application/assemble.mjs` (real)

## `packages/contracts/src/commands.mjs`

- dependency only in graph impact: `test/arch/ui/acd-no-per-surface-fixed-overlay.test.mjs`
- dependency only in cognee: `packages/contracts/src`
- dependent only in graph impact: `packages/contracts/test/commands.test.mjs` (real)
- dependent only in graph impact: `packages/core/src/application/bindings/command-core.mjs` (real)
- dependent only in graph impact: `packages/core/src/cli.mjs`
- dependent only in graph impact: `packages/diagrams/test/package-seams.suite.mjs` (real)
- dependent only in graph impact: `packages/mesh/test/cache-services.test.mjs` (real)
- dependent only in graph impact: `packages/work-loop/test/dispatch.test.mjs` (real)
- dependent only in graph impact: `packages/work-loop/test/trigger.test.mjs` (real)
- dependent only in graph impact: `packages/work/test/commands.test.mjs` (real)
- dependent only in graph impact: `packages/work/test/domain-services.test.mjs` (real)
- dependent only in graph impact: `test/arch/command/acd-readme-names-what-ships.test.mjs`

## `packages/knowledge/src/memory/claude-auto-memory.mjs`

- dependency only in cognee: `packages/knowledge/src/memory`
- dependency only in cognee: `packages/knowledge/src/memory/episodic-indexing.mjs`

## `packages/specification-by-example/src/story-probe.mjs`

- dependency only in cognee: `packages/specification-by-example/src`
- dependent only in graph impact: `test/examples/doctor-examples-lane.test.mjs` (real)

## `packages/integration-notion/src/projection.mjs`

- dependency only in cognee: `packages/integration-notion/src`
- dependent only in graph impact: `packages/integration-notion/test/notion-projection-plan.suite.mjs` (real)
- dependent only in graph impact: `packages/integration-notion/test/notion-status-map-skip.suite.mjs` (real)
- dependent only in graph impact: `packages/integration-notion/test/services.test.mjs` (real)
- dependent only in graph impact: `test/arch/notion/acd-notion-fail-honestly.test.mjs` (real)
- dependent only in graph impact: `test/notion/integrations-legacy-removed.test.mjs` (real)
- dependent only in graph impact: `test/notion/integrations-projection-parent-nesting.test.mjs` (real)
- dependent only in graph impact: `test/notion/notion-dry-run.test.mjs` (real)

