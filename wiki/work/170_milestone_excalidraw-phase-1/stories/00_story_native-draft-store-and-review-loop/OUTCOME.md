# 00 · The native draft store and the review loop — Outcome

## Delivered

### Scene store with optimistic revisions
`diagram:scene` saves an ADR's draft as a canonical `.excalidraw` file under the diagram's exclusive `.lock`, and a save against a stale revision is refused as a conflict.

### Review loop
Requests, answers, proposals, accept and reject are `aof diagram scene` actions. Each is kept as a review record beside the diagram, and on every platform a record is created by `rename()` without replacing an existing id.

## Assumptions

- **One writer at a time** — every write holds the diagram's `.lock`. A crashed writer leaves the lock, and writes answer 409 until it is deleted by hand (ADR-004).
