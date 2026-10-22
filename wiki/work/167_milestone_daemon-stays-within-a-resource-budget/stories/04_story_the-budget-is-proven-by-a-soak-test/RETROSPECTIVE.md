---
doc: retrospective
updated: 2026-10-22
promotionFrom: 1
---
# 04 · The budget is proven by a soak test — Retrospective

## R1 — the soak found two causes the stories before it had missed

- **Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** architect · **Promoted to:** none
- **Raised by:** the 04 build (2026-10-21) and the F-04 profile (2026-10-22)

**What happened.** 00–03 and 05 were each green on their own suites while the real daemon still
idled at 12–14% of a core. The soak, the first test to run the real daemons over a tree aof's size,
found the runs walk (06) and then the stat walk (07). Each was profiled before it was fixed.

**Why.** Every earlier story proved its rule at a seam, over a small fixture, with an injected
clock. None measured the daemon's whole cost on a realistic tree.

**Lesson.** When a milestone's objective is a measured budget, build its end-to-end measurement
first, or early, and let it name the stories. The budget is only proven by the test that measures
it, and stories ordered before that test can each be green while the objective is still red.

**Refs:** STATE.md (167/04 build, F-04 profiled), 167/06, 167/07.

## R2 — a probe named in a plan stopped probing when a later story moved the code

- **Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** qa · **Promoted to:** none
- **Raised by:** the 04 verify

**What happened.** PLAN's red probe was "revert 01's memo: the suite goes red naming `serve` and
`full-disk-read`". Since 07 the walk gate sits beneath the memo, so that revert no longer names
those. The probe was not taken. E3's recorded-phase case is the red the suite carries.

**Why.** The probe was written against the code as it stood at refine, and two stories later
changed what it exercised.

**Lesson.** A red probe written in a PLAN names its code as of refine. Re-check it against the tree
at verify before quoting it as evidence.

**Refs:** VERIFICATION (167/04 evidence), PLAN.md.
