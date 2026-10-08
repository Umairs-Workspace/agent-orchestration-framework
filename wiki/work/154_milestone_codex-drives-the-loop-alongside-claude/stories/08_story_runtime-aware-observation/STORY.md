---
type: story
number: 8
slug: runtime-aware-observation
title: "Codex activity and usage are reported honestly"
parent: 154
status: in-review
owner: product-owner
created: 2026-10-06
updated: 2026-10-07
schema: 1
aofVersion: 0.1.0
depends: [07]
reads: ["packages/contracts/src/loop-bounds.mjs","packages/core/src/application/bindings/commands/drive.mjs","packages/core/src/application/bindings/run-session-capture.mjs","packages/core/src/application/bindings/run-spend-ingest.mjs","packages/core/src/application/bindings/run-store.mjs","packages/execution/package.json","packages/execution/src/codex-app-server.mjs","packages/execution/src/codex-protocol-profile.mjs","packages/execution/src/heartbeats.mjs","packages/execution/src/runs.mjs","packages/execution/src/runtime-events.mjs","packages/execution/src/runtime-session.mjs","packages/execution/src/session-capture.mjs","packages/execution/src/spend.mjs","packages/execution/test/codex-app-server.suite.mjs","packages/execution/test/index.mjs","packages/execution/test/run-store-spend.suite.mjs","packages/execution/test/runtime-events.suite.mjs","packages/execution/test/support/run-store.mjs","packages/mesh/src/worker-execution.mjs","packages/work-loop/src/commands/drive.mjs","packages/work-loop/test/runtime/phases.suite.mjs","packages/work/src/discovery.mjs","packages/work/src/identity.mjs","packages/work/src/observe.mjs","packages/work/test/index.mjs","packages/work/test/runtime-observe.suite.mjs","packages/work/test/support/observer-services.mjs","packages/work/test/work-observe-attribution.suite.mjs","packages/work/test/work-observe-snapshots.suite.mjs","scripts/test-unit.mjs","scripts/workspace-boundaries.mjs","scripts/workspace-runtime-audit.json","test/arch/audit/acd-no-new-silent-catch.test.mjs","test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs","test/arch/session/acd-attribution-is-captured-or-absent.test.mjs","test/arch/session/acd-runtime-observation-facts.test.mjs","test/arch/session/acd-session-driver-mesh-blind.test.mjs","test/arch/session/index.mjs","test/arch/testing/acd-source-directory-budget.test.mjs","test/support/workspace/assembly-graph.mjs","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-007-normalize-observation-without-inventing-measurements","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/SECURITY.md","wiki/work/TECH_DEBT.md#59"]
files: ["packages/core/src/application/bindings/commands/drive.mjs","packages/core/src/application/bindings/run-session-capture.mjs","packages/core/src/application/bindings/run-spend-ingest.mjs","packages/core/src/application/bindings/run-store.mjs","packages/execution/package.json","packages/execution/src/codex-app-server.mjs","packages/execution/src/heartbeats.mjs","packages/execution/src/runs.mjs","packages/execution/src/runtime-events.mjs","packages/execution/src/session-capture.mjs","packages/execution/src/spend.mjs","packages/execution/test/codex-app-server.suite.mjs","packages/execution/test/index.mjs","packages/execution/test/run-store-spend.suite.mjs","packages/execution/test/runtime-events.suite.mjs","packages/work-loop/src/commands/drive.mjs","packages/work-loop/test/runtime/phases.suite.mjs","packages/work/src/observe.mjs","packages/work/test/index.mjs","packages/work/test/runtime-observe.suite.mjs","packages/work/test/work-observe-attribution.suite.mjs","packages/work/test/work-observe-snapshots.suite.mjs","scripts/test-unit.mjs","scripts/workspace-runtime-audit.json","test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs","test/arch/session/acd-runtime-observation-facts.test.mjs","test/arch/session/acd-session-driver-mesh-blind.test.mjs","test/arch/session/index.mjs","test/arch/testing/acd-source-directory-budget.test.mjs"]
---
# 154/08 · Codex activity and usage are reported honestly

## User story

As an operator, I want attributable Codex activity and usage, so that I can diagnose stalled work and compare runs without misleading cost or cache statistics.

## Tasks

- [x] `tasks/00_usage-and-attribution.feature` — usage and attribution
- [x] `tasks/01_liveness-and-observe.feature` — liveness and observe

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

- 154/08 build ownership: the actual run writer, core loan and shared native phase driver
  are declared before modification; planned read-only declarations had omitted these write owners.
  The public protocol profile, existing runtime boundary, heartbeat bounds and source/assembly
  controls were read outside the original list to check native counter semantics and coupling.
  ADR-007 owns a distinct pure observation normalizer and its execution suite; the observer
  suite and FF-15406 session control accompany that subject with exact, zero-allowance counts.
  No second storage ledger is introduced. Fresh root offline graph timed out; coupling is
  unknown, assessed through current source imports/configured assembly, never a stale artifact.

- Measured observation admission: driver closure 35 -> 36 and configured worker closure
  152 -> 153 add exactly runtime-events.mjs, an import-free pure metadata leaf. No mesh
  or lifecycle denylist changes. Source/test directory counts are exact with zero allowance.
  The run-store binding introduces no runtime call site: its audited runtime-call count
  remains zero, so this story requires no runtime-audit admission or digest change.

- Debt scan: the current owner paths return no matching ledger entry. Checking the historic
  compatibility paths finds existing item 59, whose observation reader still mirrors the run
  store without normalization/sorting. This narrow ledger section was read outside the original
  declaration. Its old zero-import rationale is stale; choosing a shared reader or an explicit
  semantic-mirror contract remains the existing contract ruling, not a new finding or work item.
  Native observations extend the existing reader and persisted run brief, with no third reader.

- Gate repair ownership: FF-5307 is declared before its additive 154/08 re-pin; the
  cancelled-record case was read outside the original list to trace that shared pin. The
  seventeen legacy keys, five state edges and board/UI pins remain unchanged. Existing
  app-server process expressions are compared before refreshing only their source digests.

- The full gate exposed FF-9601, read outside the original declaration: native item
  attribution must use captured run.itemRef or null, never a folder-derived fallback. The
  production report and missing/disagreeing-capture assertions now preserve that contract;
  FF-9601 itself is unchanged. Reclaim now serializes each scanned item with driver updates.

- Required build round 1: all 12,430 registered cases / 1,199 units, 18.4 minutes,
  seven persistent failing case names, no load flakes. This is the baseline, not a
  no-progress increment. Repairs preserve legacy record shape and controls: native
  attribution is captured-or-null, process call expressions/counts are unchanged,
  defining export lines retain their shipped citations, and a failed queued write
  still rejects to its caller while its private sequencing sentinel permits recovery.

- Read-list repair during round 2: code-file fragments do not supply Markdown
  anchors. Removed the two invalid anchored entries; their narrow outside-read gaps
  remain reported above. No production code, test expectation or gate was changed.
