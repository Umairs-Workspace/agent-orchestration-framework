---
type: story
number: 6
slug: codex-drives-and-recovers-loop-phases
title: "Codex drives and recovers the existing work loop"
parent: 154
status: not-started
owner: product-owner
created: 2026-10-06
updated: 2026-10-06
schema: 1
aofVersion: 0.1.0
depends: [02, 05]
reads: ["packages/contracts/src/loop-bounds.mjs","packages/core/src/application/bindings/commands/drive.mjs","packages/core/src/application/bindings/loop/ask-request.mjs","packages/core/src/application/bindings/loop/child-drive.mjs","packages/core/src/asset-base.mjs","packages/execution/src/codex-app-server.mjs","packages/execution/src/runs.mjs","packages/execution/src/runtime-selection.mjs","packages/execution/src/runtime-session.mjs","packages/execution/src/spend.mjs","packages/work-loop/src/ask-request.mjs","packages/work-loop/src/ask.mjs","packages/work-loop/src/child-drive.mjs","packages/work-loop/src/commands/drive.mjs","packages/work-loop/src/commands/loop.mjs","packages/work-loop/src/cycle.mjs","packages/work-loop/src/dispatch.mjs","packages/work-loop/src/engine.mjs","packages/work-loop/src/stop-request.mjs","packages/work-loop/src/wave.mjs","packages/work-loop/test/index.mjs","packages/work-loop/test/runtime-asks.suite.mjs","packages/work-loop/test/runtime-phases.suite.mjs","packages/work/src/phase-brief-read.mjs","packages/work/src/phase-brief.mjs","scripts/test-unit.mjs","test/arch/session/acd-codex-permission-boundary.test.mjs","test/arch/session/acd-runtime-session-boundary.test.mjs","test/arch/testing/acd-source-directory-budget.test.mjs","test/loop/drive-command-phase-drivers.test.mjs","test/loop/warm-start-local-drive.test.mjs","test/support/cli-spawn.mjs","test/support/mesh-worker-terminal-fixture.mjs","test/support/source-slice.mjs","test/work/phase-brief-compile.test.mjs","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-001-runtime-adapters-behind-one-session-boundary","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-002-resolve-runtime-and-model-once-retain-provenance","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-003-codex-uses-versioned-app-server-over-stdio","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-004-durable-asks-are-independent-of-transient-rpc-requests","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/SECURITY.md"]
files: ["packages/core/src/application/bindings/commands/drive.mjs","packages/core/src/application/bindings/loop/ask-request.mjs","packages/core/src/application/bindings/loop/child-drive.mjs","packages/execution/src/runtime-session.mjs","packages/work-loop/src/ask-request.mjs","packages/work-loop/src/ask.mjs","packages/work-loop/src/child-drive.mjs","packages/work-loop/src/commands/drive.mjs","packages/work-loop/src/commands/loop.mjs","packages/work-loop/src/cycle.mjs","packages/work-loop/src/engine.mjs","packages/work-loop/src/stop-request.mjs","packages/work-loop/test/index.mjs","packages/work-loop/test/runtime-asks.suite.mjs","packages/work-loop/test/runtime-phases.suite.mjs","packages/work/src/phase-brief-read.mjs","packages/work/src/phase-brief.mjs","scripts/test-unit.mjs","test/arch/session/acd-codex-permission-boundary.test.mjs","test/arch/session/acd-runtime-session-boundary.test.mjs","test/loop/drive-command-phase-drivers.test.mjs","test/loop/warm-start-local-drive.test.mjs","test/work/phase-brief-compile.test.mjs"]
---
# 154/06 · Codex drives and recovers the existing work loop

## User story

As an operator, I want Codex to refine, build, review, verify and recover within the existing loop, so that assistant choice does not change AOF's gates or lose a pending decision.

## Tasks

- [ ] `tasks/00_phase-and-child-routing.feature` — phase and child routing
- [ ] `tasks/01_durable-question-recovery.feature` — durable question recovery
- [ ] `tasks/02_stops-fixes-and-gates.feature` — stops fixes and gates

## Notes

- Decisions: ADR-001, ADR-002, ADR-003, ADR-004 in the milestone architecture.
- Boundary derived with the shipped story-contract deriver, then narrowed to this outcome.
  Fresh graph refresh timed out; graph coupling is unavailable, not empty. Direct source imports,
  cited subjects and owning suites supply the fallback; conventional root test guesses were replaced
  with the workspace's actual suite and registration paths. No stale graph was used.
- Shared registries/configuration appear in write sets deliberately; the wave planner must serialize
  overlaps. Dependencies express delivered interfaces, not an assertion that all stories can run together.
- Examples are proposed from the agreed milestone scope; there are no unanswered business questions.
  Build must implement executable traceability and register each new suite before reporting green.

