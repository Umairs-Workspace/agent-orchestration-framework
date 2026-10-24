---
type: milestone
number: 170
slug: excalidraw-phase-1
title: "Excalidraw phase 1 — an ADR diagram is an Excalidraw scene the architect reads and edits as Mermaid, annotated by the operator, and examined by one command"
status: in-review
owner: product-owner
created: 2026-10-20
updated: 2026-10-24
schema: 1
aofVersion: 0.1.0
tags: [design, board, ui, work]
---
# 170 · Excalidraw phase 1

The phase-1 cut of [wiki/planning/PRD-excalidraw-refinement.md](../../planning/PRD-excalidraw-refinement.md).
It was built ahead of the stream on `feat/excalidraw-collaborative-refinement` in a hand-numbered
temporary folder, `200_milestone_excalidraw-phase-1`, and imported as 170 with `aof migrate` on
2026-10-24 (RETROSPECTIVE R4). Phase 2 (in-diagram conversation, a push channel instead of the poll)
is out of scope here and stays in the PRD.

## Objective

An ADR's diagram is an Excalidraw scene, `diagrams/ADR-NNN-<slug>.excalidraw`, that holds everything
the editor draws — boxes and arrows, items from the project's own `.excalidrawlib` libraries, free
drawing — and the architect reads and edits it as Mermaid, the aof Mermaid profile (ADR-010). An
operator opens it from the ARCHITECTURE tab in the editor; requests a first draft rather than facing
an empty canvas; draws, inserts library items and annotates — a note on selected shapes, or on the
whole diagram — without starting an agent session; and later, from any Claude session, runs one
command that examines every open note and answers each one: a question gets a recorded answer, a
change request gets a proposal — the diagram as Mermaid, edited — that the operator previews and
accepts, applied element by element so their own edits stay. Publish writes the figure the ADR shows
from the same canvas. Nothing changes without the operator's action.

An outsider can check it. On a project with `work.diagrams` configured, open a milestone's
ARCHITECTURE tab, expand a figure and choose Edit draft: the editor opens at `/diagram`. Request a
first draft, run the review, accept it: the shapes appear, and
`aof diagram scene <ref> <file> --action context` shows them as Mermaid. Put an `.excalidrawlib` in
`.aof/diagrams/libraries/`, insert one of its items from the Library panel and draw a stroke; save:
the Mermaid view names the item (`%% aof:lib`) and the stroke (`%% aof:sketch`). Add a note, close the
editor. In a Claude session run `/aof:diagram-review <ref> <ADR-NNN-slug.excalidraw>`: the note is
answered, and if it asked for a change, a proposal is pending in the editor's review panel. Accept it:
the change lands, and the library item and the stroke stay exactly as drawn. Publish: the
ARCHITECTURE tab shows the new figure. On a project with `work.diagrams` unset, the figure offers no
Edit draft and the board fetches none of the editor.

## Scope

