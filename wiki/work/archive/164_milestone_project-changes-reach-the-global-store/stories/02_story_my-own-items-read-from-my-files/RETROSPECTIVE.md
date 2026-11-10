---
doc: retrospective
promotionFrom: 1
---
# 164/02 · My own items read from my files — retrospective

## R1 · The plan named the wrong "self" id, which would have read this node's own rows as another's

**Kind:** mistake · **Area:** architecture · **Stage:** build · **Owner:** architect · **Raised by:** developer (build) · **Promoted to:** none

**What happened:** The plan said to identify this node with `meshNodeIdOf`. The publisher stamps
rows with `deriveNodeId` (the pinned id, else the opaque `node-<hash>`), and `meshNodeIdOf` returns
only the pin. On an unpinned node, every own row would have read as "reported elsewhere" and been
overlaid from the cache, which is the bug the story removes.

**Why:** Two functions answer "who am I" for different purposes, and the plan picked by name.

**Lesson:** A rule that compares "this node" with a row's author takes the id from the function
that WROTE the author column, never a lookalike. The cache read now hands its resolved
`selfNodeId` to both the overlay and doctor.

**Refs:** ../../STATE.md build close (164/02).
