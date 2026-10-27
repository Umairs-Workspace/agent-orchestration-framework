---
type: story
number: 01
slug: every-conversation-in-one-panel
title: "Every conversation in one panel — threads, proposals and the composer beside the canvas, as the committed mocks draw them"
parent: 172
status: in-review
owner: product-owner
created: 2026-10-27
updated: 2026-10-27
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/172_milestone_excalidraw-phase-3/ARCHITECTURE.md#adr-003, wiki/work/172_milestone_excalidraw-phase-3/DESIGN.md, wiki/work/172_milestone_excalidraw-phase-3/mocks/conversation-streaming.png, wiki/work/172_milestone_excalidraw-phase-3/mocks/conversation-streaming-768.png, wiki/work/172_milestone_excalidraw-phase-3/mocks/conversation-ask.png, wiki/work/172_milestone_excalidraw-phase-3/mocks/conversation-proposal.png, wiki/work/171_milestone_excalidraw-phase-2/ARCHITECTURE.md#adr-001, wiki/work/171_milestone_excalidraw-phase-2/ARCHITECTURE.md#adr-006, packages/diagrams-ui/src/canvas-anchor.mjs, packages/diagrams-ui/src/editor-state.mjs, packages/diagrams/src/scene-view.mjs, apps/ui/src/index.css]
files: [packages/diagrams-ui/src/ConversationPanel.tsx, packages/diagrams-ui/src/conversation-model.mjs, packages/diagrams-ui/src/conversation-model.d.mts, packages/diagrams-ui/src/note-threads.mjs, packages/diagrams-ui/src/note-threads.d.mts, packages/diagrams-ui/src/NoteThread.tsx, packages/diagrams-ui/src/CanvasOverlay.tsx, packages/diagrams-ui/src/ExcalidrawEditor.tsx, packages/diagrams-ui/package.json, packages/diagrams-ui/test/conversation-model.suite.mjs, packages/diagrams-ui/test/note-threads.suite.mjs, packages/diagrams-ui/test/index.mjs, packages/diagrams-ui/test/canvas-anchor.suite.mjs, test/arch/testing/acd-source-directory-budget.test.mjs, packages/diagrams/test/house-style.suite.mjs, test/arch/diagrams/acd-diagram-canvas-anchor-one-home.test.mjs, test/smoke/diagram-editor.smoke.mjs, wiki/work/172_milestone_excalidraw-phase-3/VERIFICATION.md]
---
# 01 · Every conversation in one panel

## User story

As **an operator reviewing a diagram with the architect**,
I want **every note, answer, reply and proposal in one panel beside the canvas, opened from the
shape it is about**,
so that **I can read a long answer without it covering the drawing, and find any conversation on
the diagram in one place instead of across a popover, a review list and a bar.**

## Tasks

- [x] `tasks/00_threads-are-read-from-the-review-records.feature` — the one pure model of threads, their state and their proposals
- [x] `tasks/01_the-panel-is-the-one-place-a-thread-is-read.feature` — the panel replaces the review list, the note bar and the popover; pins and the canvas ask open threads in it
- [x] `tasks/02_seen-against-the-mocks.feature` — the panel, the ask and a proposal in a real browser, read against the committed mocks

## Notes

- **One model, absorbing 171's.** `conversation-model.mjs` takes over `note-threads.mjs`
  (`threadOf`, `notePins`, `noteStatus`, the reply flow) and adds threads, subjects and the
  proposal each thread holds; `note-threads.mjs` and its suite go. `NotePinButton` moves into
  `CanvasOverlay.tsx`, and `NoteThread.tsx` (the popover) goes. `ConversationPanel.tsx` takes its
  place, so the diagrams-ui directory count does not move (ceiling 18).
- **Records only.** Delivery is unchanged here: Ask still reaches the architect through the
  surface's existing path. Streaming into the thread is story 02.
- **SDK container** (171 RETROSPECTIVE R4): every field the panel or overlay renders inside the
  SDK's container stops keydown and keyup, and re-declares the console tokens it uses.
- The smoke's 171 checks that drive the bar, the review list and the popover move to the panel.
