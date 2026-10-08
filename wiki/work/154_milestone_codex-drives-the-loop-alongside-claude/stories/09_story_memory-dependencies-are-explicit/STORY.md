---
type: story
number: 9
slug: memory-dependencies-are-explicit
title: "Codex projects can choose an explicit memory backend"
parent: 154
status: done
owner: product-owner
created: 2026-10-06
updated: 2026-10-08
schema: 1
aofVersion: 0.1.0
depends: [01]
reads: ["packages/core/src/adapter-warnings.mjs","packages/core/src/aof-gitignore.mjs","packages/core/src/application/bindings/config-inspect.mjs","packages/core/src/application/bindings/memory/graphify-backend.mjs","packages/core/src/application/bindings/work/memory.mjs","packages/core/src/asset-references.mjs","packages/core/src/diagrams/generators.mjs","packages/core/src/lock.mjs","packages/core/src/model.mjs","packages/core/src/packages.mjs","packages/core/src/render-plan.mjs","packages/core/src/tool-store.mjs","packages/core/src/work/bundle.mjs","packages/knowledge/src/commands/memory.mjs","packages/knowledge/src/graph-normalize.mjs","packages/knowledge/src/graphify.mjs","packages/knowledge/src/memory.mjs","packages/knowledge/src/memory/graphify-backend.mjs","packages/knowledge/src/memory/local-backend.mjs","packages/knowledge/src/memory/local-indexing.mjs","packages/knowledge/src/memory/local-retrieval.mjs","packages/knowledge/src/memory/none-backend.mjs","packages/knowledge/test/index.mjs","packages/knowledge/test/memory-backend-config.suite.mjs","packages/work/src/declared-id.mjs","packages/work/src/memory-vocabulary.mjs","schemas/aof.schema.json","test/command/config-inspect.test.mjs","test/memory/memory-integration.test.mjs","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-008-explicit-memory-choice-and-configuration-only-ui","packages/knowledge/src/graphify-backends.mjs","packages/knowledge/src/commands/graph-build.mjs","scripts/test-unit.mjs","test/arch/testing/acd-source-directory-budget.test.mjs","test/arch/session/acd-session-driver-mesh-blind.test.mjs","scripts/workspace-runtime-audit.json","test/arch/memory/acd-memory-backend-selection.test.mjs","test/arch/graph/acd-graphify-backend-via-command.test.mjs","test/arch/graph/acd-graphify-backend-selection.test.mjs","test/arch/graph/acd-graphify-backend-classified.test.mjs","packages/work/src/commands/run-complete.mjs","test/bundle/yarn-installation.test.mjs","packages/contracts/src/error.mjs","packages/work/src/commands/debt.mjs"]
files: ["packages/core/src/application/bindings/config-inspect.mjs","packages/core/src/application/bindings/memory/graphify-backend.mjs","packages/core/src/application/bindings/work/memory.mjs","packages/knowledge/src/memory.mjs","packages/knowledge/src/memory/graphify-backend.mjs","packages/knowledge/test/index.mjs","packages/knowledge/test/memory-backend-config.suite.mjs","schemas/aof.schema.json","test/command/config-inspect.test.mjs","test/memory/memory-integration.test.mjs","packages/knowledge/src/graphify-backends.mjs","packages/knowledge/src/commands/graph-build.mjs","scripts/test-unit.mjs","test/arch/testing/acd-source-directory-budget.test.mjs","test/arch/session/acd-session-driver-mesh-blind.test.mjs","scripts/workspace-runtime-audit.json","test/bundle/yarn-installation.test.mjs"]
---
# 154/09 · Codex projects can choose an explicit memory backend

## User story

As a Codex operator, I want memory extraction dependencies visible and configurable, so that I can run without unexpectedly launching Claude.

## Tasks

- [x] `tasks/00_backend-selection.feature` — backend selection
- [x] `tasks/01_dependency-diagnostics.feature` — dependency diagnostics

## Notes

- Decisions: ADR-008 in the milestone architecture.
- Boundary derived with the shipped story-contract deriver, then narrowed to this outcome.
  Fresh graph refresh timed out; graph coupling is unavailable, not empty. Direct source imports,
  cited subjects and owning suites supply the fallback; conventional root test guesses were replaced
  with the workspace's actual suite and registration paths. No stale graph was used.
- Shared registries/configuration appear in write sets deliberately; the wave planner must serialize
  overlaps. Dependencies express delivered interfaces, not an assertion that all stories can run together.
- Examples are proposed from the agreed milestone scope; there are no unanswered business questions.
  Build must implement executable traceability and register each new suite before reporting green.


