---
doc: retrospective
promotionFrom: 1
---
# 160/08 · Tests spend git only on what they assert — retrospective

## R1 · The run was minted, and the gotchas recalled, after the build began — again

**Kind:** mistake (recurring) · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** developer · **Recurs:** 160/04/R1 · **Promoted to:** none

**What happened:** The model's merge and the fixture template were written before `aof work run-start 160/08` and
its near-miss recall, while 160/07's measurement held the machine. Neither recalled lesson changed the build.

**Why:** Waiting on a sibling's measurement made starting the edit feel like using idle time; the run start was
deferred to "when the machine is free".

**Lesson:** Mint the run and take the recall before the first edit, whatever else is running. 160/04/R1 already
said this; a second occurrence in one milestone means the step needs to be the build's first command, not a
reminder.

**Refs:** ../../STATE.md `## Feedback (for retro)` (160/08 — run minted late).

## R2 · An outline row named a fixture that builds no repository

**Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** qa · **Raised by:** developer · **Promoted to:** none

**What happened:** "Each real-git fixture builds from the template" lists `mesh-assign-fixture.mjs`, which builds
no repository. The `init`/`config` that `gate-propagation-refusals-leave-branch` and `blocked-run-parking` pay for
is in `mesh-worker-exec-fixture.mjs`, which was undeclared and changed.

**Why:** The fixture was picked by name from the census suites' imports, not by finding where `git init` runs.

**Lesson:** Locate a cost by grepping for the call that pays it, then name the file that contains it.

**Refs:** ../../STATE.md `## Feedback (for retro)` (160/08 — the declared write set).
