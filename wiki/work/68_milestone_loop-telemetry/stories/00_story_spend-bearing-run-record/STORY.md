---
type: story
number: 00
slug: spend-bearing-run-record
title: "The spend-bearing run record — a sixteenth key, and a writer that refuses a lie"
parent: 68
status: done
owner: product-owner
created: 2026-08-20
updated: 2026-08-22
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 00 · The spend-bearing run record — a sixteenth key, and a writer that refuses a lie

## User story

As the framework asking what a piece of work cost,
I want each run record to carry its own token, cost and exit facts in a shape the writer validates,
so that the answer comes from the record that was there when the run happened, instead of being
reconstructed months later by a miner that can double-count it.

## Why

The run record is fifteen fields (`src/run-store.mjs:344-362`) and carries **no tokens, no cost,
no model and no duration** beyond `updatedAt - createdAt` — where `updatedAt` only moves on a state
transition. Everything aof knows about its own spend is therefore reconstructed after the fact, and
that reconstruction is measurably wrong: 18 of 143 agent rows appear in two milestone reports,
billing 7.07 h and 1,345k output tokens twice (`RESEARCH-agent-loop-economics.md` §0, §5.6).

**This story is the foundation of the milestone and lands alone, first.** `aof graph impact
src/run-store.mjs` reports **41 dependents** — the highest-coupled module in the milestone. Every
other story in 68 reads the contract this one defines, so cutting it alongside anything else would
put two stories on the file 41 modules import (`ARCHITECTURE.md` § Story partition).

**The two decisions it makes are the ones the milestone was blocked on.** ADR-003 settles the
token-bucket convention that the STATE note names as the actual failure mode — *"the failure mode is
not choosing, which is how the current double-count arose"* — and ADR-004 settles what `costUsd`
means when nothing authoritative reported one. Both are enforced **in the writer**, because a
convention that lives in a comment is precisely the state that produced the defect.

**And it is deliberately additive.** The record's key set is frozen and enumerated positionally in
four places on this tree, and its own comment block documents a lineage of single-key extensions
where absence is benign. ADR-001 keeps that discipline: one envelope key, appended last, defaulting
`null`.

## Tasks

- [x] `tasks/00_sixteenth-key-additive.feature` — `spend` is the sixteenth key, appended last, and a fifteen-key record reads forward unchanged
- [x] `tasks/01_token-buckets-refused-at-write.feature` — the four buckets are mutually exclusive, and the writer refuses a record that overlaps
- [x] `tasks/02_cost-stamped-once.feature` — `costUsd` is written once at settle with its source and price-table version, and no read path recomputes it
- [x] `tasks/03_exit-reason-vocabulary.feature` — `exitReason` is a closed typed vocabulary that records how a run ended and decides nothing

## Notes

- **Fitness functions declared for this story:** FF-6801, FF-6802, FF-6803, FF-6804
  (`ARCHITECTURE.md` § Fitness functions). Each is `pending` until its file lands here, and each
  owes a red probe in `VERIFICATION.md` once it does.
- **The four frozen-key pin sites this story amends** (measured, not guessed):
  `test/run-resilience-record-keys.test.mjs:27`, `test/run-store-record.test.mjs:24`,
  `test/arch/acd-run-record-node-additive.test.mjs:25`,
  `test/arch/acd-loop-state-rides-the-run-record.test.mjs:14`. The additive-discipline guard is
  **extended**, never joined by a sibling (ADR-001).
- **`phase` is not a field here** — it rides `brief.loop.phase`, delivered by milestone 53
  (ADR-002). FF-6802 makes that single authority structural.
- **ADR-008 binds this story hardest.** `run-store.heartbeat()` has zero production callers and
  sits six lines from the record being extended. It stays unwired; its caller belongs to
  milestone 69.
