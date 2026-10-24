---
doc: retrospective
---
# 09 · Project libraries — retrospective

## R1 · Only aof's own insertions were anchored, and a real library was unusable without search

**Kind:** near-miss · **Area:** code · **Stage:** verify · **Owner:** developer · **Raised by:** operator · **Promoted to:** none

**What happened:** An item the architect placed got an anchor box for arrows, but one a person dragged in from the panel did not, so an edge proposed to it never bound. With the fix, the UAT connected a hand-placed Kinesis icon live. The same UAT loaded a real set of 249 AWS icons and found the panel has no search (F-170-12, deferred).

**Why:** The flow was proven with a one-item hand-made library, the item the smoke itself inserted, so neither the hand-placed path nor library size was exercised.

**Lesson:** Prove a library feature with the operator's real library and their own insertions, not a fixture of one item.
