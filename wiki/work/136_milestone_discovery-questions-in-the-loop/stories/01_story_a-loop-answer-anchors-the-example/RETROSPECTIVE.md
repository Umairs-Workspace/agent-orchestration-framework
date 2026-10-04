---
doc: retrospective
updated: 2026-10-04
---
# 136/01 · A loop answer anchors the example — Retrospective

## R1 — the reader claimed the mesh worker's answers without reading one

- **Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** architect
- **Raised by:** `aof:verify 136`

**What happened.** ADR-001 §4 says a mesh worker's answer "reaches the worker's own run record
through `park-resume.mjs`, so the same read covers it". The worker does write an `asks` entry, but
with `question: null`, so no token opens it and the reader anchors nothing (F-136-03).

**Why.** The claim was reasoned from the write path's existence, not from the entry it writes.

**Lesson.** When an ADR says another path "is covered", name the field the reader keys on and read
one entry that path writes. A covering claim is a measurement, not an inference.

## R2 — the story's controls left two tree-reading checks stale

- **Kind:** mistake · **Area:** contract · **Stage:** build · **Owner:** developer
- **Raised by:** `aof:verify 136`

**What happened.** 01 added 18 cases without re-measuring 142's Plan 09 ledger (`core-workspace`
red, F-136-05), and FF-13601's walk filtered a directory listing with no non-vacuity leg, which
FF-11902 reds at the whole-tree gate.

**Lesson.** The same as 135/R1: list the tree-reading controls for every directory and registry a
story touches, and run them in the story lane. `core-workspace` and `acd-control-derives-its-census`
belong in any lane that adds a case or a walk.

**Refs:** 135/R1, F-136-05.
