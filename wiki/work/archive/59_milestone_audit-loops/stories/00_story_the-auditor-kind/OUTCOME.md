# 00 · The auditor kind — Outcome

## Delivered

### The sixth node kind
`NODE_KINDS` is closed at six — `loop`, `actor`, `anchor`, `watcher`, `arbiter`, `auditor` — and the
five kinds that existed before parse exactly as they did, every record shipped before 59 producing
zero new findings in the same codes and the same counts.

### An auditor that has no vocabulary in which to act
`ADMITTED_KEYS.auditor` is its four required declarations (`audits`, `measurement`, `cadence`,
`escalation`) plus the edge keys, and it omits `actuator`, `optimizing`, `controlled`, `reference`,
`ground`, `counter`, `determinism`, `layer`, `owner` and `ceiling`; each omitted key is refused by
the loader's existing `loop-key-not-admitted-for-kind` rather than by a new code.

### A declared subject that cannot be the work
An auditor's `audits:` is a non-empty list of instrument pointers over
`module | command | config | loop | watcher | anchor`, and an `item:` endpoint is refused — so "the
audit does not review the work" is a checked property of the record, not a promise in prose.

### Reporting is an outbound edge, and nothing points at an auditor
`EDGE_KEYS` gains exactly `reporting` and no seventh; `ENDPOINT_SCHEMES` is unchanged, so no record
in the registry may name an auditor as a target. An auditor's admitted edges are `data-feed` and
`reporting` alone, and `target-setting`, `veto`, `parameter-tuning` and `monitoring` are refused at
the endpoint.

### An anchor that says when it was checked
`checked:` is admitted on `kind: anchor` alone, is optional there, takes an ISO calendar date, and
refuses every `SENTINEL_TOKENS` member and every reserved field prefix — so an anchor is dated,
undated, or refused, and there is no spelling by which one opts itself out of freshness.

## Assumptions

- **The freshness window lives with the caller** — `checked:` records an epoch and nothing more; the
  comparison that turns a date into "stale" is handed a `now` and a window by 59/03's checks, which
  have not landed, so no anchor is yet reported stale anywhere.
- **Nothing points at an auditor because nothing needs to** — the closed `ENDPOINT_SCHEMES` is what
  makes the auditor structurally a source; a later kind that must address one would have to widen
  that set and re-argue this.

## Gaps

### `reporting` edges are declarable and nothing yet resolves their addressee
- **Status:** open
- **Discharge condition:** 59/04 lands `acd-audit-reports-to-the-owner` and resolves a finding's `to`
  through the audited loop's `target-setting` source, falling back to the auditor's declared
  `escalation:` actor.
The sixth edge key parses, validates and appears in the graph, but no consumer computes who a
finding is addressed to — a declared `reporting` edge is today a well-formed statement with no
reader.
