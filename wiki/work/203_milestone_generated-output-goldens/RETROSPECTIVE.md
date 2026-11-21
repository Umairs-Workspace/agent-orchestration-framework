---
doc: retrospective
promotionFrom: 1
---
# 203 · Every file aof generates is held to a committed baseline — retrospective

The story-level lessons live with each story: 203/00 R1–R3, 203/01 R1–R2, 203/02 R1–R4. Those here
are what closing the milestone taught.

## R1 · The regression gate ran in the working tree while verify kept editing it

**Kind:** mistake · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** product-owner (verify) · **Promoted to:** none

**What happened:** `aof work regression-gate 203` was started in the background on this checkout.
Verify then edited a test and the contract while it ran, including a red probe that was live for
four minutes. The gate runs the suite in place, so its row would have named a commit it did not
test. The run was stopped after 44 minutes, with no row written, and moved to a clean runner.

**Why:** "Runs on a clean checkout" was read as "copies the checkout", and the work that followed
the start was not held back for it.

**Lesson:** Once a gate is started on a tree, that tree is frozen until the gate ends. Do further
work in another worktree, or after the gate. Better, push `gate/<ref>` and leave the local tree free.

**Refs:** m119/F-41 and m55/F-55-M-7 (a concurrent session, the same contamination); ../VERIFICATION.md Accept decision.

## R2 · Verify routed checks to a machine instead of removing the machine

**Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** operator (verify) · **Promoted to:** none

**What happened:** With 203/02 task 03 written as a run on the Windows control node, verify asked
the operator to pull the branch there and run both the task and the regression gate. Both had
machine-independent answers. The task's property can be produced on any OS (203/02 R2), and the
repo already runs the gate on a clean runner when `gate/<ref>` is pushed (`.github/workflows/gate.yml`).

**Why:** Verify treated the contract's named machine as a fact to arrange, and did not check the
earlier answer to "which machine runs the gate" (m190/R2, 192/R5) before asking.

**Lesson:** At verify, a check that names a machine is read first as a question about the contract.
A gate this machine cannot run green goes to `gate/<ref>`, without asking the operator.

**Refs:** 192/R5; m190/R2; stories/02_story_update-changes-nothing-it-should-not/RETROSPECTIVE.md R2.
