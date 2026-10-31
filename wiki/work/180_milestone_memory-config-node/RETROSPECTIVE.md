---
doc: retrospective
promotionFrom: 1
---
# 180 · One memory node in the config — retrospective

The per-story lessons live in each story's own `RETROSPECTIVE.md`: 01/R1, 02/R1 and 03/R1. This
document carries what running the milestone taught.

## R1 · Three new reds hid inside a recorded red residue until verify diffed the names

**Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** product-owner (verify) · **Promoted to:** none

**What happened:** 180/03 reached `in-review` with three UI controls red (F-02). STATE recorded the
build's whole-tree run as reds already present before 180, with a list of about thirty. At verify,
each red file was re-run at the build commit and at 179's accept. Three files were red at the
first and green at the second, and all three were 03's `App.tsx` controls.

**Why:** A long, recorded residue was read as a list, and a new red with a plausible neighbour
reads as one more entry. Story 01's triage confirmed its own reds against HEAD with the changes
stashed. That check was not repeated after 03 landed.

**Lesson:** When a lane carries a known red residue, prove that each story added nothing to it by
diffing red case names against the base commit. Do it after every story that lands, not once
per milestone.

**Refs:** VERIFICATION F-02, `## Verification evidence` (the `@executable` suite); `c8a236e3`;
STATE `## Feedback (for retro)` (pre-existing reds).

## R2 · The near-miss recall ran after the build began, twice

**Kind:** near-miss (recurring) · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** developer · **Recurs:** 167/02/R2 · **Promoted to:** none

**What happened:** 01's near-miss recall was taken after its build had started. The 05/R3 lesson it
returned then moved the schema scenarios (E11, E12) out of the knowledge package's suite, after
the code was written. 02's recall also ran after its build.

**Why:** The recall is a step of the build, not a gate before its first edit, so a session that is
already editing reaches it late.

**Lesson:** Take the near-miss recall before a story's first edit. A lesson recalled after the
build only confirms or reworks it.

**Refs:** STATE `## Feedback (for retro)` (180/01, 180/02 near-miss recalls); recalls
`73e02c02-5c32-49aa-b336-05d354f8d2fc`, `3ed6919a-4537-46cd-829e-d5aee36dd61d`.

## R3 · The Memory section was designed with no route to render it

**Kind:** mistake (recurring) · **Area:** contract · **Stage:** refine · **Owner:** designer · **Raised by:** product-owner (verify) · **Recurs:** 135/03/R2 · **Promoted to:** none

**What happened:** DESIGN Surface 1 declares no `Route`, and the project sets no `work.ui.baseUrl`.
03's `@manual` DESIGN scenario therefore came to verify unrenderable, and the verdict is
INCONCLUSIVE rather than CONFORMS (F-01).

**Why:** The refine settled the baseline question (no mock, the binding checklist is the source of
truth), but not the render question. A checklist with nothing to render against cannot be
judged.

**Lesson:** When a DESIGN surface is written, name the route that shows it. Otherwise record at
refine that its fidelity is deliberately unjudged, so the `@manual` scenario does not promise a
CONFORMS verify cannot give.

**Refs:** VERIFICATION F-01; m135/F-135-03; DESIGN.md Surface 1; STATE D3a.

## R4 · The impacted lane widened to the whole tree, and verify ran it three times at once

**Kind:** mistake (recurring) · **Area:** process · **Stage:** verify · **Owner:** product-owner (verify) · **Raised by:** product-owner (verify) · **Recurs:** 160/02/R1 · **Promoted to:** none

**What happened:** At verify, `aof test --scope impacted --story 180/0N` was started for all three
stories in parallel. Each widened to `scope all` (1,259 suites, 15 widenings), so the whole tree ran
three times concurrently. The contention produced timeout-shaped reds (`arch/46 ADR-004`,
`audit-spawn/03`) that were green when re-run alone, and every red had to be re-sorted.

**Why:** A widening is announced only in the lane's summary line, which prints at the end, so all
three runs were committed before anyone could see that each was a whole-tree run.

**Lesson:** Before fanning out impacted lanes, check whether one widens to `scope all`. If it
does, run the tree once for the milestone and run each story's own suites through
`scripts/test-shard.mjs`.

**Refs:** VERIFICATION `## Verification evidence` (the `@executable` suite); 160/02/R1.
