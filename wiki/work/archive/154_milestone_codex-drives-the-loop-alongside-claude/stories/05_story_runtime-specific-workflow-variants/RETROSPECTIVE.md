---
doc: retrospective
created: 2026-10-08
updated: 2026-10-08
---
# 154/05 · Retrospective

## R1 · Verify the installed reference graph

**Kind:** mistake · **Area:** architecture · **Stage:** build · **Owner:** architect · **Raised by:** recorded build review

**What happened:** Extracted native procedures required updates to installed-prose, copied-distribution and shared workflow consumers.

**Why:** Entry text alone no longer contained every obligation after procedure extraction.

**Lesson:** Verify the installed entry plus its declared references and actual behavior; reduced entry length is not evidence that the workflow still enforces its gates.

**Refs:** STORY.md broad-gate declaration repair; m154/FF-15405.
