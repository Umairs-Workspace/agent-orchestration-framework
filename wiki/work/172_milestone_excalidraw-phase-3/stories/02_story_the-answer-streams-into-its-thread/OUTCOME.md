
# 02 · The answer streams into its thread — Outcome

## Delivered

### The answer is written into its thread as it is produced
`conversation-stream.mjs` reduces the stream's `conversation` events into the session's state and each request's live turn, and the panel draws that turn inside its thread until the architect's recorded turn for the same request replaces it; the thread follows the text while it streams, until the operator scrolls up.

### Asking and replying reach the server's session
Ask, a reply, Review with the architect, Ask again and a first draft POST to `/api/diagram/conversation`; Save as note posts nothing; no editor action opens or types into a terminal, and an unavailable session shows the command to copy.

## Assumptions

- **Only the posting editor shows "Queued"** — the queued state comes from the editor's own POST answers, because the session emits no queued list; a second editor on the same diagram sees the turn only when it starts.

## Gaps

### Activity steps that say what the step did
- **Status:** open
- **Discharge condition:** a vocabulary of the review command's steps, so a step reads "Read the diagram as Mermaid" as the mock does.
Activity steps read as the command run (VERIFICATION F-172-10).
