---
doc: retrospective
promotionFrom: 1
---
# 210 · Bounded test runs — retrospective

## R1 · Every story's bounded choice missed the checks that read source text, and the sweep and the gate found six

**Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** product-owner · **Promoted to:** rule:wiki/TESTING.md

**What happened:** Each story ran the suites it chose, with stated reasons, and was green. Verify's sweep over all of `test/arch` plus the native files found five reds no story's run had reached (F-07, F-08, F-09, F-10, F-12), and the first gate found a sixth: continue's prompt obligation in `bundle-runtime-variants.suite.mjs` (F-15). Each sits in a check that reads source or prose through globs, or in a native `node:test` file, which the importer scan does not reach.

**Why:** The milestone's own instructions said to "include the controls for the invariant being changed", but named no control family for the commonest changes, skill prose and new or deleted modules. A bounded choice is only as good as the map it is chosen from.

**Lesson:** Run a milestone-wide sweep of all of `test/arch` and the native files before the first gate, as this verify did. Keep the instructions file's area table naming the checks that read source or prose for each kind of change, so a story's own run reaches them.

**Refs:** VERIFICATION `@finding-F-07`, `@finding-F-08`, `@finding-F-09`, `@finding-F-10`, `@finding-F-12`, `@finding-F-15`; 210/00/R1, 210/04/R1, 210/04/R2, 210/05/R1.

## R2 · A second milestone in the same checkout moved the tree under the sweep and reddened the gate

**Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** product-owner · **Promoted to:** none

**What happened:** 198 was built in this checkout alongside 210. Its commit `1a0419dd` landed in the middle of verify's round-2 sweep and added seven reds that cleared once it was in. The shared lock, manifest and renders held both milestones' output and could not be split by commit, so 210's commit carried three of 198's renders. 198's unfixed pins (F-14, F-16) would have reddened 210's gate, and 210's verify fixed them once the operator said 198 was idle. The live-store run attribution was wrong three times for the same reason (F-06).

**Why:** Two milestones in one working tree share every generated file and every whole-tree check, so each one's evidence depends on the other's uncommitted state.

**Lesson:** Build concurrent milestones in separate worktrees. When they must share one, settle the tree before a sweep or gate (no other session writing), and have a milestone that adds a command update every pin that counts commands in the same commit.

**Refs:** VERIFICATION `@finding-F-06`, `@finding-F-14`, `@finding-F-16`; ## Verification evidence "Verify round 2 sweep".

## R3 · The testing instructions shipped a false hazard, and a finding was built on it

**Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** product-owner · **Promoted to:** none

**What happened:** `wiki/TESTING.md` said `global-work-propagation` binds the live daemon's `:4182`, so every named run, both verify sweeps and 210/05's smoke round excluded it, and F-05 was framed on it. The suite had injected a fake server since the 129 gate. The independent E13 lane said at round 1 that the stated cause was false, and nobody checked. It ran green beside the daemon in gate 1.

**Why:** The hazard was carried into the instructions from STATE notes and memory without being read in the suite. A reviewer's aside about a stated cause was treated as out of scope because the scenario under test passed.

**Lesson:** Before a hazard goes into the instructions file, read the suite to confirm it. When a review lane says a stated cause is false, check it in the same session.

**Refs:** VERIFICATION `@finding-F-05`; E13 evidence; ## Verification evidence "Regression gate 1".

## R4 · Stale "pending" markers on landed controls, the sixth time

**Kind:** mistake · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** product-owner · **Promoted to:** none

**What happened:** `ARCHITECTURE.md` still marked FF-21001, FF-21002 and FF-21003 "pending (210/04)" after all three had landed and gone green. Doctor resolves controls from disk, so nothing refused the stale text. Round 1's verify cleared them.

**Why:** Only the accepting command clears a marker, and the story that lands the control does not, so the marker always outlives the landing by at least one verify.

**Lesson:** The story that lands a declared control drops its own `pending` marker in the same change, and verify checks for none left before accepting.

**Refs:** VERIFICATION `@finding-F-02` (m126/F-06, m126/F-10, m127/F-07, m71/F-71-C, m58/F-58-02-3).
