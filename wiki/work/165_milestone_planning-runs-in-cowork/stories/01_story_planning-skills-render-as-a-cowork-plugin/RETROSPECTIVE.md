---
doc: retrospective
promotionFrom: 1
---
# 165/01 · The planning skills render as a Cowork plugin — retrospective

## R1 · A new arch control spelled its own import extractor, and missed twice

**Kind:** mistake · **Area:** code · **Stage:** verify · **Owner:** architect · **Raised by:** reviewer (build), verifier (regression gate) · **Promoted to:** control:FF-11901

**What happened:** FF-16503 (`acd-cowork-package-deterministic`) read the writer's imports with a
regex of its own. The review found that it missed a bare side-effect `import "x"`, and the regex
was patched. Then the whole-tree gate at `36517813` turned FF-11901 red: no control under
`test/arch/` may spell its own import-specifier extractor. The control now calls `importSpecifiers`
and `computedDynamicImports` from `test/support/module-family.mjs`, and its red probe (a bare
`import "fs"` in the writer) fails it.

**Why:** The control was written from the assertion it needed, without asking whether the repo
already had a home for "what does this file import". The story lane never ran FF-11901, which is
the control that knows the answer.

**Lesson:** A control that reads imports takes them from `module-family.mjs`. A story that adds
an arch control runs the `test/arch/` index's census controls (FF-11901 among them) before
review, not only its own file.

**Refs:** ../../VERIFICATION.md F-01; commit `78f08231`.

## R2 · A test pinned aof's literal version

**Kind:** near-miss · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** reviewer · **Promoted to:** none

**What happened:** The E3 assertion compared the plugin manifest's version with a literal
`0.1.0`. Any release bump would have turned it red for a reason unrelated to the plugin. Fixed at
the review close: the version is passed in, and the default is checked against
`packages/core/package.json`.

**Why:** The fixture was written from the value on screen rather than from the value's source.

**Lesson:** An assertion about a value another file owns reads it from that file.

**Refs:** ../../STATE.md Feedback (165/01).
