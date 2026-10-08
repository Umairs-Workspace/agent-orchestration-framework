---
type: story
number: 11
slug: prove-both-assistants-end-to-end
title: "Live acceptance proves Codex and preserves Claude"
parent: 154
status: in-review
owner: product-owner
created: 2026-10-06
updated: 2026-10-08
schema: 1
aofVersion: 0.1.0
depends: [08, 09, 10]
reads: ["README.md","apps/ui/src/config/App.tsx","wiki/codex-support.md","packages/core/src/application/bindings/config-inspect.mjs","packages/core/src/render-plan.mjs","packages/core/src/work/bundle.mjs","packages/execution/src/codex-protocol-profile.mjs","packages/knowledge/src/memory.mjs","packages/work-loop/src/commands/drive.mjs","packages/work/src/observe.mjs","scripts/prepare-worktree.mjs","scripts/test-sharded.mjs","scripts/test.mjs","scripts/verify-runtime-loop.mjs","scripts/yarn.mjs","test/integration/cli.mjs","test/integration/features/lifecycle.feature","test/integration/steps/lifecycle.steps.mjs","test/integration/steps/shared-cli.steps.mjs","test/integration/support/cli-context.mjs","test/integration/support/feature-runner.mjs","test/support/runtime-loop/fixture.mjs","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-001-runtime-adapters-behind-one-session-boundary","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-002-resolve-runtime-and-model-once-retain-provenance","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-003-codex-uses-versioned-app-server-over-stdio","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-004-durable-asks-are-independent-of-transient-rpc-requests","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-005-render-native-assets-with-explicit-ownership","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-006-shared-contracts-runtime-variants-focused-references","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-007-normalize-observation-without-inventing-measurements","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-008-explicit-memory-choice-and-configuration-only-ui","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/DESIGN.md","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/SECURITY.md"]
files: ["README.md","wiki/codex-support.md","scripts/verify-runtime-loop.mjs","test/integration/features/lifecycle.feature","test/integration/steps/lifecycle.steps.mjs","test/support/runtime-loop/fixture.mjs","test/arch/testing/acd-source-directory-budget.test.mjs","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/PROMPT-AUDIT.md","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/RESEARCH.md","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/VERIFICATION.md"]
---
# 154/11 · Live acceptance proves Codex and preserves Claude

## User story

As an operator, I want reproducible evidence and upgrade guidance for both assistants, so that enabling Codex is a supported choice rather than an untested configuration.

## Tasks

- [x] `tasks/00_regression-and-upgrade-guide.feature` — regression and upgrade guide
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

- Build ownership adjustment before editing: the existing lifecycle feature owns the CLI
  migration/selection/rendering scenarios. Extend it and its existing step module instead of
  adding an eleventh steps member and tenth feature against their zero-allowance rows.
  The shared fixture belongs in test/support/runtime-loop/ rather than the closed support root;
  the directory control admits that one measured subject helper, without raising a ceiling.
  Diagnostic read-set gaps: existing loop lane/phase fixtures, protocol transport fixture,
  phase-driver test setup, runtime invocation/cycle seams, session-capture/spend assemblers
  and the integration/support directory control sections. Additional narrow diagnostics covered the project migration entry, work.test configuration and workspace-boundary CLI entry. No production executor is changed.
- Continue builds and reviews executable task 00 only. Tasks 01 and 02 are manual acceptance
  and repeated live evaluation; their evidence and VERIFICATION.md remain owned by verify.
  The fixture and preparation tool must distinguish scripted transports from live results,
  isolate global state, and never inspect credentials, launch paid work or claim acceptance.

- Gate diagnostic read gap: test/bundle/site-build.test.mjs's site-shell membership case.
  docs/ is a closed publishing shell; the authored guide is moved to wiki/ before the
  restarted gate. The site control is retained unchanged.

- Executable task 00 is green on detached snapshot 7beccabff552c266d7dc6e6071427389056151d8:
  public impacted widened to all; configured eight-worker sharded gate executed 12,466/12,466
  registered cases in 1,199 units, zero failing units and zero load flakes, 21.5 minutes.
  Integration/cargo passed, including all four new lifecycle scenarios. Snapshot UI build passes.
  Summary: .tmp/154-evidence/test-sharded/2026-10-08T11-43-25-992Z/SUMMARY.txt.
- Gate ladder: validate 154/11 returned []; doctor 154/11 is healthy, zero errors and three
  existing metadata warnings. All nine delivered source/documentation paths match the snapshot.
- Inline self-review round 1: structural CONFORMS, behavioural PASS, automated craft PASS;
  zero new Blockers. Fresh root offline graph timed out at 120000ms: coupling is UNKNOWN.
  Fresh source/configured assembly measures worker closure 153, unchanged from story 10;
  no production package/app source changed in this story. Existing registered boundary,
  ownership, directory and negative-probe controls pass. No stale or empty graph was claimed.
  Actual-path debt touches no entry; zero errors and 97 existing hygiene warnings, no ledger write.
- No UI implementation in this story. Story 10's design remains INCONCLUSIVE without a review URL.
  These inline lenses are not independent review. Manual tasks 01 and 02 remain unchecked:
  native lifecycle/recovery, comparable Claude execution, independent native review, repeated
  prompt samples, six fitness red probes and visual acceptance belong to verify. No acceptance
  or VERIFICATION.md was authored by continue.