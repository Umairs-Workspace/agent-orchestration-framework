---
type: story
number: 06
slug: the-live-draw
title: "The live draw — this repo opts in with a style built from the console's tokens, and ADR-002's own diagram is drawn through the seam and read in the console"
parent: 133
depends: [01, 02, 03, 04, 05]
status: done
owner: product-owner
created: 2026-09-23
updated: 2026-09-23
adrs: [ADR-009, ADR-002]
reads:
  - wiki/work/133_milestone_architecture-diagrams/SPEC.md
  - wiki/work/133_milestone_architecture-diagrams/DESIGN.md
  - wiki/work/133_milestone_architecture-diagrams/ARCHITECTURE.md#ADR-002
  - wiki/work/133_milestone_architecture-diagrams/ARCHITECTURE.md#ADR-008
  - wiki/work/133_milestone_architecture-diagrams/ARCHITECTURE.md#ADR-009
  - ui/src/index.css
  - src/bundle/agents/aof-architect.md
  - src/commands/diagram/plan.mjs
  - src/diagrams/generator-diagram-design.mjs
  - src/commands/diagram/export.mjs
  - src/work/doctor-diagrams.mjs
  - ui/src/board/diagrams.mjs
files:
  - .aof/diagrams/style.md
  - .aof/aof.config.json
  - wiki/work/133_milestone_architecture-diagrams/ARCHITECTURE.md
  - wiki/work/133_milestone_architecture-diagrams/diagrams/ADR-002-generator-seam.html
  - wiki/work/133_milestone_architecture-diagrams/diagrams/ADR-002-generator-seam.svg
  - wiki/work/133_milestone_architecture-diagrams/diagrams/ADR-002-generator-seam.png
schema: 1
aofVersion: 0.1.0
---
# 06 · The live draw

## User story

As **the operator who asked for diagrams in the console's own style**,
I want **this repo to opt in with `.aof/diagrams/style.md` (a complete style guide mapped from
`ui/src/index.css`'s tokens and fonts) and ADR-002's diagram drawn through `aof diagram plan` and
`aof diagram export`, then seen in the board's ARCHITECTURE tab**,
so that **the whole path (config, seam, generator, export, gate, console) is proven on a real ADR at
the source, not on fixtures**.

What lands (ADR-009): the style file, the `work.diagrams` opt-in, ADR-002's source, SVG and PNG,
and the pasted block. Evidence recorded at the source: the plan envelope, the export envelope, a
clean `aof work doctor 133` for the diagram lane, and a board render of the tab.

## Tasks

- [x] `tasks/00_the-repo-opts-in-and-adr-002-is-drawn-through-the-seam.feature` — `@manual`: the token-mapped style file, the opt-in, `plan` → draw → `export` → paste on ADR-002, a clean diagram lane in `aof work doctor 133`, and the figure in this checkout's board
- [x] `tasks/01_the-operator-accepts-the-drawing.feature` — `@uat`: the operator judges the drawing against ADR-002's brief, the console's style, and its legibility as PNG and on GitHub

## Notes

- Both `.aof/` edits are committed BY HAND on the branch. A lane's reconcile drops `.aof/`.
- The style file follows the structure of the plugin's own `references/style-guide.md` (semantic
  roles, typography, stroke/radius/spacing, node treatments, the inversion rule). That file is read
  from the plugin install, which is outside the repo and is not a declared path.
- The operator judges the drawing against ADR-002's brief. The console frame is judged against
  DESIGN's checklist.
