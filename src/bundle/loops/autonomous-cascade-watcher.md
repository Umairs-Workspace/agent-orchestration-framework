---
# aof-generated: true — framework loop record; installed by `aof work update`, edit it in aof, not here.
id: watcher:autonomous-cascade-watcher
kind: watcher
title: Autonomous cascade watched against intervention rate
counter: how often a run needed a retry or a hand
determinism: counter
measurement: [command:work:counters]
monitoring: [loop:autonomous-cascade]
---
# Autonomous cascade — watcher

Framework record source: `src/bundle/loops/autonomous-cascade-watcher.md`; installed by `aof work update` — edit it in aof, not here, and put per-project values in `.aof/aof.config.json` behind a `config:` pointer.

This watcher pairs the `loop:autonomous-cascade` optimizer (ADR-007 §6). The cascade optimises *items reaching done over a work range* upward through agents that change item state. The counter-metric is the intervention rate: *how often a run needed a retry or a hand*. It measures the autonomy that the optimizer claims by its own `command:work:next` measurement, from the `attempt`/`retryOf`/`outcome` lineage milestone 20 already writes — the opposite pull, which is the pair's point (57/STORY.md Notes; ADR-001 §4).

The number is produced by `work:counters`, the escape-and-intervention counter registered as `work:counters` (ADR-007 §3; `src/commands/counters.mjs:53`). It is a `determinism: counter` — the count is computed from run records that already exist, so no model instance judges the cascade (ADR-002 §5).

The watcher declares no `actuator`, and the kind admits none (ADR-001 §3). It measures a *different artifact* (`command:work:counters`) from the loop's own `command:work:next` measurement, and counts a *different quantity* from the loop's `controlled:`, so the independence legs 57/01 reads fall out of the records rather than being asserted (ADR-002 §2/§4).
