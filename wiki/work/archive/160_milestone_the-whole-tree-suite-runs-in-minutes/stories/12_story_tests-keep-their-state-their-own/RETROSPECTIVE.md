---
doc: retrospective
promotionFrom: 1
---
# 160/12 · Tests keep their state their own — retrospective

## R1 · Isolation covered one home and the tests wrote another

**Kind:** mistake · **Area:** process (test isolation) · **Stage:** build · **Owner:** architect · **Raised by:** verifier (profile) · **Promoted to:** none

**What happened:** `AOF_GLOBAL_HOME` isolates `~/.aof`, and the hook that enforces it made the isolation feel
complete. The claude trust writer resolved `os.homedir()`, so every lane any test drove wrote a temp folder into the
operator's real `~/.claude.json`: 106,899 entries and 12 MB by 2026-10-17. m138 had already recorded the writer's
home choice as F-06 and deferred it.

**Why:** Isolation was defined as "the aof home", not as "every file outside the test's temp tree that the code
can write".

**Lesson:** When a test-isolation rule names one home, census the code's other writers outside the checkout
(`os.homedir()`, `~/.claude*`, the user profile) and give each a test seam. A deferred finding about a writer's home
is a test-isolation finding too.

**Refs:** ../../VERIFICATION.md F-07; m138/F-06.

## R2 · A profile, not an estimate, found the cut

**Kind:** near-miss (finding) · **Area:** process (estimate) · **Stage:** verify · **Owner:** architect · **Raised by:** verifier · **Promoted to:** none

**What happened:** Rounds 1 and 2 were sized from spawn censuses and estimates (round 2 promised 92–108 summed
minutes and delivered 39). A per-child timing profile and one CPU profile of `loop-command-stops` found that half
its in-process time was the claude config rewrite and the stores' re-migration: neither appeared in any estimate.

**Why:** The censuses counted spawns, and both costs were in-process work, invisible to a spawn count.

**Lesson:** Before sizing a speed story, profile the heaviest suite alone: split its wall into child processes by
kind and in-process time, then CPU-profile the in-process part.

**Refs:** ../../STATE.md (round-3 trial); ../../VERIFICATION.md (Story 12).
