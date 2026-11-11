---
doc: retrospective
promotionFrom: 1
---
# 179 · One knowledge engine behind both memory faces — retrospective

The per-story lessons live in each story's own `RETROSPECTIVE.md`: 02/R1, 04/R1 and 04/R2. Stories
01 and 03 surfaced no lesson of their own. This document carries what running the milestone taught.

## R1 · A ratchet row one story named was still left out of the next stories' write sets

**Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** product-owner · **Raised by:** developer · **Promoted to:** none

**What happened:** FF-16004's `aof work find` module ceiling moved in 01 (740 → 742), 02 (→ 744) and
04 (→ 745), and every move was a write outside the story's `files:`. After 01 the build said in
STATE that 02 and 03 add modules to the same assembly, so their `files:` should name the ceiling
row too. The contracts were not amended, and 02 and 04 both moved it again undeclared. 02 also
added a README row, and 04 added a new binding and a production `await` outside `files:`.

**Why:** A lesson recorded in STATE feedback is read at the retro, not by the next story's build.
The contracts for 02–04 were frozen at refine, so a correction learned in wave 0 had no path into
wave 1's declared write set.

**Lesson:** When a story's build finds a write-set row that its sibling stories will hit too,
amend those siblings' `files:` in the same beat, as D6 did for the stub harnesses, rather than
leaving it as a feedback note.

**Refs:** STATE `## Feedback (for retro)` (179/01, 179/02 and 179/04 write sets); m174/R3 and m144/R1
on the same class.

## R2 · Two new controls in one milestone tripped the one-extractor control

**Kind:** mistake (recurring) · **Area:** code · **Stage:** build · **Owner:** architect · **Raised by:** developer · **Recurs:** 165/01/R1 · **Promoted to:** none

**What happened:** FF-11901 refuses an arch control that reads imports its own way, and it went
red twice in this milestone. 01's FF-17901 purity case banned the `import` token. 04's FF-17904
spelled its own import extractor. Both were moved onto `test/support/module-family.mjs`
(`importSpecifiers`, `computedDynamicImports`). 01's fix did not reach 04's draft.

**Why:** Nothing in the architect's control-authoring step names `module-family.mjs`. FF-11901 is
a backstop that only fires once a sweep runs.

**Lesson:** Draft every control that reads imports on `test/support/module-family.mjs` from its
first line, and name that module in the FF register row of any control that scans imports.

**Refs:** VERIFICATION `## Verification evidence` (179/01, 179/04); FF-11901; 165/01/R1.
