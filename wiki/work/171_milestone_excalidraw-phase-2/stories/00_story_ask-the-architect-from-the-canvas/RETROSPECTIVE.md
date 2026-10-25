---
doc: retrospective
promotionFrom: 1
---
# 00 · Ask the architect from the canvas — retrospective

## R1 · The overlay could not be one z-index, and only a screenshot showed it

**Kind:** near-miss · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** developer · **Promoted to:** none

**What happened:** At the SDK's canvas-button layer the action sat correctly under the SDK's menus, but
the 320 px question field slid under the properties panel and was typed into half-hidden. Every
check passed; reading screenshot 08 found it.

**Why:** The overlay is two kinds of thing — anchored buttons, which belong under the SDK's panels,
and an open popover, which must be read — and one layer cannot serve both.

**Lesson:** An open field or popover over the SDK rises above its layer UI, and the smoke asserts
nothing is drawn over it. Story 05's thread popover took the same rule.

**Refs:** STATE `## Feedback (for retro)` (171/00); 171/R4 for the keyup the field also needed.
