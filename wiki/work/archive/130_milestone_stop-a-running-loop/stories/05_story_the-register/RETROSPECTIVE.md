---
type: story
doc: retrospective
number: 05
slug: the-register
parent: 130
title: "Retrospective — the register"
created: 2026-09-24
updated: 2026-09-24
---
# 130/05 · Retrospective

Story-level lessons; the milestone's are in `../../RETROSPECTIVE.md`.

## R1 — A register story's `reads:` must name every file its controls sweep

- **Kind:** process · **Area:** refine · **Stage:** build · **Owner:** architect · **Raised by:** 130/05 build

**What happened.** The controls' own subjects — `src/loop/cycle.mjs`, the two presence callers,
`supervisor.rs`, `main.rs`, `app.js` — and the class controls a new arch file must satisfy were outside
the declared `reads:`; each was read and reported at build.

**Lesson.** Derive a register story's `reads:` from the controls' subjects and sweeps, not from the
modules the ADRs discuss.

## R2 — A count literal in a contract goes stale by sequencing; the delta is the invariant

- **Kind:** defect · **Area:** refine · **Stage:** build · **Owner:** architect · **Raised by:** 130/05 build

**What happened.** The register said `55 -> 58` and "three drive sites in `src/commands/loop.mjs`";
by build, 129/05 had made the row 59 and 129/04 had moved two drive sites to `cycle.mjs`. The deltas
held (`+3`, three sites across the family FF-12602 sweeps).

**Lesson.** State budget moves and site counts as deltas over a named family ("rises by exactly the
files this story adds"), not as literals of the day the contract was written.
