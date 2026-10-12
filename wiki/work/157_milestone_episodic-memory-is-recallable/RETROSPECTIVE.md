---
type: milestone
doc: retrospective
number: 157
slug: episodic-memory-is-recallable
title: "Retrospective — episodic memory is recallable"
created: 2026-10-12
updated: 2026-10-12
promotionFrom: 1
---
# 157 · Retrospective

These are milestone-level lessons. Both run across all three stories, so no story has a lesson of
its own and no story-level retrospective was written. Findings are referenced, not restated
(`VERIFICATION.md`).

The evidence was gathered through `aof work memory recall "" --item 157 --area delivery --all --json`
(one finding, six runs: the attempt-1 refine failed `operator_action_required`, and the others were
`done`) and STATE's closure notes. The observability snapshot attributes no agent to 157 and reports
no stall.

## R1 — Story lanes went green while controls outside every `files:` were red

- **Kind:** mistake (recurring) · **Area:** process · **Stage:** refine · **Owner:** architect · **Raised by:** developer (157/01, 157/02 builds), aof:verify 157 · **Promoted to:** none

**What happened.** Every story touched, or reddened, a control its `files:` did not declare:
- 157/01: the `INDEX_VERSION` bump moved three suites that pin the constant's value, the JSON
  goldens in `work-memory-command` and the kernel import allow-list.
- 157/02: the `--all` descriptor change reddened `test/fixtures/application/command-inventory.json`.
  Only 03's bundle sweep caught it.
- At verify, m153's FF-15301 ledger-reader census was red (`VERIFICATION.md` F-01). 01's new
  episodic leaf and its core binding read `FEEDBACK.ndjson`, and no lane had run that control.

**Why.** Refine traced the importers of the changed source. These controls do not import it: they
pin a value, count a directory or grep for a token. 148/02/R1, 148/R1 and 153/R1 describe the same
class. `aof work memory recurrence` scored the nearest one, 148/02/R1, at 0.146, under the 0.23
threshold, so no `Recurs` is claimed. That a fourth incident of the class scores under the line is
itself worth knowing.

**Lesson.** A new module, a bumped constant or a changed descriptor has readers that never import
it. At refine, grep the concept's own tokens across `test/` (the file name a census matches, the
constant's value, the descriptor key) and declare every hit in `files:` or `reads:`. At verify, run
the whole `test/arch/<subject>/` directory the story's controls live in, not only the controls the
story declares.

**Refs:** `VERIFICATION.md` F-01; STATE `## Feedback (for retro)` (157/01 and 157/02 read-set notes).

## R2 — The developer's near-miss recall ran after the build began, in every story

- **Kind:** near-miss (recurring) · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** developer (157/01, 02, 03 builds) · **Promoted to:** none

**What happened.** All three builds ran continue's `continue-developer` recall
(`--kind near-miss`) after implementation had started, not before it. Each recorded honest
verdicts: 40/R3 and 13/R8 honoured in 01; 40/R3 and 05/R1 in 02; 127/01/R3 and 150/R1 in 03.

**Why.** Continue prescribes the recall before building. Nothing checks the order: the ledger row
carries the recall's `at`, but no control compares it with the build's first edit. The recurrence
check returned no qualifying prior lesson (best 0.087).

**Lesson.** A recall that runs after the first edit cannot shape the build, so it only records what
was done. Run it before the first edit. A control that compares the recall's `at` with the run's
first commit or edit would make the order checkable rather than a matter of discipline.

**Refs:** the `continue-developer` rows in `stories/0{1,2,3}_*/FEEDBACK.ndjson`; STATE `## Feedback (for retro)`.
