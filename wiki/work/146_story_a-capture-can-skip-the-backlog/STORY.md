---
type: story
number: 146
slug: a-capture-can-skip-the-backlog
title: "A capture can skip the backlog — a switch on the add commands sends one item straight into the stream, whatever work.intake says"
status: in-progress
owner: product-owner
created: 2026-10-03
updated: 2026-10-03
schema: 1
aofVersion: 0.1.0
reads:
  - wiki/work/archive/127_milestone_backlog-and-archive/ARCHITECTURE.md#ADR-003
  - wiki/work/archive/127_milestone_backlog-and-archive/ARCHITECTURE.md#ADR-005
  - packages/core/assets/commands/promote.md
  - test/arch/work/acd-one-mint.test.mjs
  - test/arch/work/acd-intake-write-side-only.test.mjs
  - test/examples/refine-discovery-beat.test.mjs
files:
  - packages/core/assets/commands/add-milestone.md
  - packages/core/assets/commands/add-story.md
  - packages/core/assets/commands/add-chore.md
  - packages/core/assets/commands/add-spike.md
  - packages/core/assets/commands/add-uat.md
  - packages/core/assets/manifest.json
  - .aof/aof.lock.json
  - test/work/work-add-in-stream.test.mjs
  - test/work/index.mjs
  - .claude/commands/aof/add-milestone.md
  - .claude/commands/aof/add-story.md
  - .claude/commands/aof/add-chore.md
  - .claude/commands/aof/add-spike.md
  - .claude/commands/aof/add-uat.md
  - .codex/skills/aof-add-milestone/SKILL.md
  - .codex/skills/aof-add-story/SKILL.md
  - .codex/skills/aof-add-chore/SKILL.md
  - .codex/skills/aof-add-spike/SKILL.md
  - .codex/skills/aof-add-uat/SKILL.md
  - .opencode/commands/aof/add-milestone.md
  - .opencode/commands/aof/add-story.md
  - .opencode/commands/aof/add-chore.md
  - .opencode/commands/aof/add-spike.md
  - .opencode/commands/aof/add-uat.md
---
# 146 · A capture can skip the backlog

## User story

As **the operator on a project whose `work.intake` is `"backlog"`**,
I want **an `--in-stream` switch on the `aof:add-*` commands that sends this one item straight
into the stream, numbered, at the tail**,
so that **work I mean to do now is ready to refine the moment it is captured. Today it is captured
into the backlog and then promoted by hand, and the only alternative is flipping `work.intake`
for the whole project, which changes every later capture as well.**

## Tasks

- [ ] `tasks/00_the-add-commands-take-in-stream.feature` — the five add prompts carry `--in-stream`,
  and their rendered copies match a fresh render
- [ ] `tasks/01_a-capture-lands-in-the-stream.feature` — one capture driven end to end in a scratch
  project under a backlog intake

## Notes

- **Measured instance (2026-10-03):** story `loop-diagram` was captured by `aof:add-story` into
  `backlog/story_loop-diagram/` under `work.intake: "backlog"`, then needed a separate
  `aof:promote loop-diagram` before it could be refined as 145.
- **Where intake is read today:** only in the add commands' prose
  (`packages/core/assets/commands/add-{milestone,story,chore,spike,uat}.md`). Each scaffolds into
  `backlog/` and runs `aof work promote <slug> --json` when the intake is `"stream"`. No CLI verb
  scaffolds an item, so the switch is a bundle-command argument.
- **The mint stays with `aof work promote`** (41/ADR-002, 127/ADR-003 §1). The switch decides only
  WHETHER promote runs straight after the capture. It never works out a number itself.
- **Scope, settled with the operator at refine (EXAMPLES.md Q1–Q5):** the switch is spelled
  `--in-stream`, appends at the tail only (a position stays with `aof:insert-*` and
  `aof:promote … at P`), and there is no switch in the other direction. A nested story
  (`under milestone NN`) has no stream number and is not part of this story.
