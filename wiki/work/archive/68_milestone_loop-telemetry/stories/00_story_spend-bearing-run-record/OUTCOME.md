# 00 · The spend-bearing run record — a sixteenth key, and a writer that refuses a lie — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### The run record's sixteenth key
Every run record aof mints or reads carries `spend` as its sixteenth and last key — a validated
envelope or `null` — and a fifteen-key record written before this milestone normalizes forward with
`spend: null`, every prior value verbatim.

### Not-measured is distinguishable from measured-zero
A record whose `spend` is `null` and a record whose `spend.costUsd` is `0` are two different
answers, readable apart from the record alone without consulting anything outside it.

### Token buckets are a closed set the writer enforces
`input`, `output`, `cacheRead` and `cacheCreate` are the only token keys a spend may carry, and
`run-store.settleRun()` refuses — with a typed error, persisting nothing — any envelope that is
partial, carries a fifth token key, or holds a negative, fractional or non-numeric count. The
enforcement exists in exactly one place: the write path.

### Cost is stamped once and carries its provenance
`costUsd` is written only at settle, alongside `costSource` (the closed set `reported` | `priced`)
and a `priceTable` version that is present exactly when the cost was priced; no read path in
`src/` recomputes a cost from buckets, so a later price-table correction changes future stamps and
never rewrites a settled run.

### A closed exit vocabulary that decides nothing
`spend.exitReason` records how a run ended over a seven-member closed vocabulary, and a value
outside it is refused at write. Two runs identical but for their reason differ in nothing else: no
retry, kill, bound or state change is triggered by any member.

### One phase authority, structurally
Neither the run record nor the spend envelope carries a `phase` key, and no module in `src/` reads
one off either — `brief.loop.phase` is the single authority.

### The additive-discipline guard actually runs
`test/arch/acd-run-record-node-additive.test.mjs` is now spread into `scripts/test.mjs`'s suite
registry, not merely imported, so the record's key freeze is enforced on every run rather than
silently unexecuted.

## Assumptions

- **The four positional pin sites are the complete set** — the sixteenth key's forward-compatibility
  rests on `test/run-resilience-record-keys.test.mjs:27`, `test/run-store-record.test.mjs:24`,
  `test/arch/acd-run-record-node-additive.test.mjs:25` and
  `test/arch/acd-loop-state-rides-the-run-record.test.mjs:14` being every place the key set is read
  positionally; an unmeasured fifth site would break without a failing test.
- **The runtime's per-turn usage is already disjoint** — the mutually-exclusive convention makes
  ingestion a straight copy because Claude Code's `usage` excludes both cache classes from
  `input_tokens`; a runtime that reports inclusive counts must be converted at its ingest boundary,
  since the writer refuses a folded bucket rather than unfolding it.
- **No runtime in use reports an authoritative cost** — the transcript carries none, verified on a
  live JSONL, so `priced` is the reachable provenance today and `reported` is the path reserved for
  a runtime that does.
- **`brief.loop.phase` is delivered and stable** — milestone 53 is `done` and carries `phase` on
  the loop declaration, which is what makes a rival key a second copy of one fact rather than the
  only copy.

## Gaps

### A spend producer — nothing in production writes one
- **Status:** discharged
- **Discharge condition:** story 68/02 `spend-ingest-at-settle` lands the ingest that calls
  `settleRun` with a real envelope.
Discharged 2026-08-22 by story 68/02, accepted: `src/run-spend-ingest.mjs` is the production
producer, calling `settleRunFromVendor` at the drive and mesh-worker settle paths. A run settled
through either path carries a measured envelope; a settle from any other caller still records
`spend: null`, which reads *not measured* rather than as an error.

### The price table has no home
- **Status:** discharged
- **Discharge condition:** story 68/02's build decides where the table lives, how it is versioned
  and who updates it.
Discharged 2026-08-22 by story 68/02, accepted: the table lives in `src/run-store.mjs` as a frozen
`PRICE_TABLE` with `PRICE_TABLE_VERSION` stamped onto every priced cost, and pricing happens in the
writer (`priceVendorTokens`). The writer is the home because FF-6803/FF-6804 scan `src/**`
*excluding* `run-store.mjs`, so no producer module can build or price an envelope and still pass.
Nothing updates the table automatically — a stale table yields confidently-wrong USD, which the
version stamp makes detectable in the data.

### Four exit reasons are declared but unreachable
- **Status:** open
- **Discharge condition:** milestone 69 lands the loop enforcement that can end a run for these
  reasons.
`max_turns`, `timeout`, `stall` and `budget_exceeded` are accepted by the writer and recordable,
but no code path in `src/` can produce them — 68 measures and enforces nothing (ADR-008). Only
`final_output`, `abort` and `error` are reachable in this milestone.
