---
doc: retrospective
promotionFrom: 1
---
# 168/00 · A prototype is a work item — retrospective

## R1 · Widening the item grammar would have blinded the control that guards it

**Kind:** near-miss · **Area:** architecture · **Stage:** build · **Owner:** architect · **Raised by:** developer (build) · **Promoted to:** none

**What happened:** `ITEM_RE` and `BACKLOG_ITEM_RE` gained `prototype`. FF-12701's detector
(`acd-work-root-one-enumerator`) looked for a second copy of the folder grammar by matching the old
alternation literally. A copy of the new grammar would have gone unseen, and the control would
still have been green. The build changed the detector and the pinned enumerate suite along with the
grammar, but neither file was in `files:`. The declaration also missed `item-status.mjs`, which
passes the item's type to five `itemStatusEdges` calls.

**Why:** The story's `files:` named the modules that declare the grammar and the lifecycle, but
not the controls and doors that read them literally.

**Lesson:** When a story widens a grammar or a vocabulary, search the controls for the old literal
before settling `files:`. A detector that matches the old spelling is part of the change, and if
it is left alone it still passes against the new spelling.

**Refs:** ../../STATE.md Feedback (continue 00); ../../VERIFICATION.md F-01.
