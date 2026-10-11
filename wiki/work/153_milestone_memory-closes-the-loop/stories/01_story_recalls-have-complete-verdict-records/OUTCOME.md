# 153/01 · Recalls have complete verdict records — Outcome

## Delivered

### Recall observations in the item ledger
`aof work memory record-recall <ref> --input <file>` appends one `kind: recall` row to the item's `FEEDBACK.ndjson`. The row carries the query, the scope, and an explicit `honoured | departed | irrelevant` verdict for each returned record. A resubmission of the same id is idempotent (`replayed: true`), and a conflicting one changes no byte.

- **Composite identity** — a returned record is identified by `item` + `id` + `recordType`, never by its id alone.

### Raw feedback stays raw
The finding-escape counter and every other ledger consumer select their partition explicitly. Recall rows never enter the raw-feedback denominator (FF-15301), and `aof work feedback` refuses recall fields.

### brief is retired
`aof work memory brief` is an unknown verb, refused before any backend is resolved. Help no longer lists it.

## Gaps

### Acceptor census label for recall observations
- **Status:** open
- **Discharge condition:** recall observations publish under an event, or carry a payload, that the acceptor's `observations:feedback-recorded` sweep can exclude.
`record-recall` publishes through `feedback.recorded`, so the acceptor census counts recall rows as recorded feedback. It over-counts and never under-counts.
