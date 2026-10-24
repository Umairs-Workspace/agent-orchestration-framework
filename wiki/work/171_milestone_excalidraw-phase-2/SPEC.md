---
type: milestone
number: 171
slug: excalidraw-phase-2
title: "Excalidraw phase 2 — the editor follows the architect live and is easier to drive"
status: not-started
owner: product-owner
created: 2026-10-24
updated: 2026-10-24
schema: 1
aofVersion: 0.1.0
tags: [design, board, ui, work]
---
# 171 · Excalidraw phase 2 — the editor follows the architect live and is easier to drive

## Objective

Milestone 170 made an ADR's diagram an Excalidraw scene that the operator draws in and the architect
edits as Mermaid. Its UAT showed where the loop still makes the operator work around the editor: a note
can be added only from a bar below the canvas, a real icon library cannot be searched, a review the
architect finishes does not reach the open editor until the page is reloaded, and a draft comes out
uncoloured unless someone asks.

This milestone closes those gaps and takes phase 2 of
[wiki/planning/PRD-excalidraw-refinement.md](../../planning/PRD-excalidraw-refinement.md). An
outsider can check it. On a project with `work.diagrams` on, open a diagram in the editor, select a
shape and add a note from the canvas itself. Find an item in a large library by typing part of its
name. Run `/aof:diagram-review` in another session: its answer and its proposal appear in the open
editor without a reload. Request a first draft: it arrives coloured in the project's diagram style.
Talk to the architect about a shape from inside the diagram, without leaving the canvas.

## Scope

In scope:
- contextual notes: a selected shape offers "Add note" on the canvas (context menu or selection
  toolbar), scoped to the selection, as the bar below the canvas does today (170 VERIFICATION F-170-11)
- library search: the editor filters the Library panel by item or library name, over the global and
  project library roots (F-170-12; Excalidraw 0.18's panel has no search)
- a push channel for review records: answers and proposals reach the open editor as they are written,
  in place of the five-second poll, and the canvas reflects an accept without a reload (F-170-13,
  PRD phase 2)
- house-style colouring by default: a first draft and every new node follow the project's diagram
  style (`work.diagrams.style`), without a note asking for it
- in-diagram conversation (PRD phase 2): a note's thread is read and answered beside the shape it
  names, and a note typed into an open architect session lands as it is written

Out of scope:
- tier-two opt-out (core assembling the diagrams package optionally, so a build can omit it) — its own
  item; the seam from 170 is ready
- re-laying-out after an accept that grows a box (170 ADR-012) — a layout problem, not an interaction one
- a CLI-only export of a scene, and an `excalidraw` generator id so refine draws `.excalidraw` directly
- real-time multi-operator editing (a room or a CRDT) — the PRD's later future

## Stories

To be broken down by `aof:refine`.

## Dependencies

- `170_milestone_excalidraw-phase-1` — the scene store, the Mermaid profile, the review records, the
  editor route and the two library roots this milestone builds on
- `wiki/planning/PRD-excalidraw-refinement.md` — phase 2 is this milestone's source
