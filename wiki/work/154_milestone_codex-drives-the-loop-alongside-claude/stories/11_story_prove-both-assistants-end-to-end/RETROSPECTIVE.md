---
doc: retrospective
created: 2026-10-08
updated: 2026-10-08
---
# 154/11 · Retrospective

## R1 · Audit behavior after collecting native samples

**Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** qa · **Raised by:** main-session verification

**What happened:** A sample harness could establish the final answer, unchanged oracle and sentinel, same-thread recovery and terminal result, but it did not establish review independence or the ordering of every gate.

**Why:** Output assertions measure only the behaviors they observe; a successful model result is not the workflow's acceptance verdict.

**Lesson:** Retain attributable native commands and role events, then audit gates, write scope and review independence before scoring a sample. Resolve the exact contract before reporting a miss: the continue ladder is validate then doctor, distinct from the impacted test gate.

**Refs:** ../../PROMPT-AUDIT.md; tasks/02_prompt-behavior-evaluation.feature; native benchmark command timelines.
