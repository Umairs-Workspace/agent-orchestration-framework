---
doc: retrospective
promotionFrom: 1
---
# 203/00 · The harness — retrospective

## R1 · Registering a suite moved the runtime audit, which the write set did not declare

**Kind:** near-miss (recurring) · **Area:** process · **Stage:** build · **Owner:** product-owner · **Raised by:** developer (build) · **Recurs:** 160/07/R3 · **Promoted to:** none

**What happened:** The story added one import and one spread to `scripts/test.mjs`. That changed the
script's source digest, so its three `child-process` entries in `scripts/workspace-runtime-audit.json`
had to be re-stamped in the same diff. `files:` did not list the audit file, and `reads:` did not
list `scripts/workspace-boundaries.mjs` or `scripts/test-harness.mjs`, which explain it.

**Why:** The write set was drawn from the files the story meant to change. An audited file's
digest is a second write that follows from editing it, and nothing in refine reaches for it.

**Lesson:** When a story will edit any file named in `scripts/workspace-runtime-audit.json` (for a
new suite, `scripts/test.mjs`), declare the audit file in `files:` at refine.

**Refs:** ../../STATE.md Feedback (for retro), "203/00 · declared set incomplete".

## R2 · Two of the harness's own safety paths failed open

**Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** solo review (round 1) · **Promoted to:** none

**What happened:** The temp-root escape guard sat inside the `try` whose `finally` removes the root,
so a root that escaped the OS temp directory would have been deleted rather than refused. And a
symlink in a captured tree was silently left out of the tree. Review caught both. The guard now runs
before the `try`, as `bundleFixtureRoot` does, and a symlink fails by name.

**Why:** Both were written as the happy path's edge, not as the guard's own failure mode. An
omission and a late refusal both pass every test that does not plant the bad case.

**Lesson:** A guard that protects a destructive cleanup runs before the `try` that performs it. A
capture fails by name on anything it cannot represent. Test each with the planted bad case.

**Refs:** ../../STATE.md Feedback (for retro), "203/00 review (solo, round 1)", items 1 and 2.

## R3 · A re-derive test passed whether or not anything was re-derived

**Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** solo review (round 1) · **Promoted to:** none

**What happened:** E23's two derived scenarios, `s` and `t`, passed the final comparison whether or
not `--update` re-derived them from the updated base, because nothing set them apart before the
update. The fix gives each its own `a.md` first, and a probe that drops the re-derive now reds it.

**Why:** The test's fixture made the expected and the unchanged result identical, so the assertion
could not fail.

**Lesson:** Before trusting a test of a transformation, make its input differ from its expected
output, then probe it by removing the behaviour.

**Refs:** ../../STATE.md Feedback (for retro), "203/00 review (solo, round 1)", item 3.
