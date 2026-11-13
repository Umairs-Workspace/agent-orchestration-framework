---
doc: retrospective
---
# 192/02 · The gated prose leaves core — retrospective

## R1 · A stale lock is proven stale by re-rendering from the lock's own baseline

**Kind:** blocker · **Area:** process (delivery) · **Stage:** verify · **Owner:** product-owner · **Raised by:** product-owner · **Promoted to:** none

**What happened:** The lane commit changed the two Codex refine files but not the lock (`F-01`, the `m127/F-13` reconcile gap). `aof work update --force` refuses a modified Codex output (`codex-output-conflict`), so it could not re-stamp the lock.

**Why:** The lock's hashes describe the files before the story. Nothing on the branch shows that the files on disk are what the bundle renders now.

**Lesson:** In a scratch worktree, restore the refused files to the commit the lock describes, then run `aof work update`. When the re-render is byte-identical to HEAD, the only diff is the lock and the journal, and that diff is the re-stamp, proven. Copy those two files over. Never hand-edit hashes, and never force over the outputs.

## R2 · Refine still writes PLAN.md bullets that open with a declared path

**Kind:** mistake · **Area:** process (planning) · **Stage:** refine · **Owner:** product-owner · **Raised by:** product-owner · **Promoted to:** none

**What happened:** Three of 193's PLAN.md "Known traps" bullets opened with a path their story declares, which turned FF-9603 (2) red (`F-03`). This is the fifth occurrence of the class (`m124/F-04`, `m130/F-22`, `m144/F-02`, `m172/F-172-07`).

**Why:** The ban runs over the whole stream, but only when the suite runs. Refine never runs it on the plans it has just written, so the red lands in whichever later item runs the suite first.

**Lesson:** A trap bullet names its file by role ("the discovery-beat example suite"). The declared path is already in `files:`/`reads:`. Before closing a refine that wrote a PLAN.md, run the ban's helper (`restatementViolations`) over the new plans.
