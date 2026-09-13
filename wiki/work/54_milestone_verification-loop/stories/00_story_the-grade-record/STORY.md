---
type: story
number: 00
slug: the-grade-record
title: "The grade record — green is positive evidence, and an exit code is none of it"
parent: 54
status: done
owner: product-owner
created: 2026-08-22
updated: 2026-08-22
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 00 · The grade record — green is positive evidence

## User story

As the loop deciding whether a maker's work is done,
I want a frozen, machine-readable record of what a rubric run **actually reported** — the verdict,
the codes, the observed case counts and the failures verbatim,
so that "the tests pass" is a claim backed by evidence I can inspect, rather than an exit code that
a suite which ran nothing at all also returns.

<!-- The benefit is challengeable and was measured, not asserted: at HEAD today, running the node
     test runner over `test/arch/acd-controls-never-execute.test.mjs` reports one test, one pass,
     and exit 0 — against a file declaring FOUR arch-tests. None of them ran. A grader that read
     that as green would ship a lie into the loop's own termination decision. -->

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [x] `tasks/00_the-frozen-vocabularies.feature` — `GRADE_VERDICTS` is the closed triple, `GRADE_CODES` the frozen nine in their own order, and the `GradeRecord`'s key set is exact; every one of the nine codes is reachable by a fixture, and the two advisory codes never move the verdict
- [x] `tasks/01_green-is-positive-evidence.feature` — `pass` requires all four pieces of evidence; the exit status is checked **first** and then discarded as insufficient; a report below its declared floor, or below the last recorded `pass` for the same ref, is `report-vacuous` and never `pass`
- [x] `tasks/02_the-report-normalisers.feature` — a **captured real** runner report normalises to enumerated cases carrying the statuses the runner emitted; a case with no status is not a passing case
- [x] `tasks/03_a-skipped-case-is-not-evidence.feature` — `@bug @finding-F-54-00-2`, added at verify:
  the evidence floor measures the cases that **RAN** (`total - skipped`), and the ratchet's bar is
  drawn on the same measure, so a suite in which everything skipped is `report-vacuous` and never
  `pass` (ADR-005 §2(c) as amended 2026-08-22)

## Notes

- **The milestone's spine, and deliberately inert.** This story ships no command, no config read, no
  spawn and no loop change — a pure leaf (`src/work-grade.mjs`, ADR-003 §1) holding the vocabularies,
  the verdict rules and the pure spawn-options builder. It is `70/ADR-002`'s shape and
  `graphify.mjs`'s `graphifySpawnOptions` instrument: exported and pure *precisely so a unit test can
  assert the guards without a live binary*.
- **The normalisers are proven against captured output, never against a believed shape.**
  `38/ADR-008` is unambiguous — where we do not own the producer, the contract test must be fed a
  real captured payload from it. A hand-written fixture of what TAP "looks like" is not evidence.
- **`indeterminate` is not invented.** `verify.md:104` already ships a third verdict for design
  conformance (`INCONCLUSIVE` when no baseline is available — *"name the missing baseline as the gap
  rather than inferring"*). This is that vocabulary one level over.
- **Starts immediately.** Zero dependencies, zero dependents on arrival; it touches nothing any
  other story touches. First wave, with 54/02 and 54/04.
