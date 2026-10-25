---
type: story
number: 03
slug: drafts-in-the-house-style
title: "Drafts in the house style — a first draft, every new node and every hand-drawn shape start in the project's diagram style"
parent: 171
status: in-review
owner: product-owner
created: 2026-10-24
updated: 2026-10-25
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/171_milestone_excalidraw-phase-2/ARCHITECTURE.md#adr-004, .aof/diagrams/style.md, packages/diagrams/src/mermaid-profile.mjs, packages/diagrams/src/scene-view.mjs, packages/diagrams/src/commands/plan.mjs, packages/diagrams-ui/src/compile.mjs, test/arch/command/acd-cli-entry-executes.test.mjs]
files: [packages/diagrams/src/house-style.mjs, packages/diagrams/src/house-style.d.mts, packages/diagrams/src/commands/scene.mjs, packages/diagrams/package.json, packages/diagrams-ui/src/ExcalidrawEditor.tsx, packages/diagrams/test/house-style.suite.mjs, packages/diagrams/test/index.mjs, test/diagrams/diagram-scene-command.test.mjs, test/diagrams/diagram-scene-review.test.mjs, packages/core/assets/commands/diagram-review.md, packages/core/assets/variants/codex/workflow.md, .aof/aof.lock.json, .aof/aof.apply-journal.json, .claude/commands/aof/diagram-review.md, .opencode/commands/aof/diagram-review.md, .agents/skills/aof-diagram-review/SKILL.md, packages/core/assets/manifest.json, test/arch/command/acd-cli-entry-executes.test.mjs, test/arch/testing/acd-source-directory-budget.test.mjs, test/smoke/diagram-editor.smoke.mjs]
---
# 03 · Drafts in the house style

## User story

As **an operator who asks the architect for a first draft**,
I want **the draft, every node the architect adds later and every shape I draw by hand to start in
the project's diagram style**,
so that **a diagram reads as part of the console from its first version, without a second note asking
for colours (170 UAT).**

## Tasks

- [x] `tasks/00_the-palette-comes-from-the-style-guide.feature` — the palette read from the semantic-roles table, or none
- [x] `tasks/01_propose-fills-in-the-house-style.feature` — added nodes filled in at propose, library items and existing nodes left alone; context and the prompt name the palette
- [x] `tasks/02_hand-drawn-shapes-start-in-the-house-style.feature` — the canvas defaults from the palette `read` carries
- [ ] `tasks/03_seen-in-the-browser.feature` — a first draft and a hand-drawn rectangle in the served editor

## Notes

- **One source** (ADR-004): `house-style.mjs` reads the style guide's semantic-roles table into a
  palette; nothing copies it into config. No style, or no readable table, means no palette and
  Excalidraw's own defaults.
- **Filled in at propose.** An added node with no `style` line and no library item gets the default
  node style in the stored proposal, so Preview and the record say what will be drawn.
- **Hand-drawn shapes** start in the house style (operator's ruling, 2026-10-24): the editor sets the
  canvas's default colours from the palette that `read` carries.
- **Library items are never recoloured.**
- The prompt keeps `style` lines for emphasis (`link`, `accent`), named from the palette `context`
  carries.
