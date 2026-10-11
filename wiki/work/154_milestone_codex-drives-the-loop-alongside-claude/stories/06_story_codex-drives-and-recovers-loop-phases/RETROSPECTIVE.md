---
doc: retrospective
created: 2026-10-08
updated: 2026-10-08
---
# 154/06 · Retrospective

## R1 · Exercise tool calls inside the driven session

**Kind:** mistake · **Area:** code · **Stage:** verify · **Owner:** developer · **Raised by:** main-session verification

**What happened:** A real Codex continue called run-start and received duplicate-run.

**Why:** The native launcher did not lend the run environment already used by the driving shell.

**Lesson:** Test the real run-start and run-complete commands under the child environment, including a borrowed run, so a successful protocol fixture cannot hide duplicate bookkeeping.

**Refs:** m154/D-04; 0e92f15b.
