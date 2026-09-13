---
# aof-generated: true — framework loop record; installed by `aof work update`, edit it in aof, not here.
id: watcher:build-to-green-watcher
kind: watcher
title: Build-to-green watched against contract shrinking
counter: whether the acceptance criteria got smaller
determinism: counter
measurement: [command:work:ratchet]
monitoring: [loop:build-to-green]
---
# Build-to-green — watcher

Framework record source: `src/bundle/loops/build-to-green-watcher.md`; installed by `aof work update` — edit it in aof, not here, and put per-project values in `.aof/aof.config.json` behind a `config:` pointer.

This watcher pairs the `loop:build-to-green` optimizer (ADR-007 §6). The build loop optimises *executable scenarios and fitness functions green* — its `controlled:` on `src/bundle/loops/build-to-green.md:6` — through an actuator that can edit what that measurement observes. The counter-metric here is deliberately the opposite pull: *whether the acceptance criteria got smaller*. A build that ships by shrinking its own contract looks green on the loop's own axis and red on this one, which is the whole point of the pair (57/STORY.md Notes; ADR-001 §4).

The number is produced by `work:ratchet`, the contract-integrity counter registered as `work:ratchet` (ADR-007 §3; `src/commands/ratchet.mjs:185`). It is a `determinism: counter` — a machine produces the number by comparing the item's base commit against its head, so no model instance is asked to grade the build that just ran (ADR-002 §5).

The watcher declares no `actuator`, and the kind admits none (ADR-001 §3). It measures a *different artifact* (`command:work:ratchet`) from the loop's own `prose:` measurement, and counts a *different quantity* from the loop's `controlled:`, so the independence legs 57/01 reads fall out of the records rather than being asserted (ADR-002 §2/§4).
