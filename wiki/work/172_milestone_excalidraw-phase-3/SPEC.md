---
type: milestone
number: 172
slug: excalidraw-phase-3
title: "Excalidraw phase 3 — the architect conversation streams into the editor, through a designed UI"
status: not-started
owner: product-owner
created: 2026-10-25
updated: 2026-10-25
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

To be broken down (`aof:refine`).

## Dependencies

- `171_milestone_excalidraw-phase-2` — the overlay, the review stream, note threads and delivery to
  the live session this milestone re-presents
- `wiki/planning/PRD-excalidraw-refinement.md` — the phase plan this continues
