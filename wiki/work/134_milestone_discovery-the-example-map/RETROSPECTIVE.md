---
doc: retrospective
updated: 2026-10-02
---
# 134 · Discovery before formulation — Retrospective

## R1 — every suite was green while the behaviour failed its first real use

- **Kind:** misunderstanding · **Area:** product · **Stage:** verify · **Owner:** product-owner
- **Raised by:** the operator, at the live run (F-134-01)

**What happened.** All five stories were in review with 90 cases and four controls green. The first
real discovery run then put four questions to the operator that the story's own text answered or
that were not theirs to decide. The milestone exists to send a person the questions only they can
answer, and its first output wasted that person's time. Cited: m134/05/R1.

**Lesson.** A milestone whose product is a human-facing behaviour schedules its live run before
its stories reach review, so what the run finds can still change the contract.

## R2 — a restructure landed between refine and build

- **Kind:** process · **Area:** planning · **Stage:** continue · **Owner:** architect
- **Raised by:** the 03 re-gate and the 04 build

**What happened.** 142 moved `src/` into Yarn workspaces while 03 and 04 were in flight. 03's
contract went red untouched, and 04's write set missed the whole composition layer. Cited:
m134/03/R4, m134/04/R1.

**Lesson.** When a restructure merges under a refined milestone, re-derive each unbuilt story's
`files:` from the new tree before its build, as one step at the merge.

## R3 — the whole-tree gate still cannot record itself

- **Kind:** process · **Area:** testing · **Stage:** verify · **Owner:** product-owner
- **Raised by:** aof:verify 134

**What happened.** `aof work regression-gate` runs the serial suite, which cannot finish here, so
this is the fourth milestone accepted on an override that cites a sharded run (60 min under load,
11,604 cases). Its reds were 142's and the environment's, and 13 suites flaked under load.

**Lesson.** The gate verb should run what the gate actually runs. That is 144 (promoted at this
verify), which now has the operator's bounds: 15 min, and every flake logged.
