---
type: story
doc: retrospective
number: 05
slug: this-tree-holds-what-is-live
parent: 127
title: "Retrospective — this tree holds what is live"
created: 2026-09-17
updated: 2026-09-17
---
# 127/05 · Retrospective

Story-level lessons; the milestone's are in `../../RETROSPECTIVE.md`. Findings are referenced,
never restated (`../../VERIFICATION.md`).

## R1 — A suite over the real stream is a suite over a moving target

- **Kind:** defect · **Area:** tests · **Stage:** verify · **Owner:** product-owner · **Raised by:** `F-15`

**What happened.** Written on the day of the move, the suite pinned five facts of that day's tree;
131's framing, 42's archive as an imported milestone, the GSD-era record under `archive/` and the
calendar broke all five within 24 hours, and the gate's first run named them.

**Lesson.** The outsider's check is a set of PROPERTIES (the root partition is exact; every
`ITEM_RE` entry under `archive/` is done; no link resolves worse; the scaffold is dated today); a
literal in it is a fact that the next commit falsifies.

## R2 — The move ran before its dependencies were accepted

- **Kind:** process · **Area:** loop · **Stage:** build · **Owner:** the operator · **Raised by:** `F-28`

**What happened.** Task 01's Given says "stories 01–04 accepted"; the loop's `--through-review`
walk offered this story once 02–04 were in review, and the lane ran the 2,289-file move then. The
move was sound; the precondition was not the one the contract spelled.

**Lesson.** An irreversible act on the real tree gates on `done`, not on `in-review` — say so in
`depends:` as an accept edge, or hold the story out of the wave until the accept.
