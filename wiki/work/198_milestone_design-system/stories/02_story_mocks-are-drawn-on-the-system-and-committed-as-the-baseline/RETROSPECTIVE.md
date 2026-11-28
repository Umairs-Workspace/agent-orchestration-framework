---
doc: retrospective
---
# 198/02 · Mocks are drawn on the system and committed as the baseline — Retrospective

## R1 · The config's decision was offered again as a choice

**Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** product-owner · **Raised by:** operator · **Promoted to:** none

- **What happened:** with a system configured, refine still asked how the mocks should be made (F-05).
- **Why:** the practice's prose was written as an offer beside the old elicitation, not as its replacement.
- **Lesson:** when config names a decision, the prose that runs under it replaces the question it answers; it never offers it back.
- **Refs:** VERIFICATION F-05.

## R2 · A self-contained baseline was claimed without rendering a real board

**Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** verifier · **Promoted to:** none

- **What happened:** two of the portal's approved baselines were committed blank (F-07): the import took `canvas.json`'s page as the whole dependency set and capture opened boards from `file://`.
- **Why:** every fixture board was standalone, and FF-19805 checked the sources a board names, not the components it mounts.
- **Lesson:** prove "renders offline" by looking at a frame of a real board that mounts a component; a byte-size match between frames is a cheap first alarm.
- **Refs:** VERIFICATION F-07.

## R3 · A new verb assumed its own naming on real canvases

**Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** verifier · **Promoted to:** none

- **What happened:** `canvas pages` recognised only `m<NN>` pages and stripped a ref's leading zero, so ai-workforce's hand-made pages would have been duplicated.
- **Why:** it was run on the portal's canvas only.
- **Lesson:** run a new verb against every configured project's real data before handing it back.
- **Refs:** VERIFICATION F-05 (amended 2026-11-28).
