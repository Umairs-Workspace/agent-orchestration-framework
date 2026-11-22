---
doc: retrospective
promotionFrom: 1
---
# 204 · What aof apply, init and clean write is held to baselines — retrospective

The story-level lessons live with each story: 204/00 R1 and 204/01 R1. Stories 02 and 03 surfaced
none. Those here are what running the milestone taught.

## R1 · The SPEC asked for baselines of behaviour it had not measured, and its acceptance was false

**Kind:** near-miss · **Area:** contract · **Stage:** refine · **Owner:** product-owner · **Raised by:** product-owner (refine) · **Promoted to:** none

**What happened:** The SPEC framed 204 as holding today's output to baselines, with acceptance
that "a merge provably leaves the user's own entries unchanged" and "`clean` provably removes
exactly what aof wrote". Refine measured the three verbs before writing any ADR and found both
false: four defects deleted or replaced the user's files. The operator then chose to fix them in
204. A baseline taken without that measurement would have committed the damage as the expected
output.

**Why:** The SPEC was written from what the verbs are meant to do, and treated a harness milestone
as one that changes no behaviour.

**Lesson:** When a milestone holds behaviour to baselines and its acceptance states a property of
that behaviour, measure the property before framing scope. A false one makes the milestone a fix,
and the operator decides that at refine, before a baseline holds the defect.

**Refs:** ARCHITECTURE "Measured facts"; STATE "operator decision at refine"; ADR-002 to ADR-006.

## R2 · A whole-tree run at the build close was stopped because the tree changed under it

**Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** product-owner (continue) · **Promoted to:** none

**What happened:** After the fourth story, the regression over the finished tree started as
`aof test --scope impacted`, which widens to the full suite on this MacBook. It was stopped after
an hour because the tree changed while it ran. It was replaced by suites run by file: 66 suites,
1,234 cases. This is the contamination 203/R1 named at verify, one milestone earlier, here at the
build close.

**Why:** 203/R1's lesson was written for the regression gate, and was not applied to the other
long runs over the working tree.

**Lesson:** Any run longer than a few minutes tests a frozen tree. Commit or copy the tree first,
and change nothing in it until the run ends. This holds for the regression gate and for every other
long run.

**Refs:** 203/R1; STATE Progress, 2026-11-22 (the regression over the finished tree).
