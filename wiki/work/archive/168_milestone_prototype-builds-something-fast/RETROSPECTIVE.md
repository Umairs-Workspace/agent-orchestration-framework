---
doc: retrospective
promotionFrom: 1
---
# 168 · A prototype builds something fast — retrospective

## R1 · A new item type and a new verb turned a dozen pinned censuses red, and only the whole tree found them

**Kind:** mistake · **Area:** process · **Stage:** refine · **Owner:** architect · **Raised by:** verifier · **Promoted to:** none · **Recurs:** 41/R3

**What happened:** Each story's lane was green, but the first whole-tree gate (`d63b05e6`) was
red on controls that pin what a sixth type and a new `work:*` verb change. These were FF-5201's
closed type vocabulary, the work allow-list in `yarn-installation`, FF-16004's module ceiling,
131/08's command-composition ceiling, the command inventory and known ids, the prompt audit,
`ratchet.mjs`'s runtime-audit digest, a UI file budget and FF-5307's `ui/` hash (VERIFICATION
F-03). Every story had also left out of its `files:` paths its build had to write (F-01, and each
story's R1).

**Why:** Refine broke the work into stories by subject (type, verb, diagrams, board). No story
owned the cross-cutting censuses that a new item type touches, so no story's lane ran them.

**Lesson:** When a milestone adds an item type or a top-level verb, refine names the census set as
a declared part of the first story that changes it: the type vocabulary, the command registry and
inventory, the allow-lists, the module and composition ceilings, the audit digests and the prompt
audit. That story's lane then runs those censuses. m164/F-01, m165/F-01 and m161/F-01 show the
same kind of failure.

**Refs:** VERIFICATION.md F-01, F-03; stories/0{0,1,2,3}/RETROSPECTIVE.md R1.

## R2 · A whole-tree gate was started to re-prove code that had already passed

**Kind:** mistake · **Area:** process · **Stage:** verify · **Owner:** verifier · **Raised by:** operator · **Promoted to:** none

**What happened:** 167's whole-tree gate was green at `7514acf1`, and 168's gate commit differed
from it only in `wiki/` records. The verifier still launched `aof work regression-gate 168`
(13,000 cases) because the accept door reads 168's own `REGRESSION.md`. The operator stopped it.
Earlier, a concurrent session had removed the first gate worktree while the verifier was still using it.

**Why:** The door's need for a row was treated as a need for a run, and nobody compared the commit
with the last green run.

**Lesson:** Before any whole-tree run, diff the commit against the last whole-tree green. If the
code is identical, run only the suites the delta touched, through `--only`, and bring the
override to the operator. Keep gate worktrees in the session's own scratchpad, where a sibling
session's cleanup does not reach them.

**Refs:** VERIFICATION.md § the whole-tree regression gate.
