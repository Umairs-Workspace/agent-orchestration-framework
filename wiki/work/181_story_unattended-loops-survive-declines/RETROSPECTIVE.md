---
doc: retrospective
promotionFrom: 1
---
# 181 · Retrospective

## R1 — Verify both rendered runtime procedures when changing lifecycle instructions

**Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** rendered-output regression · **Promoted to:** none

**What happened.** The first handback edit updated the Claude verify source while the separately authored Codex procedure still lacked it. The strengthened regression failed on the rendered Codex procedure before that variant was corrected.

**Why.** The common command asset does not supply Codex's procedure when the bundle declares a runtime variant.

**Lesson.** Inspect the bundle descriptor and verify both rendered procedures for lifecycle changes. The story's regression now exercises both outputs; a broader prevention rule is not claimed here.

**Refs:** VERIFICATION.md, Red regressions before fixes; packages/core/assets/bundle.json; test/loop/work-loop-phase-map.test.mjs.

The recurrence query returned no qualifying prior lesson (score 0.172516 below threshold 0.23), so no Recurs field is asserted. Observability found no attributable native runs, and delivery-history recall returned an empty list; this lesson uses the directly observed build/red-test evidence from this work, not an invented session history.
