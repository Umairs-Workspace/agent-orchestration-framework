---
doc: retrospective
promotionFrom: 1
---
# 160/11 · A test that needs a suite run starts the shard entry — retrospective

## R1 · The refine census missed a spawn, and the control found it

**Kind:** near-miss (finding) · **Area:** contract · **Stage:** build · **Owner:** architect · **Raised by:** developer · **Promoted to:** none

**What happened:** Refine named three suites that spawn `scripts/test.mjs --only`. FF-16013's sweep found a
fourth, `discord-bot`, which now starts the shard entry (10 s → 3 s alone).

**Why:** The census came from the spawn profile of the heaviest suites; `discord-bot` was too light to appear.

**Lesson:** A census taken from a profile lists the costly instances, not all of them. Write the sweep control
first and let it produce the list.

**Refs:** ../../STATE.md `## Feedback (for retro)` (160/11 — the refine census).

## R2 · The suite the story was sized on did not get faster

**Kind:** mistake · **Area:** process (estimate) · **Stage:** verify · **Owner:** architect · **Raised by:** developer · **Promoted to:** none

**What happened:** `site-build` stayed at 108 s. Copying the runnable tree is 82 s of it. The refine's 115 s for
its spawns was measured under four-at-a-time load, where one registry import cost about 19 s.

**Why:** The estimate was taken under contention and attributed to the spawn, without timing the cases one by
one.

**Lesson:** Time a suite case by case, alone, before sizing a story on it.

**Refs:** ../../VERIFICATION.md (Story 11); ../OUTCOME.md `## Gaps`.
