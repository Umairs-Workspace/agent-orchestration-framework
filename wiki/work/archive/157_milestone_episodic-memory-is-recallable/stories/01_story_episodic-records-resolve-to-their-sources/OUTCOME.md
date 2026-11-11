# 157/01 · Episodic records resolve to their sources — Outcome

## Delivered

### Three episodic record types
`aof work memory ingest` compiles `finding`, `feedback` and `run` records from existing sources, on both the local and graphify backends.
- A finding comes from a `VERIFICATION.md` or `SESSION.md` register row or `F-` heading; a row and a heading for one id are one record.
- A feedback record is a `kind: "raw"` `FEEDBACK.ndjson` row; classification and recall rows are not records.
- A run record is a terminal run (`done`, `failed` or `cancelled`), carrying its loop stage, outcome, `failureReason` and its matched agent's stalls.

- **Index version** — the `INDEX_VERSION` bump makes a store written before this change report stale until it is re-ingested.

### Every episodic record resolves to its source
A record's `source` is a line locator (`<path>:<line>`) or a JSON locator (`<path>[:<line>]#<pointer>`). `readRecordSourceValue` returns the line or the JSON value it names, and a locator that would leave the work tree is refused before any read. Over the live stream on 2026-10-12, all 1,226 episodic records and all 30 stall locators resolved.

- **Ingest is read-only on its sources** — rebuilding writes nothing to a register, a ledger, a run record or a snapshot.
