# 01 · Every conversation in one panel — build plan

## Mechanism

**One pure model draws the panel; the panel draws the model.**

- `conversation-model.mjs` (pure, no React) is the successor of `note-threads.mjs`:
  `threadsOf(requests, proposals, elements)` → threads `{ key, subject, elementIds, notes, state,
  lastTurn, proposal, updatedAt }` — one per note, grouped by the shapes a note names exactly as
  `notePins` groups them today, a note naming a missing shape under "Whole diagram"; and
  `notePins(threads)` for the overlay. `threadOf`, `noteStatus`, `turnAuthor` and the reply flow
  move here unchanged; the suite moves with them, and gains the threads cases.
- `ConversationPanel.tsx` takes `{ threads, proposals, openKey, selectionLabel, readOnly, busy,
  onOpen, onShowOnCanvas, onAsk, onSaveNote, onReply, onPreview, onAccept, onReject, … }` and
  renders DESIGN's regions: header and chip (the chip reads "Not started" until story 02 gives it a
  session), the two tabs, the cards, the composer. It computes nothing the model can.
- `ExcalidrawEditor.tsx` loses the review section and the bottom bar; its body becomes a flex row of
  the canvas and the panel (a drawer under 900 px). The handlers it already has (`ask`, `note`,
  `replyInThread`, `preview`, `accept`, `reject`, `withdraw`, `firstDraft`, `reviewNotes`) are
  passed down unchanged. Mermaid view moves to the header. The editor owns `openKey`.
- `CanvasOverlay.tsx` keeps the ask action and field, gains `NotePinButton` from `NoteThread.tsx`,
  and calls `onOpenThread(key)` from a pin instead of opening a popover; asking at the selection
  sets `openKey` to the new note's thread.
- Inside the SDK container, fields stop keydown AND keyup and re-declare the console tokens
  (`consoleTokens()` in the overlay is the existing helper — reuse it for the panel if it renders
  inside the container; the panel sits outside it, beside the canvas).

## Verification step

Headless: the model suite over records shaped like 171's smoke data (threads, states, grouping,
the deleted-shape and withdrawn edges, proposals by request). In the browser smoke: the panel lists
the threads, a pin opens its thread, Save as note records and sends nothing, a proposal is accepted
and rejected from its card — then screenshots at 1280 and 768 read against the committed mocks.

## Out of scope

- Streaming, the session chip's live states, and delivery through the server (story 02).
- Find in libraries and the draft-changed line (unchanged from 171).
