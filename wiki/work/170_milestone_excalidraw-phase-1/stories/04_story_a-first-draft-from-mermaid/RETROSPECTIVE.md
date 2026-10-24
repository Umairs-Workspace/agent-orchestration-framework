---
doc: retrospective
---
# 04 · A first draft from Mermaid — retrospective

## R1 · An empty canvas had never loaded its font, so the first draft measured every label wrong

**Kind:** near-miss · **Area:** code · **Stage:** verify · **Owner:** developer · **Raised by:** operator · **Promoted to:** none

**What happened:** At the UAT, a first draft's labels were clipped by their own boxes. Excalidraw fetches a font only once the scene draws text in it. A first draft lands on an empty canvas, so the converter measured and wrapped every label in the fallback font. The browser smoke passed because its labels ("API", "Store") were too short to overflow.

**Why:** The smoke's fixture was chosen for the flow, not for text that stresses measurement, and every green check read files and panels rather than glyph widths.

**Lesson:** Load what measurement depends on before measuring, and give a browser check one label long enough to wrap. This is R1/R6/R8's rule a fourth time: the operator's eye on a real diagram caught it.
