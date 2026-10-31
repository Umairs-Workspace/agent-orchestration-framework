# 03 · The record corpora sit behind the port, and aof memory answers byte for byte as it does today — Outcome

## Delivered

### Every record backend declares the record corpora
Every backend in `BACKEND_REGISTRY` exports exactly `{ name, corpora, recall, reindex, status }` and declares `work`, `operator` and `imports` from the one `RECORD_CORPORA`, never `code` or `relations`, and `none` declares them too, so memory off answers served-and-empty rather than `corpus-unserved`.

### aof memory dispatches through the port
`recall`, `recurrence`, `ingest`, `reindex` and `status` reach the configured backend only through `createKnowledgeEngine`, and both `aof memory` and `aof work memory` print the same bytes as before the port for every argv row of the outline.

## Assumptions

- **Records come only from the parser leaves** — the port routes record verbs to a record backend's own `recall`/`reindex`, and no engine produces a record.
