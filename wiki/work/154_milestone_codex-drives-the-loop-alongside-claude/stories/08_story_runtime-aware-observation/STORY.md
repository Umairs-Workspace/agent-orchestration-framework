---
type: story
number: 8
slug: runtime-aware-observation
title: "Codex activity and usage are reported honestly"
parent: 154
status: not-started
owner: product-owner
created: 2026-10-06
updated: 2026-10-06
schema: 1
aofVersion: 0.1.0
depends: [07]
reads: ["packages/core/src/application/bindings/commands/drive.mjs","packages/core/src/application/bindings/run-session-capture.mjs","packages/core/src/application/bindings/run-spend-ingest.mjs","packages/core/src/application/bindings/run-store.mjs","packages/execution/package.json","packages/execution/src/codex-app-server.mjs","packages/execution/src/heartbeats.mjs","packages/execution/src/runs.mjs","packages/execution/src/runtime-events.mjs","packages/execution/src/session-capture.mjs","packages/execution/src/spend.mjs","packages/execution/test/index.mjs","packages/execution/test/run-store-spend.suite.mjs","packages/execution/test/runtime-events.suite.mjs","packages/execution/test/support/run-store.mjs","packages/mesh/src/worker-execution.mjs","packages/work-loop/src/commands/drive.mjs","packages/work/src/discovery.mjs","packages/work/src/identity.mjs","packages/work/src/observe.mjs","packages/work/test/index.mjs","packages/work/test/runtime-observe.suite.mjs","packages/work/test/support/observer-services.mjs","packages/work/test/work-observe-attribution.suite.mjs","packages/work/test/work-observe-snapshots.suite.mjs","scripts/test-unit.mjs","test/arch/session/acd-runtime-observation-facts.test.mjs","test/arch/session/index.mjs","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-007-normalize-observation-without-inventing-measurements","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/SECURITY.md"]
files: ["packages/core/src/application/bindings/commands/drive.mjs","packages/core/src/application/bindings/run-session-capture.mjs","packages/core/src/application/bindings/run-spend-ingest.mjs","packages/execution/package.json","packages/execution/src/codex-app-server.mjs","packages/execution/src/heartbeats.mjs","packages/execution/src/runtime-events.mjs","packages/execution/src/session-capture.mjs","packages/execution/src/spend.mjs","packages/execution/test/index.mjs","packages/execution/test/run-store-spend.suite.mjs","packages/execution/test/runtime-events.suite.mjs","packages/work/src/observe.mjs","packages/work/test/index.mjs","packages/work/test/runtime-observe.suite.mjs","packages/work/test/work-observe-attribution.suite.mjs","packages/work/test/work-observe-snapshots.suite.mjs","scripts/test-unit.mjs","test/arch/session/acd-runtime-observation-facts.test.mjs","test/arch/session/index.mjs"]
---
# 154/08 · Codex activity and usage are reported honestly

## User story

As an operator, I want attributable Codex activity and usage, so that I can diagnose stalled work and compare runs without misleading cost or cache statistics.

## Tasks

- [ ] `tasks/00_usage-and-attribution.feature` — usage and attribution
- [ ] `tasks/01_liveness-and-observe.feature` — liveness and observe

## Notes

- Decisions: ADR-007 in the milestone architecture.
- Boundary derived with the shipped story-contract deriver, then narrowed to this outcome.
  Fresh graph refresh timed out; graph coupling is unavailable, not empty. Direct source imports,
  cited subjects and owning suites supply the fallback; conventional root test guesses were replaced
  with the workspace's actual suite and registration paths. No stale graph was used.
- Shared registries/configuration appear in write sets deliberately; the wave planner must serialize
  overlaps. Dependencies express delivered interfaces, not an assertion that all stories can run together.
- Examples are proposed from the agreed milestone scope; there are no unanswered business questions.
  Build must implement executable traceability and register each new suite before reporting green.
