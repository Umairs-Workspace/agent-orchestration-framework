---
type: story
number: 05
slug: a-note-is-a-thread-beside-its-shape
title: "A note is a thread beside its shape — follow-ups both ways, read and answered on the canvas"
parent: 171
status: in-review
owner: product-owner
created: 2026-10-24
updated: 2026-10-25
schema: 1
aofVersion: 0.1.0
depends: [00, 04]
reads: [wiki/work/171_milestone_excalidraw-phase-2/ARCHITECTURE.md#adr-006, apps/ui/src/diagram/DiagramSurface.tsx, wiki/work/171_milestone_excalidraw-phase-2/ARCHITECTURE.md#adr-001, wiki/work/171_milestone_excalidraw-phase-2/ARCHITECTURE.md#adr-005, wiki/work/171_milestone_excalidraw-phase-2/DESIGN.md, packages/diagrams-ui/src/canvas-anchor.mjs, packages/diagrams-ui/src/CanvasOverlay.tsx, packages/diagrams/src/scene-view.mjs, packages/diagrams/src/layout.mjs]
files: [packages/diagrams/src/commands/scene.mjs, packages/diagrams-ui/src/note-threads.mjs, packages/diagrams-ui/src/note-threads.d.mts, packages/diagrams-ui/src/NoteThread.tsx, packages/diagrams-ui/src/CanvasOverlay.tsx, packages/diagrams-ui/src/canvas-anchor.mjs, packages/diagrams-ui/src/canvas-anchor.d.mts, packages/diagrams-ui/src/LibrarySearch.tsx, packages/diagrams-ui/src/ExcalidrawEditor.tsx, packages/diagrams-ui/package.json, packages/diagrams-ui/test/note-threads.suite.mjs, packages/diagrams-ui/test/index.mjs, test/diagrams/diagram-scene-review.test.mjs, test/fixtures/application/command-inventory.json, packages/core/assets/commands/diagram-review.md, packages/core/assets/variants/codex/workflow.md, .aof/aof.lock.json, .aof/aof.apply-journal.json, .claude/commands/aof/diagram-review.md, .opencode/commands/aof/diagram-review.md, .agents/skills/aof-diagram-review/SKILL.md, packages/core/assets/manifest.json, test/arch/testing/acd-source-directory-budget.test.mjs, test/smoke/diagram-editor.smoke.mjs, .agents/skills/aof-diagram-review/agents/openai.yaml, .codex/aof/workflows/workflow-contract.md]
---
# 05 · A note is a thread beside its shape

## User story

As **an operator discussing a shape with the architect**,
I want **each note to be a conversation pinned beside the shape it names, where I read the
architect's answer and reply**,
so that **a question about a box is settled next to that box, with its history in one place, without
leaving the canvas.**

## Tasks

- [x] `tasks/00_a-note-is-a-thread.feature` — `reply` and `respond` as turns on the request record; old records read as threads; context and the prompt carry the thread
- [x] `tasks/01_threads-beside-their-shapes.feature` — pins by shape, the pin's colour, a reply delivered to a running session
- [ ] `tasks/02_seen-in-the-browser.feature` — a pin and its thread in the served editor
- [ ] `tasks/03_a-live-architect-answers-in-the-thread.feature` — the operator's run with a real architect session

## Notes

- **One record** (ADR-006, R5): `thread` lives on the request record; `reply` appends the operator's
  turn and reopens the note; `respond` appends the architect's and still sets `answer`, so every
  existing reader keeps working. An older record reads as the thread its request and answer imply.
- **Beside the shape** (ADR-001): pins and the thread popover are components of story 00's overlay,
  positioned only through `canvas-anchor.mjs`. A whole-diagram note stays in the review panel.
- **A reply lands** in an open architect session through story 04's delivery function.
- **Depends on 00 and 04** for exactly those two seams.
