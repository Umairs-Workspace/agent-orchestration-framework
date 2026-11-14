---
doc: retrospective
---
# 192 · Commands are built at render from a core body and the fragments of the practices a project has turned on — retrospective

The per-story lessons live in each story's own `RETROSPECTIVE.md`. This document carries what
running the milestone taught: what recurred across stories, and what the loop's close left undone.

## R1 · Three of four stories missed a counting control that refine could have named

**Kind:** mistake · **Area:** process (planning) · **Stage:** refine · **Owner:** architect · **Raised by:** product-owner · **Promoted to:** none

**What happened:** 192/00, 192/02 and 192/03 each turned red, outside their `files:`, on a control
that counts things rather than names a module: the source-directory budget rows, FF-16004's
`aof work find` module ceiling (753 → 756 across the three), and, for 192/03's doctor lane, three
lane-order pins. Each build fixed its own and recorded a contract gap (m192/00/R1, m192/03/R1).

**Why:** Refine derived every write set by hand, from `aof graph impact` and a phrase search of the
test tree. A counting control imports no subject module and holds none of the moved phrases, so
neither source can find it. The story contract derivation module has no CLI door, so the convention
leg it adds was not available either.

**Lesson:** When a refine adds a module, a suite or a doctor lane, it asks the counting controls by
kind, not by search: the source-directory budget for each directory touched, FF-16004 for a module
the CLI entry loads, and the lane-order pins for a new doctor lane.

**Refs:** m192/00/R1, m192/03/R1; STATE `## Feedback (for retro)`.

## R2 · Lane lock writes were dropped twice, and both reds landed in other stories' accepts

**Kind:** blocker · **Area:** process (delivery) · **Stage:** verify · **Owner:** product-owner · **Raised by:** product-owner · **Promoted to:** none

**What happened:** 192/02's lane re-rendered two Codex files and its lock re-stamp never reached the
branch (F-01). 192/03's lane recorded the practices in the lock, and that never reached it either
(F-02). Each turned a case red in a story's suite, and both blocked that story's accept until a
real `aof work update` re-stamped the lock on the branch. Both are `m127/F-13`, the loop's lane
reconcile resetting `.aof/` before it commits. The two dispatch worktrees still held the dropped
writes after the loop ended.

**Why:** A story that changes what the bundle renders must change the lock in the same commit, and
the loop's reconcile throws that change away.

**Lesson:** Until `m127/F-13` is fixed, a story whose diff changes a rendered file or the lock's
`work` section ends its build with `aof work update --dry-run` at the merged HEAD. A plan that is
not all `skip` means the lock is owed, and it is re-stamped by a real update, never by hand.

**Refs:** VERIFICATION F-01, F-02; m192/02/R1; `m127/F-13`.

## R3 · The loop accepted every story and stopped short of the milestone

**Kind:** blocker · **Area:** process (delivery) · **Stage:** verify · **Owner:** product-owner · **Raised by:** operator · **Promoted to:** none

**What happened:** The loop ran three verify cycles and one refine cycle, accepted 192/00 to 192/03,
and ended without running the regression gate or the milestone accept. It also left two dispatch
worktrees, F-04 deferred "to the backlog" with no backlog item, and two stories without their
`RETROSPECTIVE.md`. The operator read the milestone as accepted, and the close was finished by hand
(STATE, 2026-11-14).

**Why:** On this MacBook the live control daemon holds `:4182`, so the gate cannot run here, and
the loop's verify session had no route to `gate.yml`. The deferral and the missing retrospectives
were stated in prose and checked by nothing until `aof work doctor` was read.

**Lesson:** A loop that ends with stories done and its milestone open says so, and names what is
owed. A finding deferred "to the backlog" names the backlog item it was filed as, in the same edit.

**Refs:** VERIFICATION F-04; STATE 2026-11-14.

## R4 · Reds named "pre-existing" in every story's notes were the milestone gate's reds

**Kind:** mistake · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** product-owner · **Promoted to:** none

**What happened:** The first milestone gate was red on six cases (F-05). Four of them (FF-7106,
FF-12602, FF-5301 and `m42-item-3`) had been listed in 192/00's, 192/01's, 192/02's and 192/03's
notes as "not caused by this diff" and left alone. Each fix was a declaration, a pinned count with
its reason, or one handled catch: minutes of work, done in one commit at the close.

**Why:** A story verify judges its own diff, so it is right to leave a sibling's red alone. But
nothing carried the list forward to an owner, and the milestone door reads one whole-tree row.

**Lesson:** m190/R1, recurring: a red a story leaves as "pre-existing" is listed once, in the
milestone's VERIFICATION as an open finding with an owner, and cleared before the gate is asked for.

**Refs:** VERIFICATION F-05; m190/R1.

## R5 · The gate's machine was asked of the operator again

**Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** product-owner · **Promoted to:** none

**What happened:** At the close, the session offered the operator a choice between stopping the
desktop app to run the gate here and running it themselves. The repo had already answered that:
push `gate/192`, and `gate.yml` runs `aof work regression-gate 192` unchanged on a clean runner.
That is how the gate was run.

**Why:** m190/R2 records the same near-miss. The lesson sits in a retrospective, and nothing the
verify command or the loop reads points at `gate.yml` on a machine that cannot host the run.

**Lesson:** m190/R2, recurring: before asking how to run a gate this machine cannot host, push
`gate/<ref>`. The second occurrence makes it a candidate for the verify command's own prose.

**Refs:** m190/R2; 160/ADR-014 §6.
