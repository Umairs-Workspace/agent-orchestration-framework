---
doc: retrospective
promotionFrom: 1
---
# 160/03 · A child process compiles once and loads only its verb — retrospective

## R1 · The compile cache was chosen before compilation's share was measured

**Kind:** misunderstanding · **Area:** architecture · **Stage:** refine · **Owner:** architect · **Raised by:** main-session verification · **Promoted to:** none

**What happened:** ADR-004 named the compile cache as the start-up lever. Verify measured it engaged and hit
(704 entries, every module "cache was the same"). Even so, the warm application import went 853 → 893 ms and
`aof --version` went 247 → 246 ms, so the `@manual` Then was falsified (F-03). The build's profile had already
shown module resolution, not compilation, as the cost (`internalModuleStat` 0.7 s, `lstat` 0.3 s).

**Why:** The lever was picked from a cost the SPEC named ("importing the application takes ~2.8 s") without
first splitting that cost into compile, resolve and evaluate.

**Lesson:** Before choosing a start-up lever, profile which phase the time is in, and name that phase in the ADR.
A lever that cannot move the measured phase is not chosen.

**Refs:** ../../VERIFICATION.md F-03; ../../ARCHITECTURE.md ADR-004.

## R2 · A scenario asserted a face the CLI never had

**Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** product-owner · **Raised by:** developer (build) · **Promoted to:** none

**What happened:** `01_a-child-aof-loads-a-pinned-closure.feature` says every route answers its help and exits 0.
`--help` is a flag that each command's own parser refuses with its usage line and exit 1, both before this story
and after it. The case asserts the real behaviour; the wording was left.

**Why:** The scenario was written from an assumed CLI convention, not from a run of the face.

**Lesson:** A scenario about an existing face is written after running that face once and pasting what it does.

**Refs:** ../../VERIFICATION.md F-04.
