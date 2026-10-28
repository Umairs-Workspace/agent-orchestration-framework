
# 02 · The answer streams into its thread — Outcome

## Delivered

### The answer is written into its thread as it is produced
`conversation-stream.mjs` reduces the stream's `conversation` events into the session's state and each request's live turn, and the panel draws that turn inside its thread until the architect's recorded turn for the same request replaces it; the thread follows the text while it streams, until the operator scrolls up.

### Asking and replying reach the server's session
Ask, a reply, Review with the architect, Ask again and a first draft POST to `/api/diagram/conversation`; Save as note posts nothing; no editor action opens or types into a terminal, and an unavailable session shows the command to copy.

### Publish says it published
The publish answer carries whether the figure's own ADR shows it, and the editor's notice reads "Diagram published.", adding only that the architect links the figure when the ADR does not show it yet; no link block is handed to the operator (F-172-16).

## Assumptions

- **Only the posting editor shows "Queued"** — the queued state comes from the editor's own POST answers, because the session emits no queued list; a second editor on the same diagram sees the turn only when it starts.

## Gaps

### Activity steps that say what the step did
- **Status:** open
- **Discharge condition:** a vocabulary of the review command's steps, so a step reads "Read the diagram as Mermaid" as the mock does.
Activity steps read as the command run (VERIFICATION F-172-10).

### Editor notices that take no layout room
- **Status:** open
- **Discharge condition:** the designer places transient confirmations (Publish's among them) in a toast, and the editor shows them there.
Every editor notice is a full-width bar under the header that pushes the canvas down (VERIFICATION F-172-17).
