---
type: story
number: 05
slug: tune-proposes-promoted-prompt-corrections
title: "Tune proposes promoted prompt corrections"
parent: 153
status: in-review
owner: product-owner
created: 2026-10-10
updated: 2026-10-10
depends: [153/03]
schema: 1
aofVersion: 0.1.0
reads: ["packages/work/src/tune/corpus.mjs","packages/work/src/tune/proposal.mjs","packages/work/src/commands/tune.mjs","packages/work/src/tune/distance.mjs","test/planning/tune-corpus.test.mjs","test/planning/tune-proposal.test.mjs","test/planning/tune-command.test.mjs","packages/work/test/tune-distance.suite.mjs","test/arch/planning/acd-tune-corpus-declares-its-reads.test.mjs","test/arch/planning/acd-tune-writes-nothing.test.mjs","test/integration/features/memory-tune-prompt.feature","test/integration/steps/memory-tune-prompt.steps.mjs","packages/work/src/memory-accounting.mjs","packages/work/src/memory-vocabulary.mjs","packages/work/src/feedback-records.mjs","packages/work/src/tune/formation.mjs","packages/work/src/tune/provenance.mjs","packages/work/src/acceptor/admissibility.mjs","packages/work/src/audit/reads.mjs","packages/work/src/audit/controls.mjs","packages/knowledge/src/memory/local-indexing.mjs","packages/core/src/application/bindings/work-tune/corpus.mjs","packages/core/src/application/bindings/commands/tune.mjs","test/arch/planning/acd-tune-carries-no-second-rule.test.mjs","test/arch/planning/acd-candidate-formation-is-lossless.test.mjs","packages/work/src/ref-scope.mjs","packages/work/src/discovery.mjs","packages/contracts/src/error.mjs","packages/work/src/counters.mjs","test/support/workspace/copied-work-runtime.mjs","test/integration/support/cli-context.mjs","test/integration/support/step-registry.mjs","test/integration/support/common-steps.mjs","test/integration/support/feature-runner.mjs","scripts/test.mjs","scripts/test-unit.mjs","scripts/test-workspace.mjs","wiki/work/153_milestone_memory-closes-the-loop/ARCHITECTURE.md#adr-003-one-read-model-supplies-accounting-and-advisory-health","wiki/work/153_milestone_memory-closes-the-loop/ARCHITECTURE.md#adr-005-tune-computes-a-reviewable-prompt-patch-without-applying-it"]
files: ["packages/work/src/tune/corpus.mjs","packages/work/src/tune/proposal.mjs","packages/work/src/commands/tune.mjs","packages/work/src/tune/distance.mjs","test/planning/tune-corpus.test.mjs","test/planning/tune-proposal.test.mjs","test/planning/tune-command.test.mjs","packages/work/test/tune-distance.suite.mjs","test/arch/planning/acd-tune-corpus-declares-its-reads.test.mjs","test/arch/planning/acd-tune-writes-nothing.test.mjs","test/integration/features/memory-tune-prompt.feature","test/integration/steps/memory-tune-prompt.steps.mjs"]
---

# 153/05 · Tune proposes promoted prompt corrections

## User story

As an AOF operator, I want to receive a computable prompt change for a recurring lesson with a prompt destination, so that I can review a concrete preventive change with its recurrence and recall evidence.

## Tasks

- [x] `tasks/01_use-memory-evidence.feature`
- [x] `tasks/02_compute-read-only-prompt-patches.feature`

## Notes

Read/write sets were derived then narrowed; see the milestone RESEARCH for the unavailable graph and owning-suite substitutions. No delivered feature is amended. 
