---
doc: retrospective
promotionFrom: 1
---
# 165 · Planning runs in Cowork — retrospective

What building and accepting the whole milestone taught. Each story's own lessons are in its
folder (`stories/0N_*/RETROSPECTIVE.md`).

## R1 · The milestone was built in a sibling worktree, and the operator's checkout read a stale copy

**Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** product-owner · **Raised by:** operator · **Promoted to:** none

**What happened:** `aof:continue 165` built and reviewed all four stories in `aof-165`, on a
branch off main, because the operator's checkout was on 164's branch. The operator's checkout kept
an untracked, refine-time copy of the milestone folder. A later `aof:continue 165` from that
checkout answered 00 and 01 as `ready` and `not-started`, while the built copy said `done`. The
operator asked for everything on one branch, and the six commits were cherry-picked onto it.

**Why:** The work stream is read from the checkout's own files. Two copies of one milestone on
one machine both answer, and the walk cannot tell which one the operator means.

**Lesson:** Build a milestone in the checkout the operator works in, or move the folder (not copy
it) into the sibling tree before building. A milestone folder exists in exactly one tree.

**Refs:** VERIFICATION.md (the branch move); the operator's request at the start of verify.

## R2 · The Review gate handed back without a whole-tree run, and three census controls went red at verify

**Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** verifier (regression gate) · **Promoted to:** none

**What happened:** Each story was gated on its own suites and an importer sweep. The first
whole-tree run, at verify, turned three arch controls red on 165's own code: FF-16004 (module
ceiling), FF-6601 (a printed `Then …` line) and FF-11901 (a control's own import extractor).
None of them is selected by a story lane. The same cause as m164/F-01 and m135/F-135-05.

**Why:** Pinned census controls guard the whole tree. A story's `files:` never names them, so no
story-scoped selection reaches them. Until the milestone gate runs, nothing does.

**Lesson:** A continue that hands back at the Review gate runs the `test/arch/` census controls
(module ceilings, recogniser homes, extractor homes, the directory budget, the runtime audit)
once, over the whole tree. It is cheap next to a verify that has to repair them.

**Refs:** VERIFICATION.md F-01; commit `78f08231`.

## R3 · A commit landed after the previous milestone's green gate, and this milestone's gate inherited its reds

**Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** verifier · **Raised by:** verifier · **Promoted to:** none

**What happened:** `c9d0a0ca` (codex discovery) was committed on 164's branch after 164's green
gate and before 164 was accepted, and was never gated. 165's first gate on that branch was red on
its unaudited spawns, an allowlist and a directory budget, and the repair was 165's to make.

**Why:** The accept door reads the latest recorded gate row. It does not ask whether commits
landed after it.

**Lesson:** Before accepting on a gate row, compare the row's commit with HEAD. Anything after it
that is not wiki records is re-gated first.

**Refs:** VERIFICATION.md F-02; 164's REGRESSION.md row 5 (`7ce469dc`).

## R4 · A live daemon's load made the first gate unreadable

**Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** verifier · **Raised by:** verifier · **Promoted to:** none

**What happened:** The control daemon (`mesh serve`) held more than one core throughout the first
gate, which took 69.7 minutes against 17.4 for 164's, and seven timing units went red under load.
Each one passed alone. After the desktop restart, the next three gates took about 24 minutes.

**Why:** The gate shares the machine with the operator's daemons, and nothing measured them. The
daemon's cost is the subject of the backlog milestone `daemon-stays-within-a-resource-budget`.

**Lesson:** Before a whole-tree gate, sample the daemons' CPU (`Get-Process aof`). A gate run over
a busy machine is re-run, never repaired.

**Refs:** VERIFICATION.md F-03; `backlog/milestone_daemon-stays-within-a-resource-budget`.
