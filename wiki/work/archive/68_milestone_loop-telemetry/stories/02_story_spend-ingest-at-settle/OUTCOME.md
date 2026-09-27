# 02 · Spend ingest at settle — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### A run's spend is stamped as it settles
`src/run-spend-ingest.mjs` reads the session's own transcript at settle and writes the `spend`
envelope onto the run record. `completeRun` applies the state transition first and then stamps,
so the spend a run reports is written while the transcript that evidences it is still there.

### The four token buckets are copied, not computed
`input`, `output`, `cacheRead` and `cacheCreate` are each the sum across the transcript's own
per-turn `usage` objects; none is derived from another, and the writer's mutual-exclusivity
convention (FF-6803) accepts the result.

### A session's subagents are part of the session
The ingest walks the whole transcript tree under `<projectsDir>/<sessionId>/`, so a session's
subagent turns are counted in its totals — the same boundary the driver's own transcript walk uses,
so the two never disagree about what a session includes.

### Model, effort, turns and tool calls are recorded from the transcript
The envelope carries what the session actually ran; turn and tool-call counts are counted rather
than estimated. A session that ran more than one model records that it ran more than one, and the
buckets still total every turn.

### Absence stays distinguishable from zero
A run with no session id, an unmatched session id, a missing transcript directory, an unparseable
transcript, or a transcript with no usage leaves `spend: null` — *not measured*. No zero is
fabricated; a genuinely free run is the only thing that records `costUsd: 0`.

### An ingest failure never changes what the run did
Outcome, state, attempt and retry lineage are unchanged when the ingest fails, and the failure is
reported (`run-store: spend not stamped at settle: …`) rather than swallowed.

### Spend is stamped once and read verbatim
Settling a second time does not re-stamp, and a later read returns the stored envelope without
re-reading any transcript to produce it.

### A stamped envelope survives the drive path's attribution write
A spend stamped at settle is no longer reverted to `null` by a late whole-record attribution write
on the local drive path — pinned by story 68/01's `tasks/02` scenario *a stamped spend survives the
attribution write*, which drives a real transcript through the real drive command.

## Assumptions

- **The transcript is the source of truth for tokens** — Claude Code's per-turn `usage` carries the
  four buckets already mutually exclusive, so ingestion is a straight copy; nothing reconciles it
  against a second source.
- **The transcript carries no cost** — verified on a live transcript, there is no `costUSD` key,
  which is why `costSource` splits `reported` from `priced` and the price-table version travels
  with a priced number.
- **`projectsDir` must be known at settle for spend to be stamped** — a `completeRun` called without
  one settles the run and leaves `spend: null`; the drive and mesh-worker callers pass it.
- **The writer, not this producer, enforces the envelope's shape** — FF-6803 and FF-6804 bind the
  output in `src/run-store.mjs`, so an overlapping bucket set or a recomputed cost is refused there.

## Gaps

### Spend on the paths that do not pass a `projectsDir`
- **Status:** open
- **Discharge condition:** every production `completeRun` call site passes the projects directory
  for its session.
The ingest is wired at the drive and mesh-worker settle paths; a settle from any other caller
records `spend: null` rather than an error, which is correct but leaves that run unmeasured.

### Aggregation of stamped spend
- **Status:** discharged
- **Discharge condition:** story 68/03 attributes runs to items by the `sessionId` join, so a
  per-item total is a sum over records rather than a transcript re-mine.
Discharged 2026-08-22 by stories 68/03 and 68/04, both accepted: `src/work-observe.mjs` totals
`run.spend.costUsd` and the token buckets over the records the join attributes, per item and per
phase, and carries `unmeasuredSpend` as a count beside each total so an unmeasured run is never
folded in as zero. The per-item answer is now a sum over records. On this repo's own corpus that
sum is over an empty set — see `m68/03`'s open gap on run records predating 68/01's producer.
