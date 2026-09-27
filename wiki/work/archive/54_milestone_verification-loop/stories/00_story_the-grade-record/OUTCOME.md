# 00 · The grade record — green is positive evidence — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### The grade record
`src/work-grade.mjs` compiles a `GradeRecord` — `{ref, verdict, codes, runner, report, cases, failures, gradedAt}` — whose key set is exact on every branch and whose JSON round-trips.

### A closed verdict triple
`GRADE_VERDICTS` is a frozen exported `["pass", "fail", "indeterminate"]`, and no fourth verdict is reachable.

### A frozen nine-code vocabulary with a producer for every member
`GRADE_CODES` is frozen, set-equal to ADR-005 §3's nine, reported in its own declared order rather than the order observed, and every one of the nine is reachable through the real compiler from a committed fixture.

### `pass` costs four pieces of positive evidence
A `pass` is reachable only when the declared report exists, parses in its declared format, enumerates named cases at or above the evidence floor, and every case carries a status; the exit status is read first and then discarded as insufficient — it can veto a pass and can never buy one.

### The evidence floor measures cases that RAN
`casesThatRan` (`total - skipped`) is the single expression both the declared floor and the ratchet's bar are measured on, so a report of nothing but skips is `report-vacuous` at `indeterminate` at every floor and with any history, while `cases` still reports the observed counts.

### A ratchet scoped to the item, needing no configuration
The floor is raised by the highest cases-that-ran of the last recorded `pass` for the same `ref`, filtered by `ref` inside the compiler; only a `pass` raises it, and another item's history moves it neither up nor down.

### TAP normalisation proven against captured output
Both TAP dialects this repo produces normalise to the cases their producer actually emitted — ordinals and plan lines optional, `#` section headers and summary lines not cases, suites distinguished from tests by the producer's own `type` field, failure messages carried verbatim — and each supported format is backed by a committed capture carrying a provenance line, never by a hand-written specimen.

### Two armed fitness functions
`acd-grade-green-needs-evidence` (FF-5402) and `acd-grade-record-envelope` (FF-5403) are registered in the runner and each has been observed failing against a planted defect.

## Assumptions

- **The compiler is handed observations; it gathers none** — every capability above rests on an impure edge (54/01) supplying `runner`, `report`, `rubric` and `gradedAt`; the leaf imports nothing from `src/`, spawns nothing, touches no filesystem and reads no clock.
- **The ratchet's history arrives from the run store** — the bar is only as good as the recorded grades 54/01 and ADR-008 persist; with no history the declared floor and the always-a-case-that-ran floor are the whole defence.
- **A report is trusted to be its declared format** — the declared format names the normaliser, and no other format's normaliser is tried against the text, so a mis-declared format reads as `report-unreadable` rather than being silently re-sniffed.

## Gaps

### The two advisory codes have no producer in this story
- **Status:** open
- **Discharge condition:** 54/04's join lane emits `case-unjoined` / `scenario-unjoined` observations.
`case-unjoined` and `scenario-unjoined` are frozen members of `GRADE_CODES` and are proven here to be recorded without moving the verdict, but nothing in the delivered code produces them — they are supplied to the compiler as a join observation that only 54/04 computes.

### The pure spawn-options builder named in this story's notes
- **Status:** open
- **Discharge condition:** 54/01 lands `03_the-spawn-is-bounded-and-single.feature` and FF-5406.
`STORY.md`'s notes describe a spawn-options builder as part of this leaf; no task feature covers it, and it was left unbuilt rather than shipped untested, so `src/work-grade.mjs` exports no spawn helper today.

### Nothing calls the compiler
- **Status:** open
- **Discharge condition:** 54/01 registers `work:grade` and 54/03 invokes it from the loop's gate ladder.
The grade record exists and is proven, but no command, route or loop rung reads it — the module is a leaf with no callers in `src/`.
