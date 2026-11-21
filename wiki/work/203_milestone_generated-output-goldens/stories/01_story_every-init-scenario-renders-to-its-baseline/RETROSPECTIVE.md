---
doc: retrospective
promotionFrom: 1
---
# 203/01 · Every init scenario renders to its baseline — retrospective

## R1 · Registering a lane widened every caller that runs the registry bare

**Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** solo review (round 1) · **Promoted to:** none

**What happened:** Registering `work-init` in `test/support/golden/lanes.mjs` made every bare
`node scripts/golden.mjs --update` run all eight inits, so 203/00's self-test went from 21 s to
115 s. The fix scoped those calls with `--lane fixture`, which edited
`test/golden/golden-harness.test.mjs`. `files:` did not list that file, or the
`test/golden/baselines` budget exemption.

**Why:** The story was drawn around what it added. A registry iterated by default reaches every
existing caller that does not name a lane, and those callers sit in another story's files.

**Lesson:** Before adding to a registry that callers iterate by default, grep for its bare callers.
Scope the ones that mean "this lane", and declare them in `files:`.

**Refs:** ../../STATE.md Feedback (for retro), "203/01 · declared set incomplete" and "203/01 review (solo, round 1)".

## R2 · The example map counted the runtimes' files and not aof's own records

**Kind:** misunderstanding · **Area:** contract · **Stage:** refine · **Owner:** product-owner · **Raised by:** developer (build) · **Promoted to:** none

**What happened:** Three clauses about what a scenario stores or removes were wrong by exactly aof's
own `.aof/` records: the R1 outline's `removed.golden` (the apply journal, and opencode's loop
records), and E5 and E7 (the install lock, plus the journal for `hyperagent`). The build asserted the
measured truth through two flagged allowances, and verify amended the features (VERIFICATION, Accept
decision).

**Why:** The map was drawn from the runtime trees a reader thinks of as the output. Install records
list every member, so any profile that adds or re-gates a member changes them, and a runtime's
own records go with it.

**Lesson:** When a clause enumerates a generated tree, list the whole measured tree at refine,
including the tool's own records, and write the clause from that list.

**Refs:** ../../STATE.md "For the operator: three things 203/01 found", item 1; ../../VERIFICATION.md Accept decision.
