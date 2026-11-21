---
doc: retrospective
promotionFrom: 1
---
# 203/02 · Update changes nothing it should not — retrospective

## R1 · A fixture found generated prose by its words

**Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** solo review (round 1) · **Promoted to:** none

**What happened:** The upgrade lane's older-text mutation found its line in the rendered refine
command by matching "Deepen a work item:". A refine prose edit, the very change the golden lanes
exist to show as a diff, would have broken the upgrade lane with an error instead. Review caught
it, and the mutation now takes the last non-empty line.

**Why:** The fixture was written against today's render, and nobody asked which text a future change
would edit.

**Lesson:** A fixture that mutates generated content finds its target by structure (position, key,
heading level), never by the wording a change under test may edit.

**Refs:** ../../STATE.md Feedback (for retro), "203/02 review (solo, round 1)".

## R2 · A cross-platform property was written as a run on one machine

**Kind:** misunderstanding · **Area:** contract · **Stage:** refine · **Owner:** product-owner · **Raised by:** operator (verify) · **Promoted to:** none

**What happened:** Task 03 required both lanes to pass on the Windows control node, a machine this
laptop cannot reach, so the story could not be accepted. What Windows changes is the bytes a capture
holds: CRLF line endings, `\` separators, JSON-escaped paths, and a temp root in another case. A
test produces all of these on purpose on any OS. Verify replaced the task with two `@executable`
cases, and the story was accepted the same day (VERIFICATION, 203/02 task 03).

**Why:** Refine took the SPEC's "on macOS and Windows" as a list of machines to run on, not as a
property of the bytes to prove.

**Lesson:** Prove a property that depends on the platform by generating the other platform's input
in an `@executable` test. A run on a named machine is left for what no test can produce, and its
need is stated in the contract.

**Refs:** ../../VERIFICATION.md 203/02 task 03; tasks/03_the-suite-holds-on-any-os.feature.

## R3 · The rebuild reached two harness modules outside the write set

**Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** product-owner · **Raised by:** developer (build) · **Promoted to:** none

**What happened:** The rebuild needed `test/support/golden/harness.mjs` (starting files as a
function of the run's own paths) and `normalise.mjs` (`fillPlaceholders`). Neither was in `files:`.
The PLAN's "the harness needs no new step kind" was right about steps, but not about starting files.

**Why:** The plan checked the harness's step interface, not its inputs, and the inverse of a
normaliser rule had to live beside the rules (FF-20301).

**Lesson:** When a story adds the inverse of a closed module's operation, declare that module. When
it changes what a harness is given, declare the harness, even if no new step kind is added.

**Refs:** ../../STATE.md Feedback (for retro), "203/02 · declared set incomplete".

## R4 · The run was minted, and the near-miss recall taken, after the build

**Kind:** mistake (recurring) · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** developer (build) · **Recurs:** 167/02/R2 · **Promoted to:** none

**What happened:** 203/02's run was minted, and its near-miss recall run, once the build was done.
The recall's lessons were judged against a build already made. None would have changed it.

**Why:** Three stories were built back to back in one session, and the per-story start steps were
folded into the end.

**Lesson:** In a multi-story session, mint each story's run and take its recall before its first
edit.

**Refs:** ../../STATE.md "203/02 build", Process lapse.
