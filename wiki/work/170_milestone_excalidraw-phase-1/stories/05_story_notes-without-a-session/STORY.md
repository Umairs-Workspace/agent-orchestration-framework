---
type: story
number: 05
slug: notes-without-a-session
title: "Notes without a session — a note on selected shapes or the whole diagram records a review request and launches nothing; the review panel lists and withdraws notes"
parent: 170
status: in-review
owner: product-owner
created: 2026-10-20
updated: 2026-10-24
schema: 1
aofVersion: 0.1.0
depends: [00]
reads: [wiki/work/170_milestone_excalidraw-phase-1/ARCHITECTURE.md#adr-004, wiki/work/170_milestone_excalidraw-phase-1/ARCHITECTURE.md#adr-010, wiki/work/170_milestone_excalidraw-phase-1/VERIFICATION.md]
files: [packages/diagrams-ui/src/editor-state.mjs, packages/diagrams-ui/src/editor-state.d.mts, packages/diagrams-ui/src/ExcalidrawEditor.tsx, packages/diagrams/src/commands/scene.mjs, packages/diagrams-ui/test/editor-state.suite.mjs, test/diagrams/diagram-scene-review.test.mjs]
---
# 05 · Notes without a session

## User story

As **the operator, marking up a diagram while no agent is running**,
I want **to leave a note on the shapes I selected, or on the whole diagram, without the editor
starting a session, and to see my open notes and withdraw one**,
so that **I can annotate at my own pace and have every note answered later in one review.**

## Tasks

Built on the branch before the milestone was imported, so it has no task contract. The evidence is
VERIFICATION.md, and acceptance goes through `aof:verify 170`.

## Notes

- **A note is a review request** that names the selection as Mermaid ids (ADR-010). Add note starts
  no terminal. The browser smoke checks this.
- **The review panel** lists open notes, and `withdraw` closes one. A note the architect has
  answered by proposal is `proposed`, not `open`, so it can no longer be withdrawn or proposed for
  again (RETROSPECTIVE R2).
