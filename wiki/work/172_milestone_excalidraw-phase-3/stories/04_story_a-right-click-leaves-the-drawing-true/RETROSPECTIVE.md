---
doc: retrospective
promotionFrom: 1
---
# 04 · A right-click leaves the drawing true — retrospective

## R1 · A gesture that missed its target would have read green

**Kind:** near-miss · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** developer · **Promoted to:** none

**What happened:** At 100% zoom the edge label sat under 01's panel, and the first right-click opened
no menu. A check that compared only the drawing before and after would have passed on a gesture
that never happened.

**Why:** The panel narrowed the canvas to about 900 px at 1280, and the coordinates were written for
the full-width canvas.

**Lesson:** A browser check that drives a gesture asserts that the gesture landed (here, that its own
element's menu opened) before it asserts the outcome; fit the drawing to the view first.

**Refs:** VERIFICATION `### 172/04 tasks 00 and 01`.

## R2 · The scenarios named an edge label the scene does not hold

**Kind:** misunderstanding · **Area:** contract · **Stage:** refine · **Owner:** product-owner · **Raised by:** developer · **Promoted to:** none

**What happened:** The scenarios name "the 'propose' edge's label", but no label in 171's scene reads
"propose": the edge is labelled "3 writes a record", and only its source box reads `--action
propose`. The checks drive the real label, and the wording was flagged and left unchanged.

**Why:** The contract was written from the operator's description of the edge, not from the scene file.

**Lesson:** A scenario over a real corpus quotes the corpus: read the scene file and name the element
as it is labelled.

**Refs:** STATE `## Feedback (for retro)` (172/04 close).
