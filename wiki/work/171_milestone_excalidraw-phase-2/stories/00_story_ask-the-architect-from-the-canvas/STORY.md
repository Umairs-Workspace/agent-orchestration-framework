---
type: story
number: 00
slug: ask-the-architect-from-the-canvas
title: "Ask the architect from the canvas — a selected shape offers Ask architect where it sits"
parent: 171
status: done
owner: product-owner
created: 2026-10-24
updated: 2026-10-25
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/171_milestone_excalidraw-phase-2/ARCHITECTURE.md#adr-001, wiki/work/171_milestone_excalidraw-phase-2/DESIGN.md, wiki/work/170_milestone_excalidraw-phase-1/VERIFICATION.md, packages/diagrams-ui/src/editor-state.mjs, packages/diagrams/src/scene-view.mjs, test/arch/diagrams/acd-diagrams-package-one-way.test.mjs]
files: [packages/diagrams-ui/src/canvas-anchor.mjs, packages/diagrams-ui/src/canvas-anchor.d.mts, packages/diagrams-ui/src/CanvasOverlay.tsx, packages/diagrams-ui/src/ExcalidrawEditor.tsx, packages/diagrams-ui/src/editor-state.mjs, packages/diagrams-ui/src/editor-state.d.mts, packages/diagrams-ui/package.json, packages/diagrams-ui/README.md, packages/diagrams-ui/test/canvas-anchor.suite.mjs, packages/diagrams-ui/test/index.mjs, test/arch/diagrams/acd-diagram-canvas-anchor-one-home.test.mjs, test/arch/diagrams/index.mjs, test/arch/testing/acd-source-directory-budget.test.mjs, test/smoke/diagram-editor.smoke.mjs]
---
# 00 · Ask the architect from the canvas

## User story

As **an operator reviewing a diagram in the editor**,
I want **to select a shape and ask the architect about it right where it sits on the canvas**,
so that **I ask about the shape I am looking at without moving to the bar below the canvas and
re-finding my place (F-170-11).**

## Tasks

- [x] `tasks/00_a-selection-offers-ask-architect.feature` — the overlay's Ask architect at a selection, the same ask as the bar's, placed through `canvas-anchor.mjs`
- [ ] `tasks/01_seen-in-the-browser.feature` — the action at a selected box, asking, pan and zoom, in the served editor

## Notes

- **The operator's ruling** (171/00 Q1, 2026-10-24): the canvas offers only Ask architect; adding a
  note stays in the editor's bar.
- **One overlay** (ADR-001): this story builds the overlay layer and `canvas-anchor.mjs`, the one
  module that turns scene bounds into a viewport position. Story 05 puts its pins in the same layer.
- **Same ask.** A canvas ask goes through the editor's one ask path — the request is recorded with
  the selection the bar would send, then launched as the bar's Ask architect launches it. Whether it
  starts a session or types into a running one is story 04's delivery, not this story's.
- **FF-17102** lands here: only `canvas-anchor.mjs` converts scene to viewport coordinates.
- **Look, then claim** (170 RETROSPECTIVE R1, R6, R8): the smoke's screenshots of the action at a
  selection are read, not only taken.
