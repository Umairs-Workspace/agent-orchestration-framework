---
doc: retrospective
promotionFrom: 1
---
# 02 · The answer streams into its thread — retrospective

## R1 · A byte-frozen board file owed the controls that freeze it

**Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** developer · **Promoted to:** none

**What happened:** 172/00 changed `packages/server/src/board-ui.mjs`, which FF-5307 pins byte for
byte and FF-13109 reads for its admission-in-block rule. 00's lane ran neither, and both were red
when 02 reached the file; 02 repaired them.

**Why:** Neither control was in 00's `files:`, and `aof test --scope impacted` never finished on the
Mac.

**Lesson:** Before touching a byte-frozen file, grep `test/arch` for its path and add every control
that names it to the story's lane.

**Refs:** STATE `## Feedback (for retro)` (172/02 close); FF-5307; FF-13109.

## R2 · A re-pin comment widened the windows that measure it

**Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** verifier · **Promoted to:** none

**What happened:** The FF-5307 re-pin comment stacked in `acd-loop-state-rides-the-run-record` pushed
four measured board-ui windows over their ceilings: 4,161 against 3,900 for FF-12603 leg 6, and
3,771 against 3,400 for fleet-scope. PLAN.md also restated a declared path (FF-9603).

**Why:** A comment explaining a re-pin reads as free text, but other controls measure the span it
sits in.

**Lesson:** After writing a re-pin comment, run the controls that measure the same window (grep for
the window's marker, as `RE-PINNED by 127/04`), and keep the comment to the measured diff.

**Refs:** VERIFICATION `@finding-F-172-07`, `@finding-F-172-08`, `@finding-F-172-12`; m133/F-133-04.
