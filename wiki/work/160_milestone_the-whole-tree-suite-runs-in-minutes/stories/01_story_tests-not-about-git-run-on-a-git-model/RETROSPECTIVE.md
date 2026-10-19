---
doc: retrospective
promotionFrom: 1
---
# 160/01 · Tests that are not about git run on a git model — retrospective

## R1 · The case mover sliced by name and moved the wrong case

**Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** developer (the run went red) · **Promoted to:** none

**What happened:** The 31 case sites were moved onto the model by a script that sliced each suite's text by case
name. One outline's name held a nested template literal, so the slicer missed it. The previous case's slice
swallowed that outline's `withLaneRepo` call and moved it to `git: "fake"`. Three bound rows went red on the
model. The run caught it, the move was reverted, and every `git: "fake"` was re-checked by line ownership.

**Why:** A text slicer keyed on names assumes every name is a plain string literal. Outline names are not.

**Lesson:** A mechanical edit across many cases checks each edited site by line ownership before it runs the
suite. The suite going red is the backstop, not the check.

**Refs:** ../../STATE.md `## Notes & decisions in flight` (160/01 — the mover's slicer).
