---
doc: retrospective
promotionFrom: 1
---
# 160 · The whole-tree suite signs off in minutes — retrospective

## R1 · Three rounds of speed work were judged on a machine that could not judge them

**Kind:** misunderstanding · **Area:** process (estimate) · **Stage:** verify · **Owner:** product-owner · **Raised by:** operator · **Promoted to:** none

**What happened:** Rounds 1 and 2 cut the tree's summed time from 40,743 s to about 15,000 s, and still every gate on
the control node read `not-finished`. The worker sweep then showed the same code taking 15.3 and 23.6 minutes at 8
workers on two days. Round 3's lever was not a cut at all: the operator moved the budget to the pull request runner,
where the same tree takes 1.8 minutes (m160/13/R1 has the story-level account).

**Why:** The objective named the machine where the gate happened to run, and nobody measured that machine's
run-to-run variance before setting a budget smaller than it.

**Lesson:** Before a milestone sets a time budget, run the suite three times on the target environment and compare
the spread with the budget. A spread of the budget's order means the environment is wrong, not the code.

**Refs:** VERIFICATION.md (the worker sweep; round 3); SPEC.md (re-aimed 2026-10-17).

## R2 · A process that outlives its kill held the pipe, three times

**Kind:** near-miss (recurring) · **Area:** code · **Stage:** verify · **Owner:** developer · **Raised by:** verifier · **Recurs:** 160/05/R1 · **Promoted to:** none

**What happened:** The pool waited for a killed unit's `close` while a descendant held its output (F-01). The packed
unit's spawn threw synchronously inside the pool (F-06). A launcher test's `stop()` waited for `close` while a vite
grandchild held the pipe, and hung its shard for 20 minutes (F-08). Each was a wait on a child with no bound of its
own.

**Why:** `close` waits for every holder of a child's output, including processes the child started; code that kills
a child and then waits for `close` inherits the lifetime of the child's descendants.

**Lesson:** After killing a child, settle on `exit`, close your own ends, and escalate to SIGKILL on a timer. Never
wait unbounded on `close`, and wrap every spawn so a spawn that throws becomes a result.

**Refs:** VERIFICATION.md F-01, F-06, F-08.

## R3 · Another session committed a milestone onto this branch mid-verify

**Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** verifier · **Promoted to:** none

**What happened:** While 160 was being verified, a second session committed milestone 162 onto `milestone/160-161`
and kept uncommitted work in the same checkout. The PR then carried three milestones, its first green needed fixes
in 162's code, and every commit from this session had to use `git commit --only` to avoid taking that session's
staged files.

**Why:** Two sessions shared one checkout and one branch, and nothing stopped a session committing to a branch
named for another milestone.

**Lesson:** Read the branch's log before every push and every gate (`git log <last-known>..HEAD`). One milestone per
branch: a session starting new work on a branch named for another milestone branches off `main` first.

**Refs:** PR #12; VERIFICATION.md F-10.
