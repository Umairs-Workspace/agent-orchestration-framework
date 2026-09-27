# 04 · Scenario traceability — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### A declared `@executable` → case join
`src/work-doctor-rubric.mjs` pairs an emitted case with an `@executable` scenario when the case's name
CONTAINS the scenario's name, over scenarios the one feature parser resolved — `@manual` and `@uat`
scenarios are never offered to the join, however their names read.

### A miss is reported, never guessed
A case naming no scenario is `case-unjoined`; a scenario named by no case is `scenario-unjoined`; both
report at `warn` and move no verdict, and no module on the grade path carries a levenshtein, edit
distance, fuzzy, similarity or best-match fallback.

### The honest no-op names the key that would activate it
With no `work.rubric.report` declared, the lane emits `rubric-join-unchecked` once per item that
declares at least one `@executable` scenario, naming `work.rubric.report`; an item declaring no such
scenario gets no notice at all, and no unjoined finding is ever emitted from a report nobody read.

### A pure `work:doctor` lane that runs nothing
`rubricTraceabilityGroup` is a horizon-scoped `CHECK_GROUPS` member reading the last report as
snapshot text, exactly as the controls lane reads its runner texts; it spawns nothing, and it joined
the scanned `work-doctor*` family the day it was written.

### The milestone-15 traceability gap filled outside the god-node
The join lives in a new lane leaf; `validateWork` and its 256 dependents are untouched,
`src/work-doctor-controls.mjs` is not edited, and `src/feature-parse.mjs` is read and not edited — it
remains the one feature parser.

### A frozen three-code vocabulary of its own
`RUBRIC_FINDING_CODES` is frozen at `case-unjoined`, `scenario-unjoined` and `rubric-join-unchecked`,
and `RUBRIC_REPORT_CONFIG_KEY` is the single spelling of the key its message names.

### One armed fitness function
`acd-grade-subject-is-emitted` (FF-5408) is registered and has been observed failing against two
planted defects — a prose classifier and a fuzzy fallback.

## Assumptions

- **QA makes the join true by naming the case after the scenario** — containment is the whole join;
  refine measured 0 exact matches between 4,744 scenario names and 5,725 declared test names, so a
  case nobody named after a scenario is reported unattributed rather than paired by inference.
- **The report reaches the lane through the doctor snapshot** — the lane reads what the snapshot
  carries and never runs a rubric, so its answer is only as current as the last recorded report.
- **Both legs stay advisory** — roughly 75% of `@executable` scenarios report `scenario-unjoined` on
  arrival, so the `warn` severity is what keeps the lane from becoming a wall of inherited red.

## Gaps

### Nothing produces a report for the lane to join against on this repo
- **Status:** open
- **Discharge condition:** a project declares `work.rubric.report` and a graded run records one.
The join is fully delivered and, on this tree, has never joined anything: every item reports
`rubric-join-unchecked`.

### `validate`'s own note still tells a reader the join is unchecked
- **Status:** open
- **Discharge condition:** the note at `src/commands/validate.mjs:115` points at the `work:doctor`
  rubric lane (F-54-04-1, deferred).
The gap the note describes is filled; the sentence is not, and it names no place to look.

### The two advisory codes are produced here and consumed nowhere
- **Status:** open
- **Discharge condition:** 54/03 threads the join's observations into the grade record the re-drive
  reads.
`case-unjoined` and `scenario-unjoined` are frozen members of `GRADE_CODES` that this lane now emits
as doctor findings, but no grade record is populated from them.
