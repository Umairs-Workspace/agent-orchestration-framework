# 54 · Verification as a feedback loop — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.

  A milestone's outcome is AUTHORED, never a concatenation of its stories'. Capabilities stated whole
  by a story are CITED here, not repeated — the aggregation happens in the memory index.
-->

## Delivered

### aof grades a work item, and the grade is a record rather than an exit code
`aof work grade <ref> --run` compiles a `GradeRecord` — verdict, codes, per-case counts, the runner's
verbatim failures — from a report a declared runner emitted. The whole path refuses to mint a `pass`
from an absence: nothing yields `pass` without a parsed report, and the evidence floor is measured
against the cases that actually RAN. *(The vocabularies, verdict rules and evidence floor are stated
whole by `m54/00`; the declared-argv rubric, its single bounded spawn and its read-only bare face by
`m54/01`.)*

### The loop decides on deterministic evidence before it spends a model turn
This is the milestone-level fact none of the stories states alone. Before 54, a loop's only judge of
"is this item correct" was a model review turn. There are now three deterministic rungs ahead of it —
`work:validate`, `work:doctor`, `work:grade` — in declared cost order, and the loop's next act is
derived from their answers. A story whose suite is red re-drives without a review turn being spent
on it. *(The ladder and its admitted scope/severity: `m54/02`. The verdict-derived routing:
`m54/03`.)*

### A red gate hands the maker what went wrong, instead of the fact that something did
The grade's record rides the run it re-drove and reaches the next session through `70/04`'s existing
fix transport, and a loop that exhausts its cap halts carrying the accumulated record of what it
could not close rather than an empty list. *(Stated whole by `m54/03`.)*

### An unconfigured repository is unchanged, byte for byte
Every capability above is inert where no `work.rubric` is declared: the `LoopState`, every report
line, every driver input, the driver's spawn argv and every run record are indistinguishable from the
pre-54 shell. `rubric-unconfigured` is a named `indeterminate` that proceeds exactly as before, and
no code path maps it to a `pass` or to a halt. This is what makes the milestone adoptable rather than
a migration.

### aof declares what it does not know, and refuses to guess it
The rubric is the project's declaration — an argv, a report format, an evidence floor — and aof runs
precisely what was declared. It never infers a runner, never derives a case identity or status from a
runner's free text, and reports `unjoined` rather than guessing a pairing. *(The emitted-not-inferred
rule and the `@executable`→case join: `m54/04`.)*

### Ten fitness functions, each observed failing
FF-5401 … FF-5410 are declared, resolve to files on disk, and every one has a red probe recorded in
`VERIFICATION.md` against a planted defect. `aof work doctor 54` reports zero `control-unresolved`
and zero missing red probes at any severity.

## Assumptions

- **The project declares its own hazards** — aof does not know that this repository's suite must run
  isolated, or that a port a live daemon holds cannot be bound; the rubric argv is where a project
  says so, and a declaration that will not carry a run is reported plainly rather than worked around.
- **The rubric spawn is blocking, and survivable only within the heartbeat window** — measured at
  116 s against 900 s (7.8×) on this repository. Every delivery above rests on that margin rather
  than on the spawn being non-blocking (F-54-VERIFY-3).
- **The deterministic rungs admit `error` only, and warns never gate** — the stream carries hundreds
  of `warn` findings and `pending` controls are already `warn`, so the `error`-only admission is what
  keeps the ladder from halting every loop in the repository.
- **Verify's own artefacts cannot gate entry to verify** — the doctor rung's admitted code set is
  derived by filter from `CONTROL_FINDING_CODES` minus its two `verification-*` members, because a
  register that verify itself authors would otherwise be unsatisfiable forever (ADR-007 §2c).

## Gaps

### The grade cannot heartbeat while it waits
- **Status:** open
- **Discharge condition:** an ADR-level choice between an async spawn that heartbeats while the
  runner works, and a grade deadline resolved under the heartbeat window.
`commands/grade.mjs` spawns with `spawnSync`, which blocks the event loop, and `work:grade` is now a
rung in `GATE_ORDER` — so a loop shell emits no heartbeat for as long as the declared rubric takes,
against a 15-minute window whose consequence is *"kill the attempt and retry it"*. Latent at this
repository's 116 s rubric; live for any declared rubric approaching the window. Routed forward three
times inside this milestone and never landed, because `ADR-009 §1` forbids 54 choosing a bound at all
(F-54-VERIFY-3).

### The grade's failures are bounded only where a human reads them
- **Status:** open
- **Discharge condition:** the payload is bounded in the writer, as `70/ADR-003` bounds the phase
  brief.
The operator line slices to 20; the run record's `brief.grade`, the cap-exhausted report line and the
fix transport's `## REVIEW FINDINGS` each carry the record whole.

### The traceability join has never run against this repository's own scenarios
- **Status:** open
- **Discharge condition:** `work.rubric.report.path` is declared and the runner writes its report
  there.
The lane requires a report file to join against; this repository's rubric writes TAP to its streams
and declares `format` and `floor` only, so the lane reports its honest no-op for all five stories
(F-54-VERIFY-4).

### Nothing detects a vacuous control mechanically
- **Status:** open
- **Discharge condition:** a spike establishes whether an assertion whose fixture cannot reach the
  condition it names is mechanically detectable; a control lands if it is.
Seven controls in this milestone were green for a reason nobody had measured, each found by a reader
rather than by a signal — including two of this milestone's own. The red-probe register is the
countermeasure and it is a declaration, not a detector: it records that a probe was performed, never
that the assertion beneath it was reachable (`RETROSPECTIVE.md` R1).
