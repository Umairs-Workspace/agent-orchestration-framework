---
# aof-generated: true — framework loop record; installed by `aof work update`, edit it in aof, not here.
id: loop:mesh-assignment-reclaim
kind: loop
title: Reclaim assignments only after dual staleness
controlled: module:src/mesh/assignment-reclaim.mjs#reclaimStaleAssignments
reference: [module:src/mesh/assignment-reclaim.mjs#dualStalenessDecision, module:src/mesh/presence.mjs#isNodeStale, module:src/run-store.mjs#isStale]
measurement: [module:src/mesh/assignment-reclaim.mjs#dualStalenessDecision, module:src/mesh/presence.mjs#isNodeStale, module:src/run-store.mjs#isStale]
actuator: [module:src/effects/assignment-transitions.mjs#transitionAssignmentState, module:src/effects/run-transitions.mjs#transitionRunReclaimed]
cadence: periodic:15s
ceiling: none
owner: unknown
optimizing: false
layer: operational
---
# Mesh assignment reclaim

Framework record source: `src/bundle/loops/mesh-assignment-reclaim.md`; installed by `aof work update` — edit it in aof, not here, and put per-project values in `.aof/aof.config.json` behind a `config:` pointer.

The defining `reclaimStaleAssignments` scan at `src/mesh/assignment-reclaim.mjs:163` controls non-terminal
assignment state. Its reference and measurement are the same complete gate: the defining exported AND
`dualStalenessDecision` at `src/mesh/assignment-reclaim.mjs:136`, plus its two separately visible halves,
`isNodeStale` at its defining site `src/mesh/presence.mjs:550` and `isStale` at its defining site
`src/run-store.mjs:1181`. Both predicates are imported and shared rather than re-derived
(`src/mesh/assignment-reclaim.mjs:17-21`).

The narrowest actuator exports are `transitionAssignmentState` at
`src/effects/assignment-transitions.mjs:272` and `transitionRunReclaimed` at
`src/effects/run-transitions.mjs:177`; `src/mesh/assignment-reclaim.mjs:32-37` imports them rather than
defining them. The 15-second default rate is defined at `src/mesh/sync-cadence.mjs:25` and wired only for
the control role at `src/mesh/launcher.mjs:1513-1533`, making this the registry's sole periodic loop.

Each tick is a single-shot reclaim scan that terminates by construction, so `ceiling: none` is the known
answer: cadence is a rate, not an iterative bound (ADR-012 §6/F1). RESEARCH §Q1's eighth-loop finding
identifies no owner, so `owner` remains `unknown`. `optimizing: false` records a regulator holding
assignments against a staleness threshold, not a metric pushed to an extremum.

**`layer: operational`, ARGUED rather than corroborated — and this registry ships exactly one such
declaration.** The cadence is `periodic:15s`. A clock is a rate, and a rate says nothing about scope,
so there is no scope rank here for the declaration to be checked against; the layer stands on the
argument made in this paragraph and nowhere else, which is why it is made here rather than assumed.
The argument: each tick is a single-shot reclaim scan that terminates by construction and neither
selects work nor judges it — it holds one variable, assignment liveness, against a staleness
threshold. It turns four times a minute, against the item-scoped cycles of the management layer and
the milestone-scoped cycle of the governance layer, so it is the fastest thing in this registry by a
wide margin on any reading of its own rate. A regulator that holds one variable against a threshold
inside a run is precisely what `operational` names, so `operational` is the honest claim. Deriving
the layer from the period instead would be the invented duration-to-scope conversion the registry
refuses; declaring `management` or `governance` to dodge a comparison would be worse, because
nothing could contradict it.

**Its reference is set by `actor:operator`.** The edge is declared on the operator's own record and
labelled there as authored: the two numbers this gate resolves — `work.loop.heartbeatMs` and
`mesh.presence.stalenessSeconds` — are changed by a hand edit of `.aof/aof.config.json` and by
nothing else, and calling that an operator act is milestone 58's judgment rather than a line this
repository supplies. `owner:` stays `unknown` and the accountability gap is still reported.
