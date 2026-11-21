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
test. The run was stopped after 44 minutes, with no row written. It was re-run on the committed
tree with nothing else touching it, and finished in 70 minutes.

**Why:** "Runs on a clean checkout" was read as "copies the checkout", and the work that followed
the start was not held back for it.

**Lesson:** Commit, then start the gate. Once it is started, the tree is frozen until it ends: do
further work in another worktree, or after the gate.

**Refs:** m119/F-41 and m55/F-55-M-7 (a concurrent session, the same contamination); ../VERIFICATION.md Accept decision.

## R2 · Verify routed checks to a machine instead of removing the machine

**Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** operator (verify) · **Promoted to:** none

**What happened:** With 203/02 task 03 written as a run on the Windows control node, verify asked
the operator to pull the branch there and run both the task and the regression gate. Then, with a
red gate expected on this MacBook, it pushed the gate to a CI runner instead of running it here.
Both had machine-independent answers. The task's property can be produced on any OS (203/02 R2),
and the gate ran here in 70 minutes. Its reds were then sorted by cause, which is the real work.

**Why:** Verify treated the contract's named machine as a fact to arrange, and did not check the
earlier answer to "which machine runs the gate" (m190/R2, 192/R5) before asking.

**Lesson:** At verify, a check that names a machine is read first as a question about the contract.
The gate runs where verify runs. An expected red is no reason to move it: run it, then sort each
red into the item's own and the stream's.

**Refs:** 192/R5; m190/R2; stories/02_story_update-changes-nothing-it-should-not/RETROSPECTIVE.md R2.

## R3 · Two stream-wide controls were red on 203's own files, and only the gate saw them

**Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** product-owner (verify, regression gate) · **Promoted to:** none

**What happened:** All three of 203's `PLAN.md` files restated declared paths (FF-9603), and one of its
new controls wrote its own import-specifier regex (FF-11901). Each story ran its own suites green,
and review passed. The whole-tree gate, 70 minutes and three commits later, was the first run of
either control over these files.

**Why:** Both controls scan the whole stream, not one story, so a story's own run never selects
them. The plan ban has now caught a story's plan at least six times (VERIFICATION F-04), and
FF-11901 has caught a new control twice (F-05 and m201/F-02).

**Lesson:** A story that writes a `PLAN.md` runs the plan ban by file before review. A story that
adds an arch control runs FF-11901's suite. Each takes a second. The lasting fix is for story
suite selection to pick up a stream-wide control whenever a changed file is the kind it scans.

**Refs:** ../VERIFICATION.md F-04, F-05; 146/R2; 152/R3; 127/R6.
