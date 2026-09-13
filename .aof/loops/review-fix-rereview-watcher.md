---
# aof-generated: true — framework loop record; installed by `aof work update`, edit it in aof, not here.
id: watcher:review-fix-rereview-watcher
kind: watcher
title: Review-fix-rereview watched against finding escape
counter: findings raised after the item was accepted
determinism: counter
measurement: [command:work:counters]
monitoring: [loop:review-fix-rereview]
---
# Review-fix-rereview — watcher

Framework record source: `src/bundle/loops/review-fix-rereview-watcher.md`; installed by `aof work update` — edit it in aof, not here, and put per-project values in `.aof/aof.config.json` behind a `config:` pointer.

This watcher pairs the `loop:review-fix-rereview` optimizer (ADR-007 §6). The review loop optimises *open review findings* down toward zero through an actuator that applies confirmed fixes. The counter-metric is the finding-escape rate: *findings raised after the item was accepted* — findings that survived the loop that was supposed to close them. It pulls the opposite way from the loop's own axis, which is the pair's point (57/STORY.md Notes; ADR-001 §4).

The number is produced by `work:counters`, the escape-and-intervention counter registered as `work:counters` (ADR-007 §3; `src/commands/counters.mjs:53`). It is a `determinism: counter` — the count is computed from feedback records that already exist, so no model instance re-judges a review (ADR-002 §5).

The watcher declares no `actuator`, and the kind admits none (ADR-001 §3). It measures a *different artifact* (`command:work:counters`) from the loop's own `prose:` measurement, and counts a *different quantity* from the loop's `controlled:`, so the independence legs 57/01 reads fall out of the records rather than being asserted (ADR-002 §2/§4).
