---
doc: retrospective
created: 2026-10-08
updated: 2026-10-08
---
# 154/08 · Retrospective

## R1 · Attribute observations only from captured identity

**Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** recorded build review

**What happened:** The broader gate caught a native report using an item inferred from a folder when captured attribution was absent.

**Why:** A convenient filesystem fallback supplied identity that the native event had not established.

**Lesson:** Keep missing attribution null and test absent and disagreeing captures; do not turn a path convention into observed identity.

**Refs:** STORY.md FF-9601 gate finding; m154/FF-15406.
