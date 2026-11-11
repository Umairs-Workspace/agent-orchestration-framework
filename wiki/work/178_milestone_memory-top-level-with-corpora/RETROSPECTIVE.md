---
doc: retrospective
promotionFrom: 1
---
# 178 · Memory is its own command — retrospective

The per-story lessons live in each story's own `RETROSPECTIVE.md`: 01/R1, 02/R1, 02/R2, 03/R1 and
03/R2. This document carries what running the milestone taught.

## R1 · Every story lane was a whole-tree run, and on this Mac the residue hid a real red

**Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** product-owner · **Promoted to:** none

**What happened:** `aof test --scope impacted --story 178/0{1,2,3}` widened to `scope: all` (1,254
suites, 8,278 cases) for every story, at build and again at verify. The changed memory modules
reported `no-registered-dependent` or `not-in-graph` against the graph of 2026-10-29T11:18Z. Each
run carried about 23 Mac-environmental reds (F-02), and 03's real red (F-01) sat among them
unnoticed until verify diffed the case names against a HEAD worktree.

**Why:** The impacted scope cannot see a dependent the graph does not register, and the knowledge
modules' suites reach them through the command face, not by import. A widened run on a node with a
standing residue is only useful against a baseline of that residue.

**Lesson:** When a story lane widens to the whole tree on a node with known environmental reds,
record a baseline by case name from a clean HEAD worktree once per milestone, and diff each lane
against it rather than against memory of the residue.

**Refs:** VERIFICATION `## Verification evidence` (story lanes, baseline); `## Findings` F-01 and F-02.

## R2 · Bare file arguments to the test runner ran the whole registry

**Kind:** mistake · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** product-owner · **Promoted to:** none

**What happened:** To re-run the three fitness functions, verify ran `node scripts/test.mjs <three
files>`. `selectionArgv` (`scripts/test.mjs:272`) returns `null` without its selection flag, so
the runner ignored the files and ran the whole registry, on a laptop whose live daemon holds
`:4182`. It took ten minutes and gave no reading of the controls. They were then run through
`scripts/test-shard.mjs`: 15 cases, 0 failures.

**Why:** The runner reads files only after its flag, and drops bare arguments without saying so.

**Lesson:** Run named suites with `node scripts/test-shard.mjs <files>`, never as bare arguments
to `scripts/test.mjs`.

**Refs:** VERIFICATION `## Fitness functions` (re-run at verify).
