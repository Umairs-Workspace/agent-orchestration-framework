# 02 · Status moves and run effects use the selected store — Outcome

## Delivered

### Every status move goes through the store's guarded write
`aof work status`, run start and completion effects, and failure rollback all call the selected store's `status` or `rollback` operation. The expected-state guard is checked against the current record at the write itself, and the item lifecycles, error codes, `updated:` stamping and the record's other bytes are unchanged.

### A refused or stale move leaves the record byte-identical
An illegal edge, a stale expected status and an unusable record each keep their own diagnostic, and none of them writes. Rollback keeps its narrower predicate, so it does not overwrite a later review decision.

### Replay acts on the event's own workspace
A replayed lifecycle event resolves the store of the workspace that raised it, never that of another workspace that is draining at the same time.
