---
type: story
doc: retrospective
number: 03
slug: archive-is-a-move
parent: 127
title: "Retrospective — archive is a move"
created: 2026-09-17
updated: 2026-09-17
---
# 127/03 · Retrospective

Story-level lessons; the milestone's are in `../../RETROSPECTIVE.md`. Findings are referenced,
never restated (`../../VERIFICATION.md`).

## R1 — The lane's `aof work update` never reached the branch

- **Kind:** defect · **Area:** loop · **Stage:** build · **Owner:** 129 · **Raised by:** `F-13`

**What happened.** This story declares `.aof/aof.lock.json` as a write because rendering
`/aof:archive` re-stamps it; the lane did stamp it, and the loop's reconcile reset `.aof/` before
committing the lane. The branch carried a lock with none of `archive.md`'s three renders, FF-12405
leg 9 was red at the door, and this story's own `work/archive-is-a-move: 04` was red in every
checkout — visible to 04's build, invisible to this story's review, which ran in the lane where the
lock was right.

**Lesson.** A declared write under `.aof/` is only real once the reconcile carries it; until the
loop does, the story's reviewer checks the BRANCH's lock, not the lane's.

## R2 — The path-reader census was wrong by measurement, and the surplus was the next story's

- **Kind:** contract · **Area:** refine · **Stage:** build · **Owner:** product-owner · **Raised by:** the build's re-measurement

**What happened.** The refine counted two runtime readers of a live item path outside `wiki/`; the
build's own grep found ten more test files reading a real item folder, and 05's move found 27
(seventeen spelled with `path.join(…, "wiki", "work", "<NN>_…")`, which the refine's regex could not
see). The census suite names every reader as a ledger so a new one fails it.

**Lesson.** A census over the tree is measured by the shape the readers USE (a `path.join` as much
as a string), and a story that will move folders inherits the census as a contract clause — 05's
did, by amendment.

## R3 — A convergence scenario that contradicts its own Examples row

- **Kind:** contract · **Area:** refine · **Stage:** build · **Owner:** product-owner · **Raised by:** the build (STATE feedback)

**What happened.** Task 01's zeta row asked for the syntactic insert (`../../archive/12_…`) and its
convergence scenario asked the identical shape to come out normalised (`../13_…`); one rule cannot
produce both. Built to the declared invariant — every link resolves to the same path — so the two
orders converge in RESOLUTION and not in bytes.

**Lesson.** When a scenario and its Examples row disagree, the invariant the task declares decides,
and the disagreement is recorded rather than split; `--done` moves the set together and never meets
the case.
