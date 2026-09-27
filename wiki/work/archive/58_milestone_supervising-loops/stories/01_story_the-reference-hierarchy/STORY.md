---
type: story
number: 01
slug: the-reference-hierarchy
title: "The reference hierarchy and the arbiter — five authored ownership edges, seven declared layers, and one node that owns the standing trade-off"
parent: 58
status: done
owner: product-owner
created: 2026-08-28
updated: 2026-08-29
depends: [58/00]
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/58_milestone_supervising-loops/ARCHITECTURE.md#ADR-001, wiki/work/58_milestone_supervising-loops/ARCHITECTURE.md#ADR-002, wiki/work/58_milestone_supervising-loops/ARCHITECTURE.md#ADR-003, wiki/work/58_milestone_supervising-loops/ARCHITECTURE.md#ADR-004, wiki/work/58_milestone_supervising-loops/RESEARCH.md#Q1, wiki/work/58_milestone_supervising-loops/RESEARCH.md#Q3, wiki/work/58_milestone_supervising-loops/RESEARCH.md#Q4, src/bundle/loops/product-owner.md, src/bundle/loops/autonomous-cascade-watcher.md, src/bundle/loops/build-to-green-watcher.md, src/bundle/loops/review-fix-rereview-watcher.md, src/bundle/loops/rubric-process-exit.md, src/bundle/loops/run-liveness.md, src/bundle/bundle.json, src/run-store.mjs, src/loop-bounds.mjs, .aof/aof.config.json, src/bundle/commands/autonomous.md, src/bundle/commands/verify.md, src/bundle/commands/continue.md, test/arch/acd-registry-framework-owned.test.mjs]
files: [src/bundle/loops/product-owner.md, .aof/loops/product-owner.md, src/bundle/loops/autonomous-cascade.md, src/bundle/loops/build-to-green.md, src/bundle/loops/review-fix-rereview.md, src/bundle/loops/run-resilience.md, src/bundle/loops/mesh-assignment-reclaim.md, src/bundle/loops/retrospective-memory-ingest.md, src/bundle/loops/verify-triage-accept.md, src/bundle/loops/operator.md, src/bundle/loops/run-lifecycle-policy.md, src/bundle/loops/speed-thoroughness-autonomy.md, src/bundle/bundle.json, src/bundle/manifest.json, .aof/loops/autonomous-cascade.md, .aof/loops/build-to-green.md, .aof/loops/review-fix-rereview.md, .aof/loops/run-resilience.md, .aof/loops/mesh-assignment-reclaim.md, .aof/loops/retrospective-memory-ingest.md, .aof/loops/verify-triage-accept.md, .aof/loops/operator.md, .aof/loops/run-lifecycle-policy.md, .aof/loops/speed-thoroughness-autonomy.md, .aof/aof.lock.json, test/arch/acd-day-one-supervision-complete.test.mjs, test/work-loops-home-and-delivery.test.mjs, scripts/test.mjs]
---
# 01 · The reference hierarchy and the arbiter

## User story

As the operator of a system whose loops each drive toward a target,
I want every declared loop to name the node that sets its target and the timescale it runs at, and I
want the standing speed-versus-thoroughness-versus-autonomy conflict resolved by one node that says
which demand wins and cannot itself pull any of the actuators it arbitrates over,
so that revising a target becomes a cycle somebody owns rather than an edit somebody makes, and the
tie-break stops being whichever concern I happen to have front of mind that evening.

Milestone 52 shipped the two checks that report this absence and they have reported it ever since:
five loops with no owner, and three actuators shared by loops that pull them in different directions
with nobody entitled to decide. This story is the records that answer both — the day-one hierarchy,
faithfully described, for the loops aof actually runs.

Five of those edges cannot be discovered, only authored: no artifact in this repository sets those
references today (`RESEARCH §Q1`). Authoring them is the design act this milestone exists to perform,
and each record says so in its own body — an authored edge is honest when it declares itself authored,
and a fabricated citation is not honest at any length.

## Tasks

- [x] `tasks/00_every-loop-has-an-owner.feature` — every declared loop gains an inbound target-setting edge from an admissible owner, and the unowned-reference findings go to zero
- [x] `tasks/01_an-authored-edge-says-it-was-authored.feature` — each edge this milestone authored rather than discovered declares that in its own record, and the one policy the code fixes is grounded by a frozen-rule anchor instead of an invented citation
- [x] `tasks/02_every-loop-declares-its-layer.feature` — each loop declares the timescale it runs at, corroborated by its cadence's scope, with any single uncorroborated layer named and defended in its own record
- [x] `tasks/03_the-arbiter-of-the-standing-conflict.feature` — one arbiter resolves speed versus thoroughness versus autonomy, vetoes every contender for the shared actuators, and names the knobs it owns in a priority order that is a permutation of that veto set
- [x] `tasks/04_the-registry-ships-and-installs.feature` — the new records are registered as bundle assets and land in a project through `aof work update`, not only in the source tree

## Notes

- **Five authored edges, one anchor, one arbiter — the exact set (ADR-001 §2, ADR-003).**
  `actor:operator` sets the references of `loop:mesh-assignment-reclaim` and
  `loop:retrospective-memory-ingest`; `loop:autonomous-cascade` sets those of `loop:build-to-green`
  and `loop:review-fix-rereview` (the slower loop above the faster one — the milestone's whole
  structural move); and a new `anchor:run-lifecycle-policy` grounded on the transition table the code
  fixes sets `loop:run-resilience`'s. One new `arbiter:speed-thoroughness-autonomy` vetoes all four
  contenders for the three shared agent actuators.
- **The measurement this story is judged by, taken at refine.** `aof work loops validate` reports
  **39 findings, 0 errors** today, of which **5** are `loop-unowned-reference` and **3** are
  `loop-shared-actuator-unarbitrated`. The architect drove a prototype of these records through the
  real loader and checks: after this story, ownership findings **0**, arbitration findings **0**, total
  **34** — the two new lines being `loop-timescale-not-comparable`, which 58/02's layer axis then
  clears. Same command, same registry, and the composition is the evidence.
- **57/05 was declined on its first pass for shipping records that were never installed**, which is
  why task 04 exists and is not optional. A record that lives only in `src/bundle/loops/` is not in any
  project's registry, and the gate 58/02 turns on reads the installed one.
- **The installed copies are written by `aof work update`, never by hand** (ADR-006 §4). They appear
  in this story's `files:` because they land in its diff; `.aof/loops/**` is a denied Edit/Write path
  in this repo's settings, so a hand edit is refused at the tool boundary rather than reviewed later.
- **`owner:` and the target-setting edge are different claims and must not disagree.** `owner:` names
  who is accountable for the loop; the edge names who sets its reference. Where a record declares both,
  `FF-5806` requires the actor named by `owner:` to declare the matching edge.
- **This story lands after 58/00 and before 58/02**, and both edges are real: a record declaring
  `kind: arbiter` before the schema admits it is `loop-unknown-key`, and a gate arriving before these
  records turns the tree red for work that is merely unfinished — 57/ADR-007 §6's trap, named here
  rather than rediscovered.
