---
doc: retrospective
---
# 08 · One format — retrospective

## R1 · The store accepted what its own interface could not express

**Kind:** mistake · **Area:** contract · **Stage:** verify · **Owner:** developer · **Raised by:** developer · **Promoted to:** none

**What happened:** The editor saved a box label over 500 characters, and a claimed id that was a Mermaid keyword or over 64 characters. The projection then produced a view the profile's own parser refused, so every review action on that diagram failed. Accept also applied `add` operations without checking them against the proposal.

**Why:** The projection reused a looser id pattern than the parser, and the limits were enforced where the architect writes but not where the person saves. Accept guarded updates by the touch set and left additions unguarded.

**Lesson:** When one store has one interface, check at the store's door that the interface can read back what is saved, and share the parser's rule rather than restating it. Guard additions by what the proposal names, as updates are.
