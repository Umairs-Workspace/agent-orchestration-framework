---
doc: retrospective
created: 2026-10-08
updated: 2026-10-08
---
# 154/02 · Retrospective

## R1 · Filter protocol traffic before bounded admission

**Kind:** mistake · **Area:** code · **Stage:** verify · **Owner:** developer · **Raised by:** main-session verification

**What happened:** The live continue phase hit protocol_queue_limit while processing ordinary validation output.

**Why:** Notifications that the adapter never consumed still occupied its durable-message queue.

**Lesson:** Discard only known ignorable traffic before queue admission, and retain terminal events, identities, usage and permission requests under the existing bound.

**Refs:** m154/D-06; 3dec8d1e.
