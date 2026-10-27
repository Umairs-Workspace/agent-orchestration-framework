# 02 · The answer streams into its thread — build plan

## Mechanism

**The editor posts and listens; two pure reducers say what it means; the panel draws it.**

- `conversation-stream.mjs` (pure): `conversationStep(state, event)` over the stream's
  `conversation` events — `snapshot`, `session`, `turn`, `text`, `activity`, `turn-end` — into
  `{ session: "not-started" | "starting" | "answering" | "idle" | "ended" | "unavailable",
  reason, queued: [requestId], live: { [requestId]: { text, activity, denials, outcome } } }`. A
  `text` event appends to its turn's text; `turn-end` marks the outcome; a reconnect's `snapshot`
  replaces the state whole. A batch turn (`requestId: null`) is kept under its own key and shown on
  the panel's header line, never guessed onto a thread.
- `conversation-model.mjs` gains `withLiveTurns(threads, live)`: a live turn rides its thread until
  the thread's records hold an architect turn (or a proposal) newer than the turn's start; a failed
  turn with nothing recorded becomes the "stopped before it answered" line.
- `editor-state.mjs`: one pure `deliveryFor(action, facts)` → the POST bodies an action sends (Ask
  and a first draft: `{ requestId }`, then `{}` when other notes wait; reply and Ask again:
  `{ requestId }`; Review with the architect: `{}`; Save as note: none). The `Delivery` /
  `onDeliver` vocabulary goes from the editor.
- `ExcalidrawEditor.tsx`: the existing EventSource adds a `conversation` listener feeding
  `conversationStep`; actions POST through `deliveryFor`; a 503 sets the session to
  `unavailable` and shows the copyable command (`diagramReviewInvocation`). The panel gets the
  merged threads and the session; the overlay's pins get the answering halo.
- `DiagramSurface.tsx`: renders the editor alone — no dock, no `onDeliver`, no delivery state.
- The stand-in architect beside the smoke, and the smoke itself: start `aof work ui` with
  `AOF_ARCHITECT_EXECUTABLE` pointing at the stand-in; it answers each user message with a few
  deltas spaced ~100 ms apart, then runs `aof diagram scene … --action respond`.

## Verification step

Headless: the reducer and the merge over event sequences (a whole turn, a reconnect mid-turn, a
queued turn, a failed turn, a batch turn) and `deliveryFor` per action. In the browser smoke with
the stand-in: ask at the selection and see the thread grow between two screenshots, see the
recorded answer replace it, reply and see the second answer grow, check no `.xterm` exists. Then
the operator's `@uat` with the real architect.

## Out of scope

- Removing `dock-mount.mjs` and the terminal's later-input seam (story 03).
- Cancelling a turn in flight.
