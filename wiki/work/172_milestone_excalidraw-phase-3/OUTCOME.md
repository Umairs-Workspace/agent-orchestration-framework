
# 172 · Excalidraw phase 3 — the architect conversation streams into the editor, through a designed UI — Outcome

## Delivered

### The architect conversation is an editor surface with no terminal
A question or reply at a shape reaches a headless session on the board's server (m172/00), its answer is written into that shape's thread in the one conversation panel as it is produced (m172/01, m172/02), and the diagram surface renders no terminal and holds no code to type into one (m172/03); F-171-04 is discharged by this, subject to the operator's `@uat` (VERIFICATION `## User sign-off`).

### The conversation surfaces have a committed design baseline
`mocks/conversation*.png` (accepted 2026-10-27) are the conformance source of truth for the panel, the canvas ask, a proposal and the session state, with `DESIGN.md` stating the accepted fallback wherever the shipped surface cannot yet say what the mock says (F-172-09, F-172-10).

## Assumptions

- **The board's server is the architect's host** — the conversation runs only where the board runs and `claude` is logged in; a board with no session to launch shows the command to copy instead (m172/02).

## Gaps

### The diagram packages' tier-two opt-out, re-layout after a growing accept, a CLI-only export
- **Status:** open-by-decision
- **Discharge condition:** a later Excalidraw phase takes them into scope (carried from 171's out-of-scope list, unchanged here).
None of the three exists; the SPEC kept them out of scope.

### Real-time multi-operator editing
- **Status:** open-by-decision
- **Discharge condition:** the PRD's later phase (a room or a CRDT) is scheduled.
Two editors on one diagram share the session and the stream, but only the posting editor shows a queued turn (m172/02), and edits are not merged live.
