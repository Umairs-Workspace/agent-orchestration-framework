---
type: story
number: 2
slug: codex-session-protocol
title: "Codex executes a bounded phase through App Server"
parent: 154
status: not-started
owner: product-owner
created: 2026-10-06
updated: 2026-10-06
schema: 1
aofVersion: 0.1.0
depends: [00, 01]
reads: ["packages/core/src/application/bindings/agent-session-driver.mjs","packages/core/src/asset-base.mjs","packages/execution/package.json","packages/execution/src/bounded-process.mjs","packages/execution/src/codex-app-server.mjs","packages/execution/src/codex-protocol-profile.mjs","packages/execution/src/pty.mjs","packages/execution/src/runtime-selection.mjs","packages/execution/src/runtime-session.mjs","packages/execution/src/session-driver.mjs","packages/execution/src/session-model.mjs","packages/execution/test/codex-app-server.suite.mjs","packages/execution/test/fixtures/codex-app-server-v1.json","packages/execution/test/index.mjs","scripts/test-unit.mjs","test/arch/session/acd-codex-permission-boundary.test.mjs","test/arch/session/index.mjs","test/session/agent-session-driver-runtime-dispatch.test.mjs","test/support/mesh-worker-terminal-fixture.mjs","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-001-runtime-adapters-behind-one-session-boundary","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-003-codex-uses-versioned-app-server-over-stdio","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-004-durable-asks-are-independent-of-transient-rpc-requests","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/RESEARCH.md","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/SECURITY.md"]
files: ["packages/core/src/application/bindings/agent-session-driver.mjs","packages/execution/package.json","packages/execution/src/codex-app-server.mjs","packages/execution/src/codex-protocol-profile.mjs","packages/execution/src/runtime-session.mjs","packages/execution/src/session-driver.mjs","packages/execution/test/codex-app-server.suite.mjs","packages/execution/test/fixtures/codex-app-server-v1.json","packages/execution/test/index.mjs","scripts/test-unit.mjs","test/arch/session/acd-codex-permission-boundary.test.mjs","test/arch/session/index.mjs","test/session/agent-session-driver-runtime-dispatch.test.mjs","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/VERIFICATION.md"]
---
# 154/02 · Codex executes a bounded phase through App Server

## User story

As an operator, I want a tested Codex session adapter with honest outcomes, so that AOF can distinguish completed work, questions and transport failures.

## Tasks

- [ ] `tasks/00_protocol-and-results.feature` — protocol and results
- [ ] `tasks/01_cancellation-and-requests.feature` — cancellation and requests
- [ ] `tasks/02_live-profile-proof.feature` — live profile proof

## Notes

- Decisions: ADR-001, ADR-003, ADR-004 in the milestone architecture.
- Boundary derived with the shipped story-contract deriver, then narrowed to this outcome.
  Fresh graph refresh timed out; graph coupling is unavailable, not empty. Direct source imports,
  cited subjects and owning suites supply the fallback; conventional root test guesses were replaced
  with the workspace's actual suite and registration paths. No stale graph was used.
- Shared registries/configuration appear in write sets deliberately; the wave planner must serialize
  overlaps. Dependencies express delivered interfaces, not an assertion that all stories can run together.
- Examples are proposed from the agreed milestone scope; there are no unanswered business questions.
  Build must implement executable traceability and register each new suite before reporting green.

