---
type: story
number: 01
slug: recalls-have-complete-verdict-records
title: "Recalls have complete verdict records"
parent: 153
status: done
owner: product-owner
created: 2026-10-10
updated: 2026-10-11
depends: []
schema: 1
aofVersion: 0.1.0
reads: ["packages/work/src/feedback-records.mjs","packages/work/src/doc-transitions.mjs","packages/work/src/counters.mjs","packages/work/src/commands/counters.mjs","packages/work/src/commands/feedback.mjs","packages/knowledge/src/memory.mjs","packages/knowledge/src/commands/memory.mjs","packages/core/src/application/bindings/work/memory.mjs","packages/core/src/application/bindings/commands/work/memory.mjs","packages/core/src/application/bindings/effects/doc-transitions.mjs","packages/core/src/application/assemble.mjs","packages/work/test/feedback.test.mjs","packages/work-graph/test/work-counters.suite.mjs","test/command/work-memory-command.test.mjs","test/memory/memory-integration.test.mjs","test/graph/graphify-backend-selection.test.mjs","packages/knowledge/test/memory-hooks-inert.suite.mjs","test/arch/command/acd-work-memory-routed.test.mjs","test/arch/ui/acd-board-write-isolation.test.mjs","test/arch/memory/acd-recall-ledger-consumers.test.mjs","test/arch/memory/index.mjs","test/integration/features/memory-recall-ledger.feature","test/integration/steps/memory-recall-ledger.steps.mjs","test/integration/features/work-memory.feature","packages/work/src/commands/resolve.mjs","packages/work/src/read.mjs","packages/work/src/ref-scope.mjs","packages/work/src/discovery.mjs","packages/work/src/effects.mjs","packages/core/src/application/bindings/effects/table.mjs","packages/knowledge/src/memory/local-retrieval.mjs","packages/knowledge/src/memory/none-backend.mjs","packages/knowledge/src/memory/local-backend.mjs","packages/knowledge/src/memory/graphify-backend.mjs","test/arch/store/acd-publish-on-mutate-ledgered.test.mjs","test/integration/steps/work-memory.steps.mjs","packages/contracts/src/error.mjs","packages/work/src/records.mjs","packages/knowledge/src/graphify-backends.mjs","packages/work/src/commands/ratchet.mjs","packages/work-graph/src/checks.mjs","test/support/cli-spawn.mjs","test/support/source-slice.mjs","test/integration/support/feature-runner.mjs","packages/knowledge/src/memory/local-indexing.mjs","test/arch/command/acd-command-route-derived.test.mjs","test/arch/testing/acd-source-directory-budget.test.mjs","test/integration/support/cli-context.mjs","test/integration/support/step-registry.mjs","test/integration/support/common-steps.mjs","scripts/test.mjs","scripts/test-unit.mjs","scripts/test-workspace.mjs","wiki/work/153_milestone_memory-closes-the-loop/ARCHITECTURE.md#adr-001-complete-recall-observations-enter-the-existing-ledger"]
files: ["packages/work/src/feedback-records.mjs","packages/work/src/doc-transitions.mjs","packages/work/src/counters.mjs","packages/work/src/commands/counters.mjs","packages/work/src/commands/feedback.mjs","packages/knowledge/src/memory.mjs","packages/knowledge/src/commands/memory.mjs","packages/core/src/application/bindings/work/memory.mjs","packages/core/src/application/bindings/commands/work/memory.mjs","packages/core/src/application/bindings/effects/doc-transitions.mjs","packages/core/src/application/assemble.mjs","packages/work/test/feedback.test.mjs","packages/work-graph/test/work-counters.suite.mjs","test/command/work-memory-command.test.mjs","test/memory/memory-integration.test.mjs","test/graph/graphify-backend-selection.test.mjs","packages/knowledge/test/memory-hooks-inert.suite.mjs","test/arch/command/acd-work-memory-routed.test.mjs","test/arch/ui/acd-board-write-isolation.test.mjs","test/arch/memory/acd-recall-ledger-consumers.test.mjs","test/arch/memory/index.mjs","test/integration/features/memory-recall-ledger.feature","test/integration/steps/memory-recall-ledger.steps.mjs","test/integration/features/work-memory.feature"]
---

# 153/01 · Recalls have complete verdict records

## User story

As an AOF operator, I want to retain each decision recall and every returned record’s verdict in the item’s existing ledger, so that I can distinguish advice that was followed from advice that was ignored without mistaking it for raw feedback.

## Tasks

- [x] `tasks/01_capture-recall.feature`
- [x] `tasks/02_preserve-feedback-and-retire-brief.feature`

## Notes

Read/write sets were derived then narrowed; see the milestone RESEARCH for the unavailable graph and owning-suite substitutions. No delivered feature is amended. 
