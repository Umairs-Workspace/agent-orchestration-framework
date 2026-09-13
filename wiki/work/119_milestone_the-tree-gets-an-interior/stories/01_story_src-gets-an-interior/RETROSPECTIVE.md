---
type: story
doc: retrospective
number: 01
parent: 119
slug: src-gets-an-interior
title: "Retrospective — src/ gets an interior"
created: 2026-09-07
updated: 2026-09-07
---
# 119/01 · Retrospective

Lessons from delivering and accepting the story. One `R<n>` per lesson, each carryable. Findings are
**referenced**, never restated: they live in the milestone's `VERIFICATION.md`.

## R1 — The review's YIELD was the lesson, not its blocker: four findings, one species, and it was the milestone's own

- **Kind:** confirmation · **Area:** controls · **Stage:** review · **Owner:** the review lanes · **Raised by:** three lanes over a green build

Three lanes returned ~25 findings over a story whose build was green and whose gate ladder was clean
twice. Four were the SAME species — a control that stores a fact about the tree instead of deriving
one: FF-11904 shipped blind one level below the depth it meters while its own rows told `119/02` and
`119/03` to grow into exactly that depth; FF-11905 swept a STORED list of moved families that goes
stale silently, and widening it to the whole tree immediately surfaced two live instances; 22 exact
specifier assertions were loosened to a directory wildcard; and the FF-5202 pair of R2.

**Lesson.** The milestone's own thesis reproduced inside the work that was ruling it, four times. The
carryable consequence for the remaining stories: treat **"did I re-point a spelling, or fix a rule?"**
as a BUILD-time question rather than a review-time one. Three of the four were found by the lanes and
not by the build, which is exactly the cost of asking it late.

## R2 — Re-pointing a subject set and re-pointing its predicate are two jobs, and doing them by spelling does only one

- **Kind:** defect · **Area:** controls · **Stage:** review · **Owner:** developer + reviewer · **Raised by:** `m119/F-39`, caught twice

`acd-loop-module-import-boundary.test.mjs` collected FF-5202's doctor targets with
`readdir("src") + /^work-doctor/` — 9 modules before the move, **0** after — while its non-vacuity leg
stayed satisfied by `ui/`'s 129 files alone. Repaired. Round 2 found the same defect one layer down:
the `forbidden` token was armed against every loop-family spelling EXCEPT `./loops.mjs`, the only one
a doctor module can write once it is a sibling of the loader. Pre-move that hole did not exist; the
move created it, and both repairs had treated the SPELLING as the subject when the subject is the
EDGE.

**Lesson.** The fix that closed the class was to resolve each target's specifiers against the target's
own directory and refuse any that lands in the family — assert the edge, not the depth. A non-vacuity
floor satisfied by a DIFFERENT population than the one the control is about is not a floor; scope the
floor to the subject.

## R3 — A review round that does not reduce the blocker count is the signal to hand back, not to grind

- **Kind:** process · **Area:** loop · **Stage:** review · **Owner:** the loop · **Raised by:** `work.loop.reviewRounds`' stall rule

The build lane stopped at round 2 rather than opening round 3: the Blocker count did not fall between
rounds (1 → 1). The story sat with the operator's call — force-proceed, give guidance, or re-refine.

**Lesson.** The stall rule worked and the hand-back was correct. What it cost is the thing to carry:
the story then sat `in-review` with a blocker whose fix was already described IN the finding ("resolve
the edge, not the spelling"), and nothing re-opened it until accept. A stall hand-back should carry
the fix it already knows, so the resumption is a build step rather than a re-diagnosis.

## R4 — A contract that pins an ABSOLUTE count is stale the moment its predecessor merges

- **Kind:** blind spot · **Area:** contract · **Stage:** refine · **Owner:** the amigos · **Raised by:** `m119/F-11`

The `.feature` files state `ls src/*.mjs | wc -l` = 159 → 128 → 88 and `test/arch/` = 433. At build the
tree read **160 → 129 → 89** and **436** — the difference being `119/00`'s own four new modules. Nothing
in the delivered contract was edited: the scenarios' INVARIANT is "the root falls by exactly the
family's size", and that held exactly (160 − 31 − 40 = 89).

**Lesson.** Pin a DELTA, not an absolute, in any contract whose predecessor story touches the same
subject — and this milestone had three more stories that each moved these same numbers. Where an
absolute is genuinely wanted (a ceiling), it belongs in the control with the command that measured it,
where it is re-measured at landing rather than at authoring.
