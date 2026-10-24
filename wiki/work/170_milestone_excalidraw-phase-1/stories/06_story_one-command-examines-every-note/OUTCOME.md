# 06 · One command examines every note — Outcome

## Delivered

### Batch review
`/aof:diagram-review <ref> <file>` with no request id examines every open note in one session, recording an answer or a proposal per note. The single-id form still answers one.

### Records leave the batch when acted on
A respond marks a note `answered` and a propose marks it `proposed`. A withdrawn or answered note refuses both, so a second batch never answers it again.

## Assumptions

- **A live model writes the profile** — the architect's Mermaid is model-written. The batch of several notes, including a question, was proven with a stand-in architect in the browser smoke, not live (VERIFICATION, User sign-off).
