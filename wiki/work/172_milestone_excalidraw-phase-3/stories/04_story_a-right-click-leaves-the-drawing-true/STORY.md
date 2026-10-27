---
type: story
number: 04
slug: a-right-click-leaves-the-drawing-true
title: "A right-click leaves the drawing true — F-171-03 reproduced first, then fixed or ruled out"
parent: 172
status: not-started
owner: product-owner
created: 2026-10-27
updated: 2026-10-27
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/171_milestone_excalidraw-phase-2/VERIFICATION.md, wiki/work/171_milestone_excalidraw-phase-2/diagrams/ADR-003-push-stream.excalidraw, packages/diagrams-ui/src/canvas-anchor.mjs]
files: [test/smoke/diagram-editor.smoke.mjs, packages/diagrams-ui/src/CanvasOverlay.tsx, packages/diagrams-ui/src/ExcalidrawEditor.tsx, wiki/work/172_milestone_excalidraw-phase-3/VERIFICATION.md]
---
# 04 · A right-click leaves the drawing true

## User story

As **an operator working on a diagram in the editor**,
I want **the drawing to stay exactly as it is after I right-click the canvas**,
so that **I never misread a diagram whose arrows have lost segments or whose labels have piled onto
one edge, and never have to reload to trust what I see (F-171-03).**

## Tasks

- [ ] `tasks/00_the-skew-is-reproduced-first.feature` — the gestures driven in a real browser over 171's diagram, the outcome recorded either way
- [ ] `tasks/01_the-drawing-holds-after-a-right-click.feature` — the browser check that holds the drawing true after each gesture

## Notes

- **Reproduce before touching code** (SPEC scope). The operator saw it once at 171's `@uat` on
  `ADR-003-push-stream.excalidraw` (36 elements, the saved scene clean); the verifier's right-click
  on empty canvas and Escape did not show it. Drive the gestures over a copy of that exact scene.
- **Where a fix may land is not known yet:** `files:` names the overlay and the editor because a
  render-only skew that a reload cures points at aof's layer over the SDK (the overlay re-renders on
  every app-state change the menu makes) or at an `updateScene` the editor issues; a cause inside
  the SDK is recorded as such, with the pinned version, and not patched (m170/ADR-001).
- **Ruled out is an outcome, not a shrug:** after story 01's panel lands, the same gestures are run
  again on the overhauled editor, and the record names each gesture and its screenshots.