In scope:
- the native draft store and the review loop: save with optimistic revisions and an exclusive
  lock; request, respond, propose, proposals, accept and reject as `aof diagram scene` actions;
  accept merges only the touched elements and refuses a stale proposal (delivered, PR #13)
- diagramming as a package pair the build can leave out: `@aof/diagrams` (layout, generator
  registry, the `diagram:*` verbs, the doctor lane) and `@aof/diagrams-ui` (the editor, its pure
  state, the SDK and its fonts), one contribution each, dependencies one way (delivered)
- the opt-out seam: `aof diagram capability` / `GET /api/diagram/capability`, the editor following
  the generator switch, an absent package answering the same shape (delivered)
- the editor as a routed surface, `/diagram?ref=&file=`, listed under no nav item, with the
  architect's session in the dock beside the canvas (delivered)
- ONE STORE, ONE INTERFACE (ADR-010, superseding ADR-005 and ADR-006–ADR-009): the diagram is
  Excalidraw's own scene, written canonically; the architect reads it projected into the aof Mermaid
  profile and proposes that view edited. No second DSL: Mermaid is the interface.
- PROJECT LIBRARIES used as they are (ADR-011): `.aof/diagrams/libraries/*.excalidrawlib` load into
  the editor's Library panel, every insertion keeps its library and item, and the architect places an
  item by name (`%% aof:lib`) without describing its shapes
- COMPILE AND ACCEPT element by element (ADR-012): the editor compiles a proposal's changes into
  element edits; accept refuses as stale, by Mermaid id, anything the proposal touches that a person
  changed since, and refuses an edit outside what it touches
- PUBLISH from the canvas (ADR-013): SVG, and PNG when owed, written where the ADR's block links
- a FIRST DRAFT, so the editor stops opening empty: requested from the editor, proposed by the
  architect as a whole diagram in the profile, drawn on accept by Excalidraw's own converter
- NOTES without a session: the editor records a review request without launching the dock, lists
  open notes in its review panel, and lets the operator withdraw one
- the batch review: `/aof:diagram-review <ref> <file>` with no request id examines every open
  note in one session, recording an answer or a proposal per note; the single-id form still works
- the browser smoke that proves the served path (delivered for the route; extended to the first
  draft, a note and a batch review in a real browser)

Out of scope:
- phase 2: a push channel for review records (SSE or the existing terminal WebSocket) in place of
  the five-second poll, and a note typed into the open dock session as it lands
- tier-two opt-out: core assembling the diagrams contribution optionally so the package can be
  absent from a build — the seam is ready (capability's `absent`, the doctor's null listing) but
  core still imports the package statically; a follow-up item
- the contribution's routes and assets slots: `/api/diagram/*` stays in the server's board face and
  the bundled review prompts stay in core's bundle until the contribution contract carries both
- a CLI-only export of a scene (Publish exports in the browser; a headless export would need a
  browser in `aof diagram export`), and an `excalidraw` generator id in the registry so refine draws
  `.excalidraw` diagrams directly — the diagram-design path is left as it is for now
- re-laying-out after an accept: a relabelled box grows about its centre and can crowd a close
  neighbour; nothing pushes shapes apart (ADR-012)
- a lifted local-PTY mount builder shared by the board and the diagram surface (the board's budget
  row names the move; the diagram surface carries its own author meanwhile)
- real-time multi-operator editing (a room or a CRDT) — the PRD's later future

## Stories

- [x] [00 · The native draft store and the review loop](stories/00_story_native-draft-store-and-review-loop/STORY.md) — PR #13: the embedded editor, the scene store,
  and the ask/answer/propose/preview/accept/reject loop (ADR-004).
- [x] [01 · Diagramming is a package pair](stories/01_story_diagramming-is-a-package-pair/STORY.md) — `@aof/diagrams` and `@aof/diagrams-ui`, one way
  (ADR-001).
- [x] [02 · The opt-out seam](stories/02_story_the-opt-out-seam/STORY.md) — `diagram:capability`, the board hiding Edit draft, the absent
  answer (ADR-002).
- [x] [03 · The editor is a route](stories/03_story_the-editor-is-a-route/STORY.md) — `/diagram`, unlisted in the nav, with its own address
  vocabulary and dock mount (ADR-003).
- [x] [04 · A first draft from Mermaid](stories/04_story_a-first-draft-from-mermaid/STORY.md) — a first draft, requested in the editor and proposed as
  a whole diagram (built first as a one-shot Mermaid import, ADR-005; rebuilt on the one format).
- [x] [08 · One format](stories/08_story_one-format/STORY.md) — the scene is the store and Mermaid the interface: the projection,
  compile, element-level accept and Publish (ADR-010, ADR-012, ADR-013; built first with the `.mmd`
  as the store, ADR-006–ADR-009, and reworked when libraries had no place in it).
- [x] [09 · Project libraries](stories/09_story_project-libraries/STORY.md) — `.excalidrawlib` files used as they are, insertions that keep
  their provenance, and the architect placing items by name (ADR-011).
- [x] [05 · Notes without a session](stories/05_story_notes-without-a-session/STORY.md) — a note records a request and launches nothing; the panel
  lists and withdraws notes.
- [x] [06 · One command examines every note](stories/06_story_one-command-examines-every-note/STORY.md) — the batch form of `/aof:diagram-review`.
- [x] [07 · The served-path smoke](stories/07_story_served-path-smoke/STORY.md) — the real-browser check extended to draft, note and batch
  review; its script and fixtures kept beside the suite.

04 depends on nothing delivered-but-pending; 05 and 06 are independent of 04 and of each other;
08 is the store 04–06 read and write, 09 rides on 08, and 07 composes them all. The stories were
written at import from this list, the ADRs and VERIFICATION. None carries a task contract, because
the work was built before the milestone entered the stream.

All ten are built. The milestone is `in-review`: VERIFICATION.md records the evidence (23/23 in a
real browser, every touched suite and control green) and the acceptance items still open — an
operator's live first draft and batch review, and the maintainer's sign-off on the d3-shape
admission.

## Dependencies

- `133_milestone_architecture-diagrams` (archived) — the generator seam, the layout's one home, the
  figure, FF-13301..13303
- `145_story_loop-diagram` and `151_story_add-diagram` (archived) — the diagram prose commands the
  bundle sweep reaches
- `135_milestone_specification-by-example` (archived) — the one-way package precedent (FF-13501)
  that ADR-001 applies to diagrams
- the Excalidraw SDK 0.18.0 and `@excalidraw/mermaid-to-excalidraw` — external, pinned; the
  d3-shape admission in the supply-chain audit is reviewed on PR #13 and awaits maintainer
  sign-off
