---
doc: retrospective
created: 2026-10-08
updated: 2026-10-08
---
# 154/09 · Retrospective

## R1 · Admit the exact leaf port

**Kind:** mistake · **Area:** architecture · **Stage:** build · **Owner:** architect · **Raised by:** recorded build review

**What happened:** The full gate rejected the new pure extractor catalogue because its contracts/error import lacked an explicit admission.

**Why:** The implementation reused an existing contract port, but the architecture declaration did not describe that import.

**Lesson:** Review the exact leaf dependency and amend only its named admission; retain prohibitions on providers, core and sibling internals.

**Refs:** STORY.md required round 1.
