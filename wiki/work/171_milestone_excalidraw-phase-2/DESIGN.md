---
doc: design
---
# 171 · Excalidraw phase 2 — Design

## Intent

The operator reviews an architecture diagram with the architect without leaving the canvas: they
note a shape where it sits, find an icon by typing, see the architect's work arrive, and talk about a
shape beside it. Every addition is quiet chrome around Excalidraw's own canvas — it never competes
with the drawing, and it never hides the shape it is about.

## Conformance source of truth

- **Mocks directory:** `mocks/` (committed under this milestone). The operator supplies a mock for
  the first three surfaces below (decided at refine, 2026-10-24); each, once committed at the path
  named under its surface, is that surface's conformance source of truth, with its checklist as the
  rubric.
- **No-mock rule:** until a surface's mock is committed, its binding checklist is the source of truth.
  The fourth surface (the draft-changed status) has no mock and is judged by its checklist.

## Render breakpoints

- **Breakpoints:** 1280 (desktop) and 768 (tablet). The editor is a desktop drawing surface; at 390
  the SDK collapses to its own mobile UI, which this milestone does not change.

## Screens / surfaces

All four render at `/diagram?ref=<item>&file=<ADR-NNN-slug.svg>`, over a saved diagram with at least
three nodes, one library item and one note. Every colour is a console token (`apps/ui/src/index.css`
`@theme`): `background`, `card`, `border`, `muted`, `muted-foreground`, `foreground`, `primary`
(teal), `accent` (crimson). The overlay never uses the diagram's own palette.

### Ask architect at the selection

- **Route:** `/diagram?ref=<item>&file=<ADR-NNN-slug.svg>` with one shape selected.
- **Committed mock:** `mocks/ask-architect.png` — supplied by the operator.
- **Layout & interaction:** an "Ask architect" action sits just above the selection's bounding box, centred on
  it, and follows it on pan and zoom. Choosing it opens a compact question field in place; Enter asks, Escape
  closes. Adding a note stays in the editor's bar (operator, 2026-10-24). It moves below the box when there is no room above, and inside the canvas edge when
  the box is near it.
- **Component choices:** a single labelled button ("Ask architect"), not an icon alone — a person who has
  never used it must read what it does. The field is one line that grows to four.

#### Binding checklist (mandatory)

- **Layout regions (in order):** the selection's bounding box; the action above it; when open, the
  note field replacing the action, with Add and Cancel to its right.
- **The components each region holds:** action — one button "Ask architect"; field — a text input
  (placeholder names the selection, e.g. "Ask about Gateway"), an Ask button, a Cancel button.
- **The states (empty / loading / error / populated):** no selection — nothing shown; selection —
  the action; open, empty — Ask disabled; asking — Ask reads "Asking…", inputs disabled; error —
  one line under the field in the console's red, the text kept; done — the field closes and the
  status line says the architect was asked. Read-only diagram — no action.
- **The design ramp each uses:** `card` fill, `border` hairline, radius 6, 12px sans text, 8px
  padding, the console's focus ring; offset 8px from the box.

### Note pins and their thread

- **Route:** `/diagram?ref=<item>&file=<ADR-NNN-slug.svg>` with a note on a shape.
- **Committed mock:** `mocks/note-thread.png` — supplied by the operator.
- **Layout & interaction:** a pin sits on the top-right corner of each shape that has a note, with a
  count when it has more than one. Clicking it opens the thread beside the shape (right of it, or left
  near the canvas edge): the turns oldest first, each marked "You" or "Architect", then a reply field.
  One thread is open at a time; Escape or clicking the canvas closes it.
- **Component choices:** the pin is a small filled circle — `primary` for a note with an unread
  architect turn, `muted-foreground` otherwise — so "the architect answered" reads at a glance
  without a second colour system.

#### Binding checklist (mandatory)

- **Layout regions (in order):** pin on the shape's corner; popover beside the shape — header (the
  shape's label, the note's status), turns list, reply field with Reply and Close.
- **The components each region holds:** pin — a dot and an optional count; header — label and status
  text; turns — one block per turn with its author and time; reply — a text input and a Reply button.
- **The states (empty / loading / error / populated):** no notes — no pins; open thread with only
  the operator's note — "Waiting for the architect"; populated — turns; sending — Reply reads
  "Sending…"; error — one line under the field, the text kept; withdrawn or deleted shape — the note
  shows in the review panel only.
- **The design ramp each uses:** pin 12px; popover `card` fill, `border` hairline, radius 8, width
  320, max height 50% of the canvas with its own scroll; 12px sans turns, author in 600 weight.

### Find in libraries

- **Route:** `/diagram?ref=<item>&file=<ADR-NNN-slug.svg>`, the SDK sidebar open on the Find tab.
- **Committed mock:** `mocks/library-find.png` — supplied by the operator.
- **Layout & interaction:** a tab beside the SDK's Library tab. A search field at the top, focused
  when the tab opens; results below as a grid of previews with each item's name and its library
  under it. Drag a result onto the canvas, or click it to drop it at the centre of the view.
- **Component choices:** the grid matches the Library panel's own tiles, so the two tabs read as one
  panel with two ways in.

#### Binding checklist (mandatory)

- **Layout regions (in order):** tab trigger; search field; result count; result grid.
- **The components each region holds:** field — a text input with a clear button; count — "N items";
  grid — tiles holding a preview, the item name and the library name.
- **The states (empty / loading / error / populated):** no libraries — "No libraries. Add
  .excalidrawlib files to ~/.aof/diagrams/libraries or .aof/diagrams/libraries."; empty query — every
  item, library by library; no match — "No item matches <query>"; populated — the matches; previews
  render as they scroll into view, with a neutral placeholder until then.
- **The design ramp each uses:** the SDK's sidebar spacing and tile size; 11px sans names, 10px
  `muted-foreground` library names.

### The draft changed elsewhere

- **Route:** `/diagram?ref=<item>&file=<ADR-NNN-slug.svg>` after the saved draft changes in another
  window while this canvas has unsaved edits.
- **Committed mock:** none — the checklist is the source of truth.
- **Layout & interaction:** one status line under the editor's header: what happened and a Reload
  button. A clean canvas shows no banner — it reloads in place and the header's status says so.

#### Binding checklist (mandatory)

- **Layout regions (in order):** the header; the status line beneath it; the canvas.
- **The components each region holds:** status line — one sentence and a Reload button.
- **The states (empty / loading / error / populated):** no change — absent; changed with unsaved
  edits — the line; reloading — the button reads "Reloading…"; reloaded — the line closes.
- **The design ramp each uses:** the editor's existing amber notice style (`bg-amber-50`,
  `text-amber-950`), 14px text, 8px vertical padding.

## Behavioural outcomes (cross-reference)

- Asking the architect at the selection — story 00's tasks
- Searching and inserting a library item — story 01's tasks
- An answer, a proposal or a changed draft arriving without a reload — story 02's tasks
- A thread read and answered beside its shape — story 05's tasks
