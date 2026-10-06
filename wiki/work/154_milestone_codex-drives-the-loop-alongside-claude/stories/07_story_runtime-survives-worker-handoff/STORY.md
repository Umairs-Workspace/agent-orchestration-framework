---
type: story
number: 7
slug: runtime-survives-worker-handoff
title: "Workers retain the selected runtime and assets"
parent: 154
status: not-started
owner: product-owner
created: 2026-10-06
updated: 2026-10-06
schema: 1
aofVersion: 0.1.0
depends: [06]
reads: ["packages/core/src/application/bindings/mesh/launcher.mjs","packages/core/src/application/bindings/mesh/session-spawn-handler.mjs","packages/core/src/application/bindings/mesh/worker-execution.mjs","packages/core/src/asset-base.mjs","packages/core/src/build-info.mjs","packages/core/src/lock.mjs","packages/core/src/model.mjs","packages/execution/src/runtime-selection.mjs","packages/execution/src/runtime-session.mjs","packages/execution/src/worktrees.mjs","packages/mesh/src/assignment-directive.mjs","packages/mesh/src/declarations.mjs","packages/mesh/src/fabric.mjs","packages/mesh/src/launcher.mjs","packages/mesh/src/presence-loop.mjs","packages/mesh/src/relay.mjs","packages/mesh/src/role.mjs","packages/mesh/src/session-spawn-directive.mjs","packages/mesh/src/session-spawn-handler.mjs","packages/mesh/src/sync-cadence.mjs","packages/mesh/src/worker-execution.mjs","packages/mesh/test/index.mjs","packages/mesh/test/runtime-handoff.suite.mjs","packages/work-loop/src/child-drive.mjs","packages/work-loop/src/dispatch.mjs","packages/work-loop/test/dispatch.test.mjs","scripts/prepare-worktree.mjs","scripts/yarn.mjs","test/mesh/launcher/mesh-launcher-session-wire-complete.test.mjs","test/mesh/worker/mesh-worker-driver-session-id.test.mjs","test/support/mesh-worker-exec-fixture.mjs","test/support/mesh-worker-terminal-fixture.mjs","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-002-resolve-runtime-and-model-once-retain-provenance","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-005-render-native-assets-with-explicit-ownership","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-007-normalize-observation-without-inventing-measurements","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/SECURITY.md"]
files: ["packages/core/src/application/bindings/mesh/launcher.mjs","packages/core/src/application/bindings/mesh/session-spawn-handler.mjs","packages/core/src/application/bindings/mesh/worker-execution.mjs","packages/execution/src/worktrees.mjs","packages/mesh/src/assignment-directive.mjs","packages/mesh/src/declarations.mjs","packages/mesh/src/launcher.mjs","packages/mesh/src/session-spawn-directive.mjs","packages/mesh/src/session-spawn-handler.mjs","packages/mesh/src/worker-execution.mjs","packages/mesh/test/index.mjs","packages/mesh/test/runtime-handoff.suite.mjs","packages/work-loop/src/dispatch.mjs","packages/work-loop/test/dispatch.test.mjs","test/mesh/launcher/mesh-launcher-session-wire-complete.test.mjs","test/mesh/worker/mesh-worker-driver-session-id.test.mjs"]
---
# 154/07 · Workers retain the selected runtime and assets

## User story

As an operator, I want local worktree and mesh execution to honor the recorded assistant, so that a worker cannot silently switch runtimes or start with missing assets.

## Tasks

- [ ] `tasks/00_assignment-capabilities.feature` — assignment capabilities
- [ ] `tasks/01_worktree-and-resume.feature` — worktree and resume

## Notes

- Decisions: ADR-002, ADR-005, ADR-007 in the milestone architecture.
- Boundary derived with the shipped story-contract deriver, then narrowed to this outcome.
  Fresh graph refresh timed out; graph coupling is unavailable, not empty. Direct source imports,
  cited subjects and owning suites supply the fallback; conventional root test guesses were replaced
  with the workspace's actual suite and registration paths. No stale graph was used.
- Shared registries/configuration appear in write sets deliberately; the wave planner must serialize
  overlaps. Dependencies express delivered interfaces, not an assertion that all stories can run together.
- Examples are proposed from the agreed milestone scope; there are no unanswered business questions.
  Build must implement executable traceability and register each new suite before reporting green.

