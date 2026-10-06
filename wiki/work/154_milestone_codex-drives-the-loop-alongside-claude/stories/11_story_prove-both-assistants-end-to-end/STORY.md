---
type: story
number: 11
slug: prove-both-assistants-end-to-end
title: "Live acceptance proves Codex and preserves Claude"
parent: 154
status: not-started
owner: product-owner
created: 2026-10-06
updated: 2026-10-06
schema: 1
aofVersion: 0.1.0
depends: [08, 09, 10]
reads: ["README.md","apps/ui/src/config/App.tsx","docs/codex-support.md","packages/core/src/application/bindings/config-inspect.mjs","packages/core/src/render-plan.mjs","packages/core/src/work/bundle.mjs","packages/execution/src/codex-protocol-profile.mjs","packages/knowledge/src/memory.mjs","packages/work-loop/src/commands/drive.mjs","packages/work/src/observe.mjs","scripts/prepare-worktree.mjs","scripts/test-sharded.mjs","scripts/test.mjs","scripts/verify-runtime-loop.mjs","scripts/yarn.mjs","test/integration/cli.mjs","test/integration/features/lifecycle.feature","test/integration/features/runtime-loop.feature","test/integration/steps/lifecycle.steps.mjs","test/integration/steps/runtime-loop.steps.mjs","test/integration/steps/shared-cli.steps.mjs","test/integration/support/cli-context.mjs","test/integration/support/feature-runner.mjs","test/support/runtime-loop-fixture.mjs","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-001-runtime-adapters-behind-one-session-boundary","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-002-resolve-runtime-and-model-once-retain-provenance","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-003-codex-uses-versioned-app-server-over-stdio","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-004-durable-asks-are-independent-of-transient-rpc-requests","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-005-render-native-assets-with-explicit-ownership","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-006-shared-contracts-runtime-variants-focused-references","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-007-normalize-observation-without-inventing-measurements","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-008-explicit-memory-choice-and-configuration-only-ui","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/DESIGN.md","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/SECURITY.md"]
files: ["README.md","docs/codex-support.md","scripts/verify-runtime-loop.mjs","test/integration/features/runtime-loop.feature","test/integration/steps/runtime-loop.steps.mjs","test/support/runtime-loop-fixture.mjs","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/PROMPT-AUDIT.md","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/RESEARCH.md","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/VERIFICATION.md"]
---
# 154/11 · Live acceptance proves Codex and preserves Claude

## User story

As an operator, I want reproducible evidence and upgrade guidance for both assistants, so that enabling Codex is a supported choice rather than an untested configuration.

## Tasks

- [ ] `tasks/00_regression-and-upgrade-guide.feature` — regression and upgrade guide
- [ ] `tasks/01_live-lifecycle-acceptance.feature` — live lifecycle acceptance
- [ ] `tasks/02_prompt-behavior-evaluation.feature` — prompt behavior evaluation

## Notes

- Decisions: ADR-001, ADR-002, ADR-003, ADR-004, ADR-005, ADR-006, ADR-007, ADR-008 in the milestone architecture.
- Boundary derived with the shipped story-contract deriver, then narrowed to this outcome.
  Fresh graph refresh timed out; graph coupling is unavailable, not empty. Direct source imports,
  cited subjects and owning suites supply the fallback; conventional root test guesses were replaced
  with the workspace's actual suite and registration paths. No stale graph was used.
- Shared registries/configuration appear in write sets deliberately; the wave planner must serialize
  overlaps. Dependencies express delivered interfaces, not an assertion that all stories can run together.
- Examples are proposed from the agreed milestone scope; there are no unanswered business questions.
  Build must implement executable traceability and register each new suite before reporting green.