- Build boundary addition, before writes: share the existing Graphify extractor catalog in a pure leaf, consume it in graph build and memory, register executable cases, and admit only measured directory/closure growth. Runtime audit changes may refresh source fingerprints only when process expressions and counts are unchanged.
- Read gaps: graph-build was read in full before this addition; core assembly was inspected at the config/memory binding lines only to check ownership, with no edits. The initial ADR-008 read also included the adjacent fitness table. No stale graph or private terms were read.

- Stopped attempt: 52 focused cases passed; full gate and review remain pending. The unsupported debt --help invocation returned exit 1, triggering the invoked continue procedure stop rule. Additional read gaps: the four named memory/Graphify ownership controls and run-completion owner were read in full to check compatibility and safely settle the stopped attempt. No control files were edited.

- Resumed build 2026-10-08: 52 focused registered cases and 49 existing architecture/compatibility controls pass. Knowledge suite count is admitted at the delivered 13, with zero allowance. Runtime call kinds, expressions and counts are unchanged (config inspection: one; three knowledge owners: zero); only the audited source fingerprint changes. Fresh offline graph timed out at 120 seconds; coupling is UNKNOWN, assessed from fresh imports and configured assembly. The worker closure remains 153 and driver controls remain green without ceiling/denylist changes. The actual-path debt query has no touching entries; its unrelated ledger hygiene warnings are not a new finding on this change.

- Required round 1: 12,450/12,450 cases executed in 1,196 units, 22.9 minutes. One persistent failure: the new pure catalog uses the existing contracts/error API but lacks its exact file-level import admission. Four timing-sensitive units pass alone (ten case names are retained in the gate summary). Before changing the control, its full source and the error contract were read; these diagnostic reads were outside the initial declaration. Add only that existing pure contract port for this leaf; platform, providers, core, computed imports and sibling internals remain forbidden. No package dependency or install changes.

- Expanded actual-path debt query covers all 13 changed paths, including registration and controls. Existing entries 56 (TECH_DEBT.md:2299-2330) and 71 (:2715-2742) touch scripts/test-unit.mjs. Only these ledger sections were read, plus the debt command owner to verify supported read-only syntax; these were diagnostic read-set gaps. Entry 56 requires a story-sized redesign of accepted residue controls; 09 changes none of those digests. Entry 71 requires the existing lane/ceiling contract ruling, not a registration edit. The delivered suite is registered in both runners and all its cases execute in the full gate. Retain both existing ledger destinations; no new finding id/item and no ledger write. Round 2 gates snapshot 1dd4e6dedd3c6245c7b43245d80f93ee6f85ab25 with a fresh isolated home; the exact port repair and its 13 owning cases pass locally.

- Required round 2 completed: 12,450/12,450 registered cases, 1,213 units, 58.2 minutes, three persistent failing cases and four units green only on isolated retry. Persistent cases: copied core without source aliases; needs-input PTY stream ending; real stop-source interval process exit. Counts 1 -> 3 record one no-progress round. Summary: .tmp/154-evidence/test-sharded/2026-10-08T01-12-13-522Z/SUMMARY.txt. A later 45-second wait returned after a large wall-clock gap; the gate report had already completed.
- Separate reproduction against the same fixed snapshot after the gap passes all three registered cases unchanged (25,529ms, 934ms, 1,438ms). This is diagnostic evidence, not a replacement gate and not a no-progress reset. No production change or timeout relaxation. Additional read gaps: core-workspace.test.mjs was read in full; only the failing case sections of fleet-terminal-view-producer-fed.test.mjs and loop-diag.test.mjs were inspected. No edits to these owners. Round 3 will use eight workers through the configured jobs argument and a fresh isolated home to reduce concurrent contention. A third-round failure count of three or higher reaches the two-consecutive-no-progress stop bound.
- Required round 3 is running against snapshot 5d56ed180ffb8a95ee7a786a79062897e813a777 with eight workers and a fresh isolated home. Log directory: .tmp/154-evidence/test-sharded/2026-10-08T08-50-37-785Z. The no-progress counter remains one until its completed result is measured.

## Accept decision

2026-10-08 — **ACCEPTED** by the main governing session after scoped verification. Explicit backend selection, extractor dependencies and local-memory behavior pass. The exact leaf-port admission is verified without adding a second memory vocabulary or ledger. Evidence and limitations are recorded in the parent `VERIFICATION.md` and its dated artifacts. Scoped validate is clean and doctor reports no errors or unresolved controls. Required build review is already recorded above.
