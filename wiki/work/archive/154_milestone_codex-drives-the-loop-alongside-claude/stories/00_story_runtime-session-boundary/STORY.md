---
type: story
number: 0
slug: runtime-session-boundary
title: "A shared session boundary preserves Claude execution"
parent: 154
status: done
owner: product-owner
created: 2026-10-06
updated: 2026-10-08
schema: 1
aofVersion: 0.1.0
depends: []
reads: ["packages/core/src/application/bindings/agent-session-driver.mjs","packages/core/src/application/bindings/claude-trust.mjs","packages/core/src/application/bindings/commands/drive.mjs","packages/core/src/application/bindings/terminal-providers.mjs","packages/core/src/application/bindings/terminal/screen.mjs","packages/core/src/application/bindings/terminal/session-screen.mjs","packages/core/src/application/bindings/work/observe.mjs","packages/core/src/application/default-foundation.mjs","packages/core/src/application/default-session-driver.mjs","packages/core/src/application/session-driver.mjs","packages/core/src/asset-base.mjs","packages/execution/package.json","packages/execution/src/bounded-process.mjs","packages/execution/src/pty.mjs","packages/execution/src/runs.mjs","packages/execution/src/runtime-session.mjs","packages/execution/src/session-driver.mjs","packages/execution/src/spend.mjs","packages/execution/test/driver.test.mjs","packages/execution/test/index.mjs","packages/execution/test/runtime-session.suite.mjs","packages/work-loop/src/commands/drive.mjs","packages/work/src/observe.mjs","packages/work/src/phase-brief.mjs","scripts/test-unit.mjs","test/arch/session/acd-runtime-session-boundary.test.mjs","test/arch/session/index.mjs","test/arch/testing/acd-source-directory-budget.test.mjs","test/bundle/yarn-installation.test.mjs","test/session/agent-session-driver-drives.test.mjs","test/session/agent-session-driver-runtime-dispatch.test.mjs","test/support/mesh-worker-terminal-fixture.mjs","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-001-runtime-adapters-behind-one-session-boundary"]
files: ["packages/core/src/application/bindings/agent-session-driver.mjs","packages/core/src/application/default-session-driver.mjs","packages/core/src/application/session-driver.mjs","packages/execution/package.json","packages/execution/src/runtime-session.mjs","packages/execution/src/session-driver.mjs","packages/execution/test/driver.test.mjs","packages/execution/test/index.mjs","packages/execution/test/runtime-session.suite.mjs","scripts/test-unit.mjs","test/arch/session/acd-runtime-session-boundary.test.mjs","test/arch/session/index.mjs","test/arch/testing/acd-source-directory-budget.test.mjs","test/bundle/yarn-installation.test.mjs","test/session/agent-session-driver-runtime-dispatch.test.mjs"]
---
# 154/00 · A shared session boundary preserves Claude execution

## User story

As an AOF maintainer, I want a runtime-neutral session boundary around the existing Claude driver, so that a second assistant can execute phases without duplicating loop policy.

## Tasks

- [x] `tasks/00_claude-compatibility.feature` — claude compatibility
- [x] `tasks/01_session-events.feature` — session events

## Notes

- Decisions: ADR-001 in the milestone architecture.
- Boundary derived with the shipped story-contract deriver, then narrowed to this outcome.
  Fresh graph refresh timed out; graph coupling is unavailable, not empty. Direct source imports,
  cited subjects and owning suites supply the fallback; conventional root test guesses were replaced
  with the workspace's actual suite and registration paths. No stale graph was used.
- Shared registries/configuration appear in write sets deliberately; the wave planner must serialize
  overlaps. Dependencies express delivered interfaces, not an assertion that all stories can run together.
- Examples are proposed from the agreed milestone scope; there are no unanswered business questions.
  Build must implement executable traceability and register each new suite before reporting green.

## Accept decision

2026-10-08 — **ACCEPTED** by the main governing session after scoped verification. The shared-boundary and Claude regression cases pass; the actual default-Claude fixture completed all four phases and accepted its milestone. FF-15401 and its negative probes pass. Evidence and limitations are recorded in the parent `VERIFICATION.md` and its dated artifacts. Scoped validate is clean and doctor reports no errors or unresolved controls. Required build review is already recorded above.
