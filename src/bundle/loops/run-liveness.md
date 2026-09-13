---
# aof-generated: true — framework loop record; installed by `aof work update`, edit it in aof, not here.
id: anchor:run-liveness
kind: anchor
title: Run liveness observation
ground: live-soak
observes: module:src/run-store.mjs#isStale
data-feed: [loop:run-resilience, loop:mesh-assignment-reclaim]
---
# Run liveness observation

Framework record source: `src/bundle/loops/run-liveness.md`; installed by `aof work update` — edit it in aof, not here, and put per-project values in `.aof/aof.config.json` behind a `config:` pointer.

`isStale` is the exported, clock-injected observation that compares a run's durable heartbeat with
the liveness window (`src/run-store.mjs:969-983`). It observes the system over time, so this anchor
uses `ground: live-soak`; it does not turn the presence of a timer into a stronger claim.

Both `data-feed` edges cite direct consumers. `loop:run-resilience` names `isStale` as a measurement
authority in its own record. `loop:mesh-assignment-reclaim` imports the same predicate and combines
it with node staleness before reclaiming (`src/mesh/assignment-reclaim.mjs:17-21`, `:96-123`). No
edge is added to a loop that does not consume this observation.
