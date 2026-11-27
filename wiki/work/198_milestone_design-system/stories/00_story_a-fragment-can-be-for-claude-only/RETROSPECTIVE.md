---
doc: retrospective
---
# 198/00 · A practice's fragment can name the runtimes it is for — Retrospective

## R1 · A body rewrite after load missed the per-runtime bodies the story introduced

**Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** reviewer · **Promoted to:** none

- **What happened:** the story added `commonBodies`, one composed body per runtime, but
  `applyDelegationModelToResources` (`packages/core/src/work/delegation.mjs`) still rewrote `body`
  alone. With a scoped fragment on and a non-default delegation model, Claude's and OpenCode's
  renders kept the default literal. The review caught it, and a case in `bundle-compose.suite.mjs`
  that is red without the fix now holds it.
- **Why:** the build changed where a resource's text lives and searched only the composer's own
  callers. The passes that rewrite a resource after load were never listed.
- **Lesson:** when a story adds a second home for a resource's text, grep every writer of the old
  field (`\.body\s*=`) before calling the build done, and put each one in `reads:`.
- **Refs:** milestone STATE `## Feedback (for retro)`, 198/00 review close.

## R2 · The declared read and write sets were short again

**Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** product-owner · **Raised by:** developer · **Recurs:** 169/01/R1 · **Promoted to:** none

- **What happened:** the build also read `packages/core/src/model.mjs`, the delegation pass, the
  work-doctor engine and the source-directory budget, and wrote `delegation.mjs`. None of them was declared.
- **Why:** refine took the sets from the ADR's subject (the composer), not from what consumes its output.
- **Lesson:** take `reads:` from the composer's consumers as well as its callers, meaning the passes
  that run after load and the controls that census the bundle.
- **Refs:** milestone STATE `## Feedback (for retro)`, 198/00 build.
