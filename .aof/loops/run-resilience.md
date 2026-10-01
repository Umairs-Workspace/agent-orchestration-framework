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

Framework record source: `packages/core/assets/loops/run-resilience.md`; installed by `aof work update` — edit it in aof, not here, and put per-project values in `.aof/aof.config.json` behind a `config:` pointer.

The controlled run records are read by `readRuns` at `packages/execution/src/runs.mjs:665`, a member of the store that
`createRunStore` composes at `packages/execution/src/runs.mjs:79`; their
frozen shape, including lifecycle state and no owner key, is at `packages/execution/src/runs.mjs:550-570`. The reference
authorities are the defining exports `isLegalTransition` at `packages/execution/src/runs.mjs:326` and `isRetryable` at
`packages/execution/src/runs.mjs:61`. This record points to those authorities and intentionally restates neither of
their member values.

The measurement authorities are `retryReadiness` at `packages/execution/src/runs.mjs:447` and `isStale` at
`packages/contracts/src/freshness.mjs:2`. The actuator command ids are defined at `packages/work/src/commands/run-start.mjs:36-37`,
`packages/work/src/commands/run-retry.mjs:46-47`, and `packages/work/src/commands/run-complete.mjs:25-26`, and are registered in
`packages/core/src/application/bindings/command-core.mjs:242-247`. The local recovery scan occurs on run start (RESEARCH §Q1.5), establishing
`event:per-run-start`; the mesh clock belongs to a different loop.

The bound remains in `work.autonomous.maxAttempts` and is combined with classification by the defining
export `shouldRetry` at `packages/execution/src/runs.mjs:74`; no numeric limit is duplicated here. The record's
`node` provenance key is partition provenance, not ownership, and the frozen shape at
`packages/execution/src/runs.mjs:550-570` has no owner key, so `owner: unknown` is honest. `optimizing: false` records a
regulator holding runs against lifecycle policy, with no metric pushed toward an extremum.

**`layer: operational`, corroborated by its own cadence.** The trigger is `event:per-run-start`,
whose scope is one run inside a phase, and the layer declared here is the one that scope implies. No
duration is derived from it; the layer is an ordinal on a second axis.

**Its reference is set by `anchor:run-lifecycle-policy`, a `frozen-rule` authority.** That anchor
declares the edge on its own record and labels it there as authored. The point of an anchor rather
than a supervising loop is that this loop's reference genuinely is a rule no cycle revises — the
closed transition and retry sets fixed in `packages/execution/src/runs.mjs` — and only a frozen rule is an
authority that by definition no optimizer may move. `owner:` remains `unknown`: the record shape at
`packages/execution/src/runs.mjs:550-570` has no owner key and no role is recorded as accountable, so the gap is
reported rather than papered over.
