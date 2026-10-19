---
doc: retrospective
promotionFrom: 1
---
# 160/10 · The audits over this repository read once — retrospective

## R1 · The first red probe stayed green, and that measured the outline

**Kind:** near-miss (finding) · **Area:** process (test) · **Stage:** verify · **Owner:** qa · **Raised by:** developer · **Promoted to:** none

**What happened:** Dropping `yield` from the keyword set left every outline row green. A regex misread as
division survives stripping unless it holds `//`, `/*` or a quote, and no test file has `yield /`. The
whole-tree byte-identity leg is what bites; a second probe (the look-back not skipping whitespace) reddened it.

**Why:** The outline's rows test that the scanner reaches the right answer, and many wrong decisions reach the
same answer.

**Lesson:** For a scanner, the byte-identity leg over the real tree is the control; outline rows only document
cases. A probe that stays green is recorded, not discarded.

**Refs:** ../../VERIFICATION.md (Story 10); ../../STATE.md (160/10).

## R2 · The same quadratic read survives in memory ingest

**Kind:** near-miss (finding) · **Area:** code · **Stage:** build (review) · **Owner:** product-owner · **Raised by:** developer (review) · **Promoted to:** none

**What happened:** `packages/knowledge/src/memory/episodic-indexing.mjs` reads each item's snapshot by ref, so
ingest lists the stream once per item, exactly as the corpus did. The seam now takes the row; passing it there is
a small change outside this story's write set. It was fixed at verify (F-05): the ingest's build now carries
the walk's rows, and FF-16012 gained a row for the ingest.

**Why:** Refine's profile covered the audits the suite runs, not every caller of the snapshot seam.

**Lesson:** When a seam is fixed for one caller, grep its other callers and fix each one in the same item.

**Refs:** ../../VERIFICATION.md F-05; ../../STATE.md (160/10 review).
