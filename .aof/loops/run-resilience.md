---
# aof-generated: true — framework loop record; installed by `aof work update`, edit it in aof, not here.
id: loop:run-resilience
kind: loop
title: Keep runs within their lifecycle policy
controlled: module:src/run-store.mjs#readRuns
reference: [module:src/run-store.mjs#isLegalTransition, module:src/run-store.mjs#isRetryable]
measurement: [module:src/run-store.mjs#isStale, module:src/run-store.mjs#retryReadiness]
actuator: [command:work:run-start, command:work:run-retry, command:work:run-complete]
cadence: event:per-run-start
ceiling: [config:work.autonomous.maxAttempts, module:src/run-store.mjs#shouldRetry]
owner: unknown
optimizing: false
layer: operational
---
# Run resilience

Framework record source: `src/bundle/loops/run-resilience.md`; installed by `aof work update` — edit it in aof, not here, and put per-project values in `.aof/aof.config.json` behind a `config:` pointer.

The controlled run records are read by the defining export `readRuns` at `src/run-store.mjs:646`; their
frozen shape, including lifecycle state and no owner key, is at `src/run-store.mjs:344-362`. The reference
authorities are the defining exports `isLegalTransition` at `src/run-store.mjs:281` and `isRetryable` at
`src/run-store.mjs:312`. This record points to those authorities and intentionally restates neither of
their member values.

The measurement authorities are `retryReadiness` at `src/run-store.mjs:437` and `isStale` at
`src/run-store.mjs:1044`. The actuator command ids are defined at `src/commands/run-start.mjs:31-32`,
`src/commands/run-retry.mjs:23-24`, and `src/commands/run-complete.mjs:26-27`, and are registered in
`src/command-core.mjs:219-224`. The local recovery scan occurs on run start (RESEARCH §Q1.5), establishing
`event:per-run-start`; the mesh clock belongs to a different loop.

The bound remains in `work.autonomous.maxAttempts` and is combined with classification by the defining
export `shouldRetry` at `src/run-store.mjs:325`; no numeric limit is duplicated here. The record's
`node` provenance key is partition provenance, not ownership, and the frozen shape at
`src/run-store.mjs:344-362` has no owner key, so `owner: unknown` is honest. `optimizing: false` records a
regulator holding runs against lifecycle policy, with no metric pushed toward an extremum.

**`layer: operational`, corroborated by its own cadence.** The trigger is `event:per-run-start`,
whose scope is one run inside a phase, and the layer declared here is the one that scope implies. No
duration is derived from it; the layer is an ordinal on a second axis.

**Its reference is set by `anchor:run-lifecycle-policy`, a `frozen-rule` authority.** That anchor
declares the edge on its own record and labels it there as authored. The point of an anchor rather
than a supervising loop is that this loop's reference genuinely is a rule no cycle revises — the
closed transition and retry sets fixed in `src/run-store.mjs` — and only a frozen rule is an
authority that by definition no optimizer may move. `owner:` remains `unknown`: the record shape at
`src/run-store.mjs:344-362` has no owner key and no role is recorded as accountable, so the gap is
reported rather than papered over.
