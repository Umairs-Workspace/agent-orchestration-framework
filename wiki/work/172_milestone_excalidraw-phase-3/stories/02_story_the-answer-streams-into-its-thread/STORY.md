---
type: story
number: 02
slug: the-answer-streams-into-its-thread
title: "The answer streams into its thread — asking or replying reaches the server's session, and the answer is written into the thread with no terminal opened"
parent: 172
status: not-started
owner: product-owner
created: 2026-10-27
updated: 2026-10-27
schema: 1
aofVersion: 0.1.0
depends: [00, 01]
reads: [packages/diagrams-ui/src/conversation-model.mjs, packages/diagrams-ui/src/ConversationPanel.tsx, wiki/work/172_milestone_excalidraw-phase-3/ARCHITECTURE.md#adr-002, wiki/work/172_milestone_excalidraw-phase-3/ARCHITECTURE.md#adr-003, wiki/work/172_milestone_excalidraw-phase-3/DESIGN.md, wiki/work/172_milestone_excalidraw-phase-3/mocks/conversation-streaming.png, wiki/work/171_milestone_excalidraw-phase-2/ARCHITECTURE.md#adr-003, packages/diagrams-ui/src/review-stream.mjs, packages/diagrams-ui/test/review-stream.suite.mjs, packages/diagrams/src/review-session.mjs, packages/server/src/board-ui.mjs, packages/execution/src/conversation-session.mjs, apps/ui/src/diagram/dock-mount.mjs, apps/ui/src/diagram/diagram-address.mjs]
files: [packages/diagrams-ui/src/conversation-stream.mjs, packages/diagrams-ui/src/conversation-stream.d.mts, packages/diagrams-ui/src/conversation-model.mjs, packages/diagrams-ui/src/conversation-model.d.mts, packages/diagrams-ui/src/ConversationPanel.tsx, packages/diagrams-ui/src/CanvasOverlay.tsx, packages/diagrams-ui/src/ExcalidrawEditor.tsx, packages/diagrams-ui/src/editor-state.mjs, packages/diagrams-ui/src/editor-state.d.mts, packages/diagrams-ui/package.json, packages/diagrams-ui/test/conversation-stream.suite.mjs, packages/diagrams-ui/test/conversation-model.suite.mjs, packages/diagrams-ui/test/editor-state.suite.mjs, packages/diagrams-ui/test/index.mjs, packages/diagrams/test/house-style.suite.mjs, apps/ui/src/diagram/DiagramSurface.tsx, apps/ui/test/diagram-address.suite.mjs, test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs, test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs, test/arch/testing/acd-source-directory-budget.test.mjs, test/smoke/diagram-editor.smoke.mjs, test/smoke/stand-in-architect.mjs, wiki/work/172_milestone_excalidraw-phase-3/VERIFICATION.md]
---
# 02 · The answer streams into its thread

## User story

As **an operator asking the architect about a shape**,
I want **to watch the answer being written into that shape's thread, and to reply and watch the
next answer arrive the same way**,
so that **I can follow the architect's reasoning as it happens, in the editor, without a terminal
opening beside the canvas for every question (F-171-04).**

## Tasks

- [ ] `tasks/00_conversation-events-become-the-live-turn.feature` — the pure reducer from the stream's `conversation` events to each thread's live turn and the session's state
- [ ] `tasks/01_asking-and-replying-reach-the-server-session.feature` — what each editor action delivers, and the surface that opens no dock
- [ ] `tasks/02_seen-streaming-in-the-browser.feature` — a stand-in session streams into a real browser
- [ ] `tasks/03_a-live-answer-streams-into-the-thread.feature` — the operator's run with the real architect

## Notes

- **Two reducers, one panel.** `conversation-stream.mjs` reduces `conversation` events into
  `{ session, live: { [requestId]: turn } }`; `conversation-model.mjs` merges a live turn into its
  thread until the recorded architect turn for the same request arrives. The panel draws the merge.
- **The editor posts; the surface types nothing.** Ask, a reply, Review with the architect, Ask
  again and a first draft POST to `/api/diagram/conversation`; Save as note posts nothing.
  `DiagramSurface.tsx` stops rendering the dock and stops passing `onDeliver`; the dock's modules
  are retired in story 03.
- **Waiting notes still go after a question** (171/04 Q1, 2026-10-24): an Ask posts its own request,
  then a batch review when other notes are open; the server's queue answers them in that order.
- `apps/ui/src` is digest-frozen (FF-5307 in `acd-loop-state-rides-the-run-record`): re-pin with the
  measured diff and the reason. The diagrams-ui directory budget rises 18 → 20 with a row.
- **The stand-in architect** for the smoke is a node script launched through
  `AOF_ARCHITECT_EXECUTABLE` (ADR-001 §5): it reads stream-json lines, streams a scripted answer in
  deltas, then records it with the real `aof diagram scene --action respond`.
