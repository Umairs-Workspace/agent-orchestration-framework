---
type: story
number: 2
slug: codex-session-protocol
title: "Codex executes a bounded phase through App Server"
parent: 154
status: in-review
owner: product-owner
created: 2026-10-06
updated: 2026-10-08
schema: 1
aofVersion: 0.1.0
depends: [00, 01]
reads: ["packages/core/src/application/bindings/agent-session-driver.mjs","packages/core/src/asset-base.mjs","packages/execution/package.json","packages/execution/src/bounded-process.mjs","packages/execution/src/codex-app-server.mjs","packages/execution/src/codex-protocol-profile.mjs","packages/execution/src/pty.mjs","packages/execution/src/runtime-selection.mjs","packages/execution/src/runtime-session.mjs","packages/execution/src/session-driver.mjs","packages/execution/src/session-model.mjs","packages/execution/test/codex-app-server.suite.mjs","packages/execution/test/fixtures/codex-app-server-v1.json","packages/execution/test/index.mjs","scripts/test-unit.mjs","test/arch/session/acd-codex-permission-boundary.test.mjs","test/arch/session/index.mjs","test/session/agent-session-driver-runtime-dispatch.test.mjs","test/support/mesh-worker-terminal-fixture.mjs","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-001-runtime-adapters-behind-one-session-boundary","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-003-codex-uses-versioned-app-server-over-stdio","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-004-durable-asks-are-independent-of-transient-rpc-requests","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/RESEARCH.md","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/SECURITY.md","scripts/workspace-runtime-audit.json","test/arch/testing/acd-source-directory-budget.test.mjs","test/bundle/yarn-installation.test.mjs","test/arch/session/acd-session-driver-mesh-blind.test.mjs","scripts/workspace-boundaries.mjs","packages/core/src/application/session-driver.mjs","packages/work/src/phase-brief.mjs","test/arch/session/acd-session-driver-single-home.test.mjs","test/arch/loop/acd-loop-ask-single-home.test.mjs","test/session/agent-session-driver-transcript.test.mjs","test/support/module-family.mjs","test/session/agent-session-driver-gate-aim.test.mjs","test/arch/assignment/acd-worker-driver-no-headless-print.test.mjs"]
files: ["packages/core/src/application/bindings/agent-session-driver.mjs","packages/execution/package.json","packages/execution/src/codex-app-server.mjs","packages/execution/src/codex-protocol-profile.mjs","packages/execution/src/runtime-session.mjs","packages/execution/src/session-driver.mjs","packages/execution/test/codex-app-server.suite.mjs","packages/execution/test/fixtures/codex-app-server-v1.json","packages/execution/test/index.mjs","scripts/test-unit.mjs","test/arch/session/acd-codex-permission-boundary.test.mjs","test/arch/session/index.mjs","test/session/agent-session-driver-runtime-dispatch.test.mjs","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/VERIFICATION.md","scripts/workspace-runtime-audit.json","test/arch/testing/acd-source-directory-budget.test.mjs","test/bundle/yarn-installation.test.mjs","test/arch/session/acd-session-driver-mesh-blind.test.mjs","packages/core/src/application/session-driver.mjs","test/arch/loop/acd-loop-ask-single-home.test.mjs","test/session/agent-session-driver-transcript.test.mjs","test/session/agent-session-driver-gate-aim.test.mjs","test/arch/assignment/acd-worker-driver-no-headless-print.test.mjs"]
---
# 154/02 · Codex executes a bounded phase through App Server

## User story

As an operator, I want a tested Codex session adapter with honest outcomes, so that AOF can distinguish completed work, questions and transport failures.

## Tasks

- [x] `tasks/00_protocol-and-results.feature` — protocol and results
- [x] `tasks/01_cancellation-and-requests.feature` — cancellation and requests
- [ ] `tasks/02_live-profile-proof.feature` — live profile proof

## Notes

- Built and reviewed inline in solo mode on 2026-10-06. Structural review: CONFORMS;
  behavioural and craft reviews: CLEAN. Round 1: zero Blockers, no surviving findings.
  The shared final impacted-service gate widened to all files and passed all 12,257 registered
  cases on detached snapshot `0716b2088515e4b37cd0e93461e1f325424c8bbc`.
- The live CLI 0.160.0 observations cover create, resume, cancellation, structured question
  fallback and native usage. Task 02 remains manual: supplemental native request/terminal
  shape capture awaits explicit approval after automatic approval review rejected that probe.
  Continue does not accept this story; the next phase is `aof:verify 154/02`.
- Decisions: ADR-001, ADR-003, ADR-004 in the milestone architecture.
- Boundary derived with the shipped story-contract deriver, then narrowed to this outcome.
  Fresh graph refresh timed out; graph coupling is unavailable, not empty. Direct source imports,
  cited subjects and owning suites supply the fallback; conventional root test guesses were replaced
  with the workspace's actual suite and registration paths. No stale graph was used.
- Shared registries/configuration appear in write sets deliberately; the wave planner must serialize
  overlaps. Dependencies express delivered interfaces, not an assertion that all stories can run together.
- Examples are proposed from the agreed milestone scope; there are no unanswered business questions.
  Build must implement executable traceability and register each new suite before reporting green.
