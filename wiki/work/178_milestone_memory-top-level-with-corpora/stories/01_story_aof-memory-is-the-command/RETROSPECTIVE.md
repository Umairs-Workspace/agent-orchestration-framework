---
doc: retrospective
promotionFrom: 1
---
# 01 · aof memory is the command and aof work memory its alias — retrospective

## R1 · A new registered command moved counts the write set did not name

**Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** product-owner · **Raised by:** developer · **Promoted to:** none

**What happened:** The declared `files:` was short by three files. They were
`application-assembly.test.mjs`, which pins the command count twice (133 → 134), the usage line
asserted in `work-memory.feature`, and the help leg of `acd-work-memory-routed`.

**Why:** The refine named the frozen lists that spell command ids. Registering a command also moves
every count of the registry and every usage pin, and those name no id.

**Lesson:** When a story registers a command, grep the registry's counts and usage pins, as well as
its id lists, into `files:` at refine.

**Refs:** milestone STATE `## Feedback (for retro)` (178/01's declared write set); 178/ADR-001.
