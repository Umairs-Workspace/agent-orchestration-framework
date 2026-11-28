---
doc: retrospective
promotionFrom: 1
---
# 210/02 · A test record says why it ran, where it ran, and which suite each failure came from — retrospective

## R1 · The live-store rung minted this story's runs for another session

**Kind:** near-miss (recurring) · **Area:** process · **Stage:** build · **Owner:** product-owner · **Raised by:** product-owner · **Recurs:** 149/R1 · **Promoted to:** none

**What happened:** `aof work run-start` resolved `sessionSource: live-store` to Claude session 916fbe69, which was building 198 in the same checkout. That happened for 210/02's first run, for its attempt 2 and for 210/03's first run, none of which that session built. Observe's cost join for those runs is wrong.

**Why:** With two live sessions in one checkout, the live-store rung picks one, and nothing tells it which session is calling.

**Lesson:** When another session is live in the same checkout, give `run-start` the calling session explicitly, and check the minted run's `sessionId` before building on it.

**Refs:** VERIFICATION `## Findings` F-06; run `20261127T181807585Z-0000`, run `20261127T185746204Z-0001`.
