---
doc: retrospective
promotionFrom: 1
---
# 210/05 · A fix round reruns what failed and what the fix touched, skips pre-existing reds, and stops when it stops converging — retrospective

## R1 · The new baseline module crossed two one-home controls the story's run never reached

**Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** product-owner · **Promoted to:** none

**What happened:** `baseline.mjs` added its base tree with its own `git worktree add` beside the execution package's worktree implementation, and declared its own type → record-doc map instead of reading the identity leaf's. Both are pinned by `test/arch` controls (38/ADR-006 and FF-16801). The story's named runs held its own suites and the three 210 controls, all green, and the verify sweep over all of `test/arch` found both reds.

**Why:** The importer scan follows test imports and path mentions, and those two controls read source text through globs, so neither was suggested. The story chose its controls by the invariants it was building, not by the concerns its new module touched.

**Lesson:** Before a new module lands, list what it does that something else already owns (a worktree, a record-doc lookup, a spawn), find the `test/arch` control that pins each one, and put those controls in the story's named run with the reason.

**Refs:** 210 VERIFICATION `@finding-F-07`, `@finding-F-08`; run `20261127T221322033Z-0001`.

## R2 · The base rerun was proved in a scratch project that declared no instructions file

**Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** product-owner · **Promoted to:** none

**What happened:** The base tree reran the failing suites with the working tree's whole test declaration. This repo's declaration names `wiki/TESTING.md`, which the base commit does not hold, so every base run refused and the first real red on this repo labelled every failure `unmeasured`. The story's real-CLI proof ran in a scratch project whose declaration had no instructions key, so it passed.

**Why:** The scratch project was built to stand in for this repo, and it left out the one declaration this milestone itself added. A declaration that exists in the working tree but not at the base is exactly the case a base rerun meets first.

**Lesson:** A scratch-project proof carries the real project's declarations, including the keys the item is adding. When the code reads the base commit, also test a declaration that the base commit does not hold.

**Refs:** 210 VERIFICATION `@finding-F-11`; ADR-006; run `20261127T194457244Z-0000`.
