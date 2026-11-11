---
doc: retrospective
promotionFrom: 1
---
# 03 · A recalled work record names the planning document its item came from — retrospective

## R1 · A shape bump reached pins that a grep for the field constant cannot find

**Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** architect · **Raised by:** developer · **Promoted to:** none

**What happened:** Moving the index version 3 → 4 and adding `origin` reached ten files outside
`files:`. Seven were found at build: two producers, four shape or version pins and one
integration step with a literal 3. Three more were found in the wide sweep (the 66/01 golden's
field count, `acd-memory-index-location`'s key list and `work-memory-command`'s JSON goldens).

**Why:** The refine found pins by grepping for `MEMORY_RECORD_FIELDS`. The misses special-case a
field by name or pin a literal version or count.

**Lesson:** When bumping a frozen shape, grep for the literal version, the field count and a sibling
field's name, not only the shared constant.

**Refs:** milestone STATE `## Feedback (for retro)` (178/03's declared write set); 178/ADR-002.

## R2 · A kernel allow-list red hid behind known reds in the same file

**Kind:** near-miss (recurring) · **Area:** process · **Stage:** verify · **Owner:** developer · **Raised by:** product-owner · **Recurs:** 161/01/R1 · **Promoted to:** none

**What happened:** 03 added `@aof/work/records` and `@aof/work/identity` to `local-indexing.mjs`,
and `yarn-installation/extracted kernels…` went red. The build read that file's failures as the
three Mac-environmental reds already recorded there. Verify found the fourth only by re-running
the failing files on a clean HEAD worktree and diffing the case names.

**Why:** On this Mac the build compared failures by file, against a residue it already knew, rather
than by case name against a baseline.

**Lesson:** Compare a run's failing cases with a baseline by name. Add a kernel module's allow-list
row in the same change as its new import.

**Refs:** VERIFICATION `## Findings` F-01; m175/F-01, m172/F-172-03.
