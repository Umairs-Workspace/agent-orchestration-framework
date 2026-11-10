---
doc: retrospective
promotionFrom: 1
---
# 159 · The operator's auto-memory is an opt-in memory source — retrospective

## R1 · A whole-tree gate that cannot finish is the milestone's blocker, not its background

**Kind:** mistake · **Area:** process (gate) · **Stage:** verify · **Owner:** product-owner · **Raised by:** main-session verification · **Promoted to:** none

**What happened:** The one story was accepted on 2026-10-12, but the milestone took two more days
and eight whole-tree runs to close. Only one run's reds were 159's own (F-1). The rest came from the
runner: a serial ~25-min integration lane killed under load, its retry cut off at the 2-h deadline,
an inherited `GIT_ASKPASS`, and two timing-sensitive cases (F-2..F-4). Each red was "repaired" and
the whole tree rerun, at 1–2 h per run, inside a loop session that was itself killed while waiting.

**Why:** The gate assumed an idle host and a suite that fits its deadline. Neither held, and a
timeout was recorded as a red that verify then treated as code to fix.

**Lesson:** When a gate run ends without a verdict or on a timeout, profile the run before rerunning
it: read the per-unit logs, rerun the failing unit alone, and fix the runner or the timing defect
first. Run the gate from a clean worktree with a stripped launch environment on a quiet host, and
never start other test runs while it is in flight.

**Refs:** VERIFICATION.md, Milestone regression gate and Findings F-1..F-4; REGRESSION.md;
m127/F-30; m156/F-4.
