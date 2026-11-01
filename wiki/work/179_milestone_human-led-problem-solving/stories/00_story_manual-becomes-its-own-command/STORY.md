---
type: story
number: 00
slug: manual-becomes-its-own-command
title: "Manual becomes its own command — `aof:manual <ref>` prints 149's guide, `continue` builds only, and a hand-off to an agent is written down"
parent: 179
depends: []
status: in-review
owner: product-owner
created: 2026-10-28
updated: 2026-10-31
adrs: [ADR-001, ADR-002, ADR-003]
reads:
  - wiki/work/179_milestone_human-led-problem-solving/SPEC.md
  - wiki/work/179_milestone_human-led-problem-solving/ARCHITECTURE.md#ADR-001
  - wiki/work/179_milestone_human-led-problem-solving/ARCHITECTURE.md#ADR-002
  - wiki/work/179_milestone_human-led-problem-solving/ARCHITECTURE.md#ADR-003
  - wiki/work/178_spike_guided-mode-boundary/SPIKE.md#finding
  - wiki/work/149_story_continue-manual-mode-guides-the-operator/tasks/00_a-manual-continue-hands-the-operator-a-guide.feature
  - wiki/work/149_story_continue-manual-mode-guides-the-operator/tasks/01_manual-is-one-story-here-at-every-door.feature
  - packages/core/src/application/bindings/commands/continue.mjs
  - packages/work/src/effects.mjs
  - packages/work/src/commands/resume.mjs
  - packages/work/test/reentry.test.mjs
  - packages/core/src/work/bundle.mjs
  - scripts/generate-bundle-manifest.mjs
  - test/arch/bundle/acd-bundle-membership.test.mjs
files:
  - packages/core/assets/commands/manual.md
  - packages/core/assets/commands/continue.md
  - packages/core/assets/commands/review.md
  - packages/core/assets/variants/codex/workflow.md
  - packages/core/assets/bundle.json
  - packages/core/assets/manifest.json
  - packages/work/src/commands/continue.mjs
  - .claude/commands/aof/manual.md
  - .agents/skills/aof-manual/SKILL.md
  - .opencode/commands/aof/manual.md
  - .claude/commands/aof/continue.md
  - .agents/skills/aof-continue/SKILL.md
  - .opencode/commands/aof/continue.md
  - .claude/commands/aof/review.md
  - .agents/skills/aof-review/SKILL.md
  - .opencode/commands/aof/review.md
  - .agents/skills/aof-continue/procedure.md
  - .agents/skills/aof-manual/procedure.md
  - .agents/skills/aof-manual/agents/openai.yaml
  - .agents/skills/aof-continue/agents/openai.yaml
  - .agents/skills/aof-review/procedure.md
  - .agents/skills/aof-review/agents/openai.yaml
  - .codex/aof/workflows/workflow-contract.md
  - .aof/aof.lock.json
  - README.md
  - docs/acd.md
  - packages/core/test/bundle.suite.mjs
  - test/loop/autonomous-shell-out-prompt.test.mjs
  - test/surfaces/board-mesh-execution.test.mjs
  - test/work/story-context-contract.test.mjs
  - test/arch/command/acd-continue-builds-only.test.mjs
  - test/arch/command/index.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs
  - packages/core/test/bundle-runtime-variants.suite.mjs
  - wiki/prompt-audit.md
  - wiki/work/archive/142_milestone_yarn-workspace-modularization/plans/09-test-ledger.json
schema: 1
aofVersion: 0.1.0
---
# 179/00 · Manual becomes its own command

## User story

As **an operator who writes a story's code myself**,
I want **`aof:manual <ref>` to hand me 149's guide as its own command, entering through the same
door and refusing the same things, while `aof:continue` carries nothing but builds**,
so that **every build's prompt stops paying for a mode it never runs, and the next operator-led
mode, teaching, has a pattern to follow instead of a region to squeeze into `continue`**.

What lands (ADR-001 to ADR-003): `manual.md` and its Codex section, `continue.md` with no manual
region, the door answering `--manual` with `/aof:manual <ref>`, the docs, and FF-17901. What the guide
prints does not change. It also lands the hand-off record (ADR-003 §6–§7): `aof:manual` writes a
`Hand-off` entry into STATE when the human asks for an agent, and `continue`'s story lane reads it.
`aof:teach` reuses the same rule in 02.

## Tasks

- [x] 00 [manual is its own command, and continue builds only](tasks/00_manual-is-its-own-command.feature)
- [x] 01 [the door answers --manual with the manual command](tasks/01_the-door-answers-manual-with-its-command.feature)
- [x] 02 [a hand-off to an agent is written down](tasks/02_a-hand-off-is-written-down.feature)

## Notes

- **Supersedes delivered criteria (ADR-001 §5).** 149/00's E1–E4, its rule outline, its `<output>`
  row and its argument hint, and 149/01's E7 command text place manual inside `continue`. The 149
  `.feature` files are not edited. This story's contract states the replacements, and the 149 rows
  in `autonomous-shell-out-prompt.test.mjs` and `board-mesh-execution.test.mjs` follow it.
- One deliberate behaviour change, from spike 178 item 4: the manual command no longer walks the
  re-entry sweep, so it can never carry on an agent lineage (ADR-003 §2).
- `packages/core/assets/commands` and `test/arch/command` each gain a file. Their budget rows move,
  with the reasons stated. Several suites gain rows, so the 142 test ledger is in `files:` (149/R2).
- The contract deriver (`story-contract-derive.mjs`) has no CLI face. The sets were drawn by hand
  from `aof graph impact` on the door, the binding and the bundle loader, plus each module's
  owning suite.
