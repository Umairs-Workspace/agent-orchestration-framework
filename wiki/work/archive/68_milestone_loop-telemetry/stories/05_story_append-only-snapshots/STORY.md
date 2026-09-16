---
type: story
number: 05
slug: append-only-snapshots
title: "Append-only snapshots — an observe run stops overwriting the evidence a retrospective cited"
parent: 68
status: done
owner: product-owner
created: 2026-08-20
updated: 2026-08-21
depends: [68/00]
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 05 · Append-only snapshots — an observe run stops overwriting the evidence a retrospective cited

## User story

As someone checking a claim a retrospective made about a past milestone,
I want each observe run to write a new snapshot instead of overwriting the last one,
so that a citation to an observability report still points at the numbers that were cited, rather
than at whatever the most recent re-run produced.

## Why

**The framework has already destroyed its own evidence, and it is unrecoverable.**
`observeMilestone` writes `observability/report.md` and `observability/agents.json` **in place**
(`src/work-observe.mjs:1114-1119`). Milestone 45's retrospective cites *"477h39m span, 30m17s
active, 14h39m human-blocked, one infra kill"*. The file it cites now reads **25m21s span, 25m21s
active, 46m58s human-blocked, 0 infra kills**. The report was regenerated over the evidence it was
written from.

The consequence generalises: every `Refs: observability/report.md` in the corpus is a citation to a
**mutable path**, and therefore unfalsifiable. That is not a reporting inconvenience — it is the
reason the milestone's own SPEC can say the reconstruction "overwrites its own history" as a
first-class defect rather than a nuisance.

**Why marking, not migrating, is the right treatment of what exists.** Retro-fitting history is
explicitly out of the milestone's scope, and rewriting the very files whose rewriting is the defect
would be self-refuting. Existing snapshots get a header stating they were derived by the pre-68
miner — and are therefore subject to the double-count and the blind classifier — and are otherwise
left exactly as they are (ADR-007).

**The invariant has to be structural, not a convention.** "Don't truncate" is the kind of rule a
later edit loses without noticing, and the cost of losing it is silent and permanent. FF-6807 pins
it at the level of the write path itself.

**It is the smallest region in the milestone** — the write block at `:1114-1119` and nothing else —
which is what lets it run in parallel with the other observe stories on the same leaf module.

## Tasks

- [x] `tasks/00_never-overwrite.feature` — a second observe run over the same item leaves the first snapshot byte-identical and adds a new one
- [x] `tasks/01_legacy-snapshots-marked.feature` — snapshots written by the pre-68 miner are marked as derived by it, and their numbers are left untouched

## Notes

- **Fitness function declared for this story:** FF-6807 (`ARCHITECTURE.md` § Fitness functions) —
  no write path opens an existing snapshot for truncation or rewrite. `pending` until
  `test/arch/acd-observe-snapshots-append-only.test.mjs` lands here; owes a red probe in
  `VERIFICATION.md`.
- **Snapshots accumulate, and that is the accepted trade** (ADR-007): they are small, they are the
  evidence, and the alternative is the state that produced the ADR.
- **The same discipline one layer down is ADR-004's** — a settled `costUsd` is never recomputed
  either. The framework does not rewrite its own evidence, at either layer.
- **Disjoint from 68/03 and 68/04 by region**; parallel-eligible with 68/01, 68/02 and 68/04 once
  68/00 lands.
