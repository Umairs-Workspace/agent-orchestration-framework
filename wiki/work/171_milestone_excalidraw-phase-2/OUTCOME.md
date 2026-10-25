# 171 · Excalidraw phase 2 — the editor follows the architect live and is easier to drive — Outcome

## Delivered

### A conversation about a shape without leaving the editor
The architect is asked about a shape at the shape (m171/00), its answer arrives in the open editor as it is written (m171/02), the note it answers is a thread pinned beside that shape (m171/05), and a reply typed there reaches the same live session and is answered in the same thread — run live by the operator on 2026-10-25 (171 VERIFICATION, User sign-off).

### The editor reads the architect's records only through the scene command
Every editor surface this milestone added — the stream, the pins, the threads, the palette — reads diagram state through `diagram:scene` and the review records it owns; the board face names no diagram path and imports nothing of `@aof/diagrams` (FF-17101).

## Assumptions

- **The architect's session is a live terminal in the board's dock** — delivery to it rides the dock's typed input (m171/04), so the conversation is visible as a terminal beside the canvas.

## Gaps

### A conversation that streams into the editor without a visible terminal
- **Status:** open
- **Discharge condition:** the next milestone (streaming + the conversation UI overhaul, captured in the backlog at this accept) streams the architect's answers into the thread with no dock opened per question.
Every ask and reply opens or types into a visible terminal session; the operator found the conversation UI unfit at the `@uat` (171 VERIFICATION F-171-04).

### Mocks for the three new surfaces
- **Status:** open
- **Discharge condition:** the designed UI of the next milestone supplies committed mocks, so design conformance has a baseline other than DESIGN.md's checklists.
No `mocks/` were committed; design conformance at this accept is INCONCLUSIVE (no base URL, checklist baselines only).
