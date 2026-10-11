# 153/03 · Memory reports effectiveness and health — Outcome

## Delivered

### Effectiveness accounting
`aof work memory status --json` reports an `effectiveness` block. It gives surfaced, honoured, departed, irrelevant and recurred counts per record type, and per lesson with `--lessons`. It is built from the ledgers' recall rows and the retrospectives' `Recurs` stamps, and it flags corrupt or unresolved evidence in `diagnostics` and `complete`.

### Recurring and aged-unpromoted doctor probes
`aof work doctor` reports `memory-lesson-recurs` for a lesson named in a later `Recurs`. It reports `memory-lesson-unpromoted-aged` once an unpromoted lesson has seen 5 or more later accepted milestones (the operator's choice, configurable). An unknown age gets its own finding. All three are advisory and never fail a normal doctor run.

## Gaps

### Legacy volume of aged-unpromoted warnings
- **Status:** open
- **Discharge condition:** the operator chooses either a legacy exemption or a finer acceptance instant (a change to 153/03 Q1's policy).
On the live stream the default produces 738 warnings. Every pre-watermark lesson has no `Promoted to`, and acceptance age is read from `updated`, which ties milestones accepted on the same day.
