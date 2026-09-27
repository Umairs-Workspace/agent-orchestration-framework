---
type: story
number: 05
slug: the-pairing-table
title: "The pairing table — every optimizing loop aof actually runs gets its watcher, shipped"
parent: 57
status: done
owner: product-owner
created: 2026-08-27
updated: 2026-08-28
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 05 · The pairing table

## User story

As anyone running aof — including aof itself,
I want the framework to ship the watchers for its own optimizing loops, installed the same way its
loop records are,
so that the rule this milestone enforces on everyone else is a rule the framework has already
satisfied, verifiably, in the registry every project receives.

This is the story where the milestone's claim becomes a fact about the tree rather than a capability.
Three loops declare `optimizing: true` and none of them is watched (measured 2026-08-27):

| loop | counter-metric | how it is produced |
|---|---|---|
| `loop:build-to-green` | did the item's acceptance criteria get smaller | the contract-integrity ratchet (57/03) |
| `loop:review-fix-rereview` | findings raised after the item was accepted | the escape counter (57/04) |
| `loop:autonomous-cascade` | how often a run needed a retry or a hand | the intervention counter (57/04) |

Each becomes a watcher record under `src/bundle/loops/`, installed to `.aof/loops/` by
`aof work update` exactly as the eleven existing records are. Each declares `determinism: counter`,
because in all three cases a machine produces the number — which is what lets the framework's own
table satisfy the rule that counters beat judges rather than merely endorsing it.

## Tasks

- [x] `tasks/00_the-framework-ships-its-own-watchers.feature` — three watcher records, installed by the same path as every other loop record, each pointing at a counter that resolves
- [x] `tasks/01_the-registry-passes-its-own-gate.feature` — the shipped registry produces zero gating findings, and each watcher is independent of the loop it watches

## Notes

- **This story lands before 57/01's gate turns on.** ADR-007 §6, and it is the milestone's only
  ordering constraint. The gate makes `loop-unpaired-optimizer` an error; the three loops are
  unpaired today; a gate arriving first turns the tree red for work that is merely unfinished.
- **All three watchers are `determinism: counter`, and that is a claim the checks verify.** Each
  cites `command:work:ratchet` or `command:work:counters` — pointers at something code runs — so
  57/01's not-deterministic leg passes on merit rather than by omission. The command ids are frozen
  in ADR-007 §3 so these records can be authored before either command lands.
- **Independence is a property of these records, not an assertion about them.** Each watcher's
  measurement is disjoint from its loop's, none carries an actuator (the kind admits no such key),
  and none cites an agent definition — so all four of 57/01's legs pass structurally. Task 01 asserts
  that as an outcome rather than assuming it.
- **`src/bundle/bundle.json` is an append-only registration hub** (55/ADR-007 §4). This story appends
  its asset entries and no other story touches the file.
- **Installed records are framework-owned and carry the generated marker.** The eleven existing
  records all begin `# aof-generated: true — framework loop record; installed by aof work update,
  edit it in aof, not here.` These three do the same, or the next `aof work update` treats them as
  operator edits.
- **The counter-metric wording is the reviewable half and is chosen, not generated.** ADR-001 §4: a
  reader must be able to see, without running anything, that each counter is a *different quantity*
  from the loop's controlled variable. `build-to-green` controls *executable scenarios and fitness
  functions green*; its watcher counts *whether the criteria got smaller*. Those pull opposite ways,
  which is the whole point.
