---
type: milestone
number: 172
slug: excalidraw-phase-3
title: "Excalidraw phase 3 — the architect conversation streams into the editor, through a designed UI"
status: done
owner: product-owner
created: 2026-10-25
updated: 2026-10-28
schema: 1
aofVersion: 0.1.0
tags: [design, board, ui, work]
---
# 172 · Excalidraw phase 3 — the architect conversation streams into the editor, through a designed UI

## Objective

Milestone 171 made the architect conversation work end to end inside the diagram editor: ask at a
shape, see the answer pushed into the shape's thread, reply, and the reply reaches the same live
session. Its UAT also showed the conversation is not fit to use: every question opens or types into
a visible terminal dock beside the canvas, and the operator judged the editor's conversation surfaces
poor enough to want a proper design before more is built on them (171 VERIFICATION F-171-04).

This milestone makes the conversation an editor surface rather than a terminal one. An outsider can
check it: open a diagram, ask the architect about a shape, and watch the answer stream into that
shape's thread with no terminal opened; reply, and see the next answer stream in the same way; every
conversation surface matches a committed design mock.

## Scope

In scope:
- streaming the architect's answers into the editor: a question or reply is answered in its thread
  as the answer is produced, with no dock opened per question (F-171-04)
- a designed UI for the editor's conversation surfaces — the ask at a selection, the note pins and
  their thread, the review panel — authored as committed mocks first (171 OUTCOME gap: no mocks), and
  where replies live (171 refine's open assumption) decided in that design
- the canvas drawing skewing after a right-click until reload, with the saved scene intact
  (F-171-03) — reproduced first, then fixed or ruled out by the overhaul

Out of scope:
- tier-two opt-out of the diagrams package, re-layout after an accept that grows a box, a CLI-only
  export and an `excalidraw` generator id — carried from 171's out-of-scope list
- real-time multi-operator editing (a room or a CRDT) — the PRD's later future

## Stories

- [x] `stories/00_story_the-architect-answers-in-a-headless-session/` — one stream-json `claude` per open diagram on the board's server, its turns streamed on the diagram's events stream (ADR-001, ADR-002)
- [x] `stories/01_story_every-conversation-in-one-panel/` — threads, proposals and the composer in one panel beside the canvas, as the committed mocks draw them (ADR-003)
- [x] `stories/02_story_the-answer-streams-into-its-thread/` — asking and replying reach the server's session and the answer is written into the thread, no terminal opened (depends 00, 01)
- [x] `stories/03_story_the-diagram-surface-has-no-terminal/` — the dock's posture author and the terminal's later-input seam leave with the dock (depends 02)
- [x] `stories/04_story_a-right-click-leaves-the-drawing-true/` — F-171-03 reproduced first, then fixed or ruled out

00 and 01 are independent and build in parallel; 04 is independent of both but shares the browser
smoke and the editor with 01, so the waves serialise it beside 01. The boundaries follow the code's
own seams: the server half (`@aof/execution`, `@aof/diagrams`' scene command, the board face and its
core binding) never imports the editor, and the editor reaches it only through the conversation route
and the events stream — so 00 and 01 share no file. The codebase graph was not available to cite
(`graphify-timeout`, STATE); the coupling was read from the importers of each boundary module.

## Dependencies

- `171_milestone_excalidraw-phase-2` — the overlay, the review stream, note threads and delivery to
  the live session this milestone re-presents
- `wiki/planning/PRD-excalidraw-refinement.md` — the phase plan this continues
