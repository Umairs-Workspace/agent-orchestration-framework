---
type: story
number: 1
slug: runtime-choice-is-durable
title: "Runtime and model choices survive resume"
parent: 154
status: done
owner: product-owner
created: 2026-10-06
updated: 2026-10-08
schema: 1
aofVersion: 0.1.0
depends: [00]
reads: ["packages/contracts/src/loop-bounds.mjs","packages/core/src/adapter-warnings.mjs","packages/core/src/application/bindings/config-inspect.mjs","packages/core/src/asset-references.mjs","packages/core/src/diagrams/generators.mjs","packages/core/src/lock.mjs","packages/core/src/model.mjs","packages/core/src/packages.mjs","packages/core/src/render-plan.mjs","packages/core/src/tool-store.mjs","packages/core/src/work/bundle.mjs","packages/core/src/work/delegation.mjs","packages/core/src/work/orchestrator.mjs","packages/core/src/workspace.mjs","packages/execution/package.json","packages/execution/src/runs.mjs","packages/execution/src/runtime-selection.mjs","packages/execution/src/runtime-session.mjs","packages/execution/src/session-model.mjs","packages/execution/src/spend.mjs","packages/execution/test/index.mjs","packages/execution/test/runs.test.mjs","packages/execution/test/runtime-selection.suite.mjs","packages/execution/test/session-model.suite.mjs","packages/work-loop/src/commands/loop.mjs","packages/work-loop/src/engine.mjs","packages/work-loop/src/trigger/declaration.mjs","packages/work-loop/test/support/work-loop-story-fixtures.mjs","schemas/aof.schema.json","scripts/test-unit.mjs","test/arch/session/acd-runtime-choice-owner.test.mjs","test/arch/session/index.mjs","test/command/config-inspect.test.mjs","test/loop/loop-bounds.test.mjs","test/loop/loop-command-probe.test.mjs","test/loop/work-loop-declaration.test.mjs","test/support/source-slice.mjs","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-002-resolve-runtime-and-model-once-retain-provenance","test/arch/session/acd-agent-model-source-map.test.mjs","test/arch/testing/acd-source-directory-budget.test.mjs","test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs","packages/core/src/application/bindings/dsl.mjs","scripts/workspace-runtime-audit.json","test/arch/loop/acd-loop-concurrency-single-home.test.mjs","test/arch/session/acd-session-driver-mesh-blind.test.mjs","test/bundle/yarn-installation.test.mjs","scripts/workspace-boundaries.mjs","test/arch/loop/acd-loop-cap-single-home.test.mjs","test/arch/run/acd-run-store-mesh-free.test.mjs"]
files: ["packages/contracts/src/loop-bounds.mjs","packages/core/src/application/bindings/config-inspect.mjs","packages/execution/package.json","packages/execution/src/runs.mjs","packages/execution/src/runtime-selection.mjs","packages/execution/src/session-model.mjs","packages/execution/test/index.mjs","packages/execution/test/runs.test.mjs","packages/execution/test/runtime-selection.suite.mjs","packages/execution/test/session-model.suite.mjs","packages/work-loop/src/trigger/declaration.mjs","schemas/aof.schema.json","scripts/test-unit.mjs","test/arch/session/acd-runtime-choice-owner.test.mjs","test/arch/session/index.mjs","test/command/config-inspect.test.mjs","test/loop/loop-bounds.test.mjs","test/loop/work-loop-declaration.test.mjs","packages/work-loop/src/engine.mjs","test/arch/testing/acd-source-directory-budget.test.mjs","test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs","scripts/workspace-runtime-audit.json","test/arch/loop/acd-loop-concurrency-single-home.test.mjs","test/arch/session/acd-session-driver-mesh-blind.test.mjs","test/bundle/yarn-installation.test.mjs"]
---
# 154/01 · Runtime and model choices survive resume

## User story

As an operator, I want explicit assistant selection and durable resolved settings, so that installing both assistants or changing configuration cannot redirect a running job.

## Tasks

- [x] `tasks/00_resolution-and-inspection.feature` — resolution and inspection
- [x] `tasks/01_persist-and-resume.feature` — persist and resume

## Notes

- Decisions: ADR-002 in the milestone architecture.
- Boundary derived with the shipped story-contract deriver, then narrowed to this outcome.
  Fresh graph refresh timed out; graph coupling is unavailable, not empty. Direct source imports,
  cited subjects and owning suites supply the fallback; conventional root test guesses were replaced
  with the workspace's actual suite and registration paths. No stale graph was used.
- Shared registries/configuration appear in write sets deliberately; the wave planner must serialize
  overlaps. Dependencies express delivered interfaces, not an assertion that all stories can run together.
- Examples are proposed from the agreed milestone scope; there are no unanswered business questions.
  Build must implement executable traceability and register each new suite before reporting green.

## Accept decision

2026-10-08 — **ACCEPTED** by the main governing session after scoped verification. Runtime/model/effort resolution, retained provenance, conflicting-resume refusal and legacy Claude cases pass. Live same-thread recovery and the worker reconnect preserve the captured execution choice. FF-15402 passes. Evidence and limitations are recorded in the parent `VERIFICATION.md` and its dated artifacts. Scoped validate is clean and doctor reports no errors or unresolved controls. Required build review is already recorded above.
