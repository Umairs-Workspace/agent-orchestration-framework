---
doc: retrospective
promotionFrom: 1
---
# 160/04 · The gate launches clean and dies with its session — retrospective

## R1 · The run was minted, and the gotchas recalled, after the build began

**Kind:** near-miss (recurring) · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** developer · **Recurs:** 157/R2 · **Promoted to:** none

**What happened:** The build began before `aof work run-start 160/04` and before its near-miss recall. The run
carries no session id, so `aof work observe` cannot price the build. When the recall ran at the build's close,
m59/R11 (assertions that report machine load) turned E5's fixed 80 ms wait into a counted one, after the fact.

**Why:** A sibling's sweep was running, and the build started on the edit rather than on the ceremony.

**Lesson:** Mint the run and run the recall before the first edit, even when a sibling's sweep is running.

**Refs:** ../../STATE.md `## Feedback (for retro)` (160/04 — run minted late).
