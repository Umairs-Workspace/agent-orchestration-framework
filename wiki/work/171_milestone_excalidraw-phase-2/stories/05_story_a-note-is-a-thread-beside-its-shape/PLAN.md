# 05 · A note is a thread beside its shape — build plan

## Mechanism

**The record grows a list; the overlay grows a component.**

- `diagram:scene`: a request record gains `thread: [{ by, text, at }]`. `request` writes the first
  operator turn. A new write action, `reply` (`requestId`, `text`), appends an operator turn and sets
  `status: "open"` under the scene lock; it refuses a withdrawn note with `diagram-request-decided`
  and a record over the size bound with `diagram-review-too-large`. `respond` appends an architect
  turn, keeps setting `answer`/`answeredAt`, and `requireAnswerable` admits a note reopened by a
  reply. A record with no `thread` is normalised on read to `[request, answer?]` — one function used
  by `listRecords` and `context`, so every reader sees the same turns. `context` carries `thread`.
  Add `reply` to `SCENE_ACTIONS`/`WRITE_ACTIONS`, the input schema (`text`) and the usage line, and
  regenerate the command inventory fixture.
- `note-threads.mjs` (pure, `@aof/diagrams-ui`): from the open/answered/proposed notes and
  `projectScene(elements).index`, group notes by the element set their `selectedIds` resolve to,
  drop whole-diagram, withdrawn and unresolvable ones, and answer one pin per group: the element ids
  to anchor on, the count, and `waiting` when the last turn is the architect's.
- `NoteThread.tsx` renders a pin and its popover inside story 00's `CanvasOverlay.tsx`, positioned
  by `canvas-anchor.mjs` (FF-17102 holds: no other conversion). Reply posts `reply`, refreshes the
  panel, and passes the review invocation to the delivery callback the surface gives the editor
  (story 04); with no live session the callback answers "not delivered" and the reply waits.
- The prompt (`diagram-review.md`, three renders, manifest hashes): a note's context now carries its
  thread; answer the latest operator turn; a reopened note is answered like an open one.

## Verification step

Smoke: record a note on a box, stand-in architect `respond`s, open the pin, reply, see three turns,
`respond` again, see four, pan and zoom — the pin stays on the corner. Read the screenshots. The
`@uat` run is the operator's, with a real session.

## Out of scope

- Per-viewer read state; "waiting" is derived from the last turn only.
- Threads on whole-diagram notes beside anything — they stay in the panel.
- Editing or deleting a turn.
