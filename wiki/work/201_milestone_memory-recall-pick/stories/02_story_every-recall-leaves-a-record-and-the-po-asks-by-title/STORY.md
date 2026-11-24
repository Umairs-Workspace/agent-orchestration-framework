---
type: story
number: 02
slug: every-recall-leaves-a-record-and-the-po-asks-by-title
title: "Every recall leaves a record, and the PO asks by title — refine's PO recall is a text recall on the item's title, and the retrospective records both of its recalls, in every runtime's command"
parent: 201
status: in-review
owner: product-owner
created: 2026-11-17
updated: 2026-11-23
adrs: [ADR-006]
reads:
  - wiki/work/201_milestone_memory-recall-pick/stories/02_story_every-recall-leaves-a-record-and-the-po-asks-by-title/EXAMPLES.md
  - wiki/work/201_milestone_memory-recall-pick/ARCHITECTURE.md#ADR-006
  - wiki/work/archive/153_milestone_memory-closes-the-loop/ARCHITECTURE.md#ADR-001
  - wiki/work/archive/157_milestone_episodic-memory-is-recallable/ARCHITECTURE.md#ADR-004
  - packages/acd/assets/commands/continue.md
  - packages/acd/assets/commands/verify.md
  - packages/acd/assets/commands/shatter.md
  - packages/core/src/work/bundle.mjs
  - packages/work/src/feedback-records.mjs
  - packages/work/src/memory-accounting.mjs
  - test/support/cli-spawn.mjs
  - test/work/gate/work-audit-prompt-layer.test.mjs
files:
  - packages/acd/assets/commands/refine.md
  - packages/acd/assets/commands/retrospective.md
  - packages/acd/assets/variants/codex/workflow.md
  - packages/acd/assets/manifest.json
  - .claude/commands/aof/refine.md
  - .claude/commands/aof/retrospective.md
  - .opencode/commands/aof/refine.md
  - .opencode/commands/aof/retrospective.md
  - .agents/skills/aof-refine/SKILL.md
  - .agents/skills/aof-refine/procedure.md
  - .agents/skills/aof-refine/agents/openai.yaml
  - .agents/skills/aof-retrospective/SKILL.md
  - .agents/skills/aof-retrospective/procedure.md
  - .agents/skills/aof-retrospective/agents/openai.yaml
  - .codex/aof/workflows/workflow-contract.md
  - .aof/aof.lock.json
  - .aof/aof.apply-journal.json
  - test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs
  - test/integration/features/memory-recall-ledger.feature
  - test/integration/steps/memory-recall-ledger.steps.mjs
  - wiki/memory.md
schema: 1
aofVersion: 0.1.0
---
# 201/02 · Every recall leaves a record, and the PO asks by title

## User story

As **someone reading the recall ledger to learn what memory is worth**,
I want **the product owner's refine recall to return something, and the retrospective's two recalls
to be on the ledger like every other edge**,
so that **every recall an aof command runs can be found afterwards with what it returned and what
was made of it, and the PO's edge stops being empty by construction**.

What lands (ADR-006): two prompt edits and their renders. Refine's PO recall asks by the item's
title, with no item filter. The retrospective captures both of its recalls, as
`retrospective-domain` and `retrospective-evidence`. No runtime module changes, and the ledger
row keeps its shape. FF-20106 lands here, beside 124/FF-12405, whose retrospective case it
replaces.

## Tasks

- [x] `tasks/00_the-po-asks-by-the-items-title.feature` (R1): refine's PO recall is the item's title with no item filter, and its observation records that.
- [x] `tasks/01_the-retrospective-records-both-recalls.feature` (R2): both recalls are captured on the item, with a verdict for every record, even when no lesson is written.
- [x] `tasks/02_every-runtime-says-the-same.feature` (R3): the Claude, Codex and opencode commands carry the same edges, every recall has its capture, and the tracked renders are fresh.
- [ ] `tasks/03_the-untouched-edges-render-as-they-did.feature` (R3, `@manual`): the continue, verify and shatter commands show no difference from the commit the story started from.

## Notes

- 177 measured the PO's item-scoped recall as empty on 12 of 14 recalls. This refine saw it again:
  `--item 201` returned nothing, and the same words with no filter returned five records.
- The Codex variant is an authored source, not a render. It needs the same two edits by hand.
- The other five edges need no edit. They reach the pick through `--block`.
