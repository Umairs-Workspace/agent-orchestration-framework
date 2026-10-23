---
doc: retrospective
promotionFrom: 1
---
# 168/01 · One verb builds a prototype — retrospective

## R1 · The recall for a new `work:*` verb was taken after the build, so its census set was missed again

**Kind:** mistake · **Area:** process · **Stage:** refine · **Owner:** product-owner · **Raised by:** developer (build) · **Promoted to:** none · **Recurs:** 41/R3

**What happened:** The declared `files:` missed the registry-derived guards that a new `work:*`
verb trips: `WORK_COMMAND_IDS` in `commands.mjs`, the package export, the bundle command counts,
the CLI bijection probe, route coverage and the `runInsertTopLevel` face census. Two more bundle
censuses (`acd-learning-edge-reaches-every-cut`, `autonomous-shell-out-prompt`) were caught only
when story 02 ran them. m41/R3, m19/R1 and m150/R1 already name this set, but the recall that
found them was taken after the build.

**Why:** The contract settled `files:` without a recall, so the lessons arrived too late to shape
it.

**Lesson:** For a story that adds a verb or a bundle command, run the recall before `files:` is
settled, and copy the census list from 151's delivered `00_the-bundle-ships-aof-add-diagram.feature`
rather than writing it from memory.

**Refs:** ../../STATE.md Feedback (continue 01, continue 02); ../../VERIFICATION.md F-01.
