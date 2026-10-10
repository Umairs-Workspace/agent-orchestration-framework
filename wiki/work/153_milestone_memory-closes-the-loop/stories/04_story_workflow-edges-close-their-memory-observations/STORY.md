---
type: story
number: 04
slug: workflow-edges-close-their-memory-observations
title: "Workflow edges close their memory observations"
parent: 153
status: not-started
owner: product-owner
created: 2026-10-10
updated: 2026-10-10
depends: [153/02]
schema: 1
aofVersion: 0.1.0
reads: ["packages/core/assets/commands/shatter.md","packages/core/assets/commands/refine.md","packages/core/assets/commands/continue.md","packages/core/assets/commands/retrospective.md","packages/core/assets/manifest.json","test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs",".agents/skills/aof-shatter/procedure.md",".agents/skills/aof-refine/procedure.md",".agents/skills/aof-continue/procedure.md",".agents/skills/aof-retrospective/procedure.md",".claude/commands/aof/shatter.md",".claude/commands/aof/refine.md",".claude/commands/aof/continue.md",".claude/commands/aof/retrospective.md",".opencode/commands/aof/shatter.md",".opencode/commands/aof/refine.md",".opencode/commands/aof/continue.md",".opencode/commands/aof/retrospective.md",".aof/aof.lock.json",".aof/aof.apply-journal.json","packages/core/src/render-plan.mjs","packages/core/src/work/bundle.mjs","packages/core/src/work/bundle-synthesis.mjs","packages/core/src/adapters.mjs","packages/core/src/application/bindings/work/init.mjs","packages/knowledge/src/memory.mjs","packages/knowledge/src/commands/memory.mjs","packages/work/src/memory-vocabulary.mjs","packages/work/src/feedback-records.mjs","packages/core/assets/loops/retrospective-memory-ingest.md","test/arch/work/acd-memory-vocabulary-one-home.test.mjs","test/support/cli-spawn.mjs","packages/core/src/lock.mjs","test/integration/support/cli-context.mjs","test/integration/support/step-registry.mjs","test/integration/support/common-steps.mjs","test/integration/support/feature-runner.mjs","scripts/test.mjs","scripts/test-unit.mjs","scripts/test-workspace.mjs","wiki/work/153_milestone_memory-closes-the-loop/ARCHITECTURE.md#adr-001-complete-recall-observations-enter-the-existing-ledger","wiki/work/153_milestone_memory-closes-the-loop/ARCHITECTURE.md#adr-002-forward-metadata-and-calibrated-recurrence-share-existing-readers","wiki/work/153_milestone_memory-closes-the-loop/ARCHITECTURE.md#adr-004-declared-edges-retain-their-original-retrieval-scope"]
files: ["packages/core/assets/commands/shatter.md","packages/core/assets/commands/refine.md","packages/core/assets/commands/continue.md","packages/core/assets/commands/retrospective.md","packages/core/assets/manifest.json","test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs",".agents/skills/aof-shatter/procedure.md",".agents/skills/aof-refine/procedure.md",".agents/skills/aof-continue/procedure.md",".agents/skills/aof-retrospective/procedure.md",".claude/commands/aof/shatter.md",".claude/commands/aof/refine.md",".claude/commands/aof/continue.md",".claude/commands/aof/retrospective.md",".opencode/commands/aof/shatter.md",".opencode/commands/aof/refine.md",".opencode/commands/aof/continue.md",".opencode/commands/aof/retrospective.md",".aof/aof.lock.json",".aof/aof.apply-journal.json"]
---

# 153/04 · Workflow edges close their memory observations

## User story

As an AOF operator, I want to have the declared framing, build and retrospective procedures capture memory evidence at the decision they affect, so that accounting reflects actual decisions across supported runtimes instead of relying on optional prose.

## Tasks

- [ ] `tasks/01_capture-declared-edges.feature`
- [ ] `tasks/02_compile-and-demonstrate-lessons.feature`

## Notes

Read/write sets were derived then narrowed; see the milestone RESEARCH for the unavailable graph and owning-suite substitutions. No delivered feature is amended. Generated outputs are renderer-owned; pre-existing local changes must be preserved.
