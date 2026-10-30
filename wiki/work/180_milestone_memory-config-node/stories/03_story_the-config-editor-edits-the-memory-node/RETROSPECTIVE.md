---
doc: retrospective
promotionFrom: 1
---
# 03 · The config editor has a Memory section that shows the node in the new shape and saves only the new shape — retrospective

## R1 · The story went to review with three UI controls red

**Kind:** mistake (recurring) · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** product-owner (verify) · **Recurs:** 135/03/R1 · **Promoted to:** none

**What happened:** The Memory section went into `apps/ui/src/config/App.tsx` as blocks, which took
the file to 1,318 lines, over its 1,300-line ceiling. It also moved FF-5307's `apps/ui/src`
digest and home-route/00's exact count. The ceiling's own note said "the next one belongs in its
own module under apps/ui/src/config/". The fix at verify moved the section metadata to
`sections.tsx`.

**Why:** The story's lane did not run the tree-metering controls that any edit to `apps/ui/src`
trips, and the budget row was not read before the region was placed.

**Lesson:** A story that edits `apps/ui/src` runs the tree-metering controls in its own lane, and
reads the budget row of the file it adds a region to before placing it.

**Refs:** VERIFICATION F-02; `c8a236e3`; `test/arch/testing/acd-ui-surface-file-budget.test.mjs`.
