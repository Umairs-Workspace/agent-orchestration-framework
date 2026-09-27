---
type: story
number: 03
slug: signature-and-the-doctor-lane
title: "The signature and the doctor lane — a shape a check can read, and a report that never gates"
parent: 78
status: done
owner: product-owner
created: 2026-09-03
updated: 2026-09-04
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/78_milestone_loop-execution-record/ARCHITECTURE.md#ADR-001, wiki/work/78_milestone_loop-execution-record/ARCHITECTURE.md#ADR-007, wiki/work/78_milestone_loop-execution-record/ARCHITECTURE.md#ADR-008, wiki/work/66_milestone_controls-that-run/ARCHITECTURE.md#ADR-001, src/declared-id.mjs, src/work-doctor.mjs, src/work-doctor-controls.mjs, src/commands/item-status.mjs, src/commands/validate.mjs, src/work-acceptor/admissibility.mjs, src/work-acceptor/rule.mjs, scripts/test.mjs]
files: [src/work-doctor-loop-record.mjs, src/work-doctor.mjs, test/doctor-loop-record-lane.test.mjs, test/loop-record-signoff-shape.test.mjs, test/arch/acd-loop-record-signoff-shape.test.mjs, test/arch/acd-loop-record-never-gates.test.mjs, scripts/test.mjs]
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 03 · The signature and the doctor lane — a shape a check can read, and a report that never gates

## User story

As an operator who has read a work item's loop execution record,
I want a place to say the execution was acceptable, in a shape a check can read,
so that my sign-off is a fact the framework can report on rather than a sentence in a paragraph that
drifts and that nothing can find.

## Why

This is the one thing 53 does not claim and 54 explicitly declines: **a machine-readable sign-off of
any kind.** `@uat` tags on scenarios plus prose in `## Accept decision` are the entire vocabulary
today, and milestone 54 — the obvious-looking home — rules human acceptance out of scope
(`54/SPEC.md:60`). `SPEC.md` requires the shape milestone 66 established: a frozen `h2`, a frozen
table header, the id alone in the first cell. A signature that is prose in a paragraph is not
checkable and will drift.

**And it does not gate (ADR-007).** 66 faced exactly this question about the observability report and
declined, on the ground that the measure→decide path already works through a human. 59's thesis is
sharper: an agent-generated record a human rubber-stamps *"may be worse than none, because it launders
a machine claim as human judgement."* The argument that settled it at refine is a third one, available
only after this milestone's measurement: at zero join coverage — the state of every item in this
repository today — a gate's first act would be to refuse every accept in the stream over a fact no
operator can currently supply. That is not a gate; it is an outage.

So doctor **reports** an unsigned or stale record at `warn`, and a warn-only doctor result does not
fail `aof:validate`. The absence is visible and nothing is blocked.

## Tasks

- [x] `tasks/00_the-frozen-signoff-block.feature` — the frozen `h2`, the frozen table header, the id
      alone in the first cell, and what counts as signed.
- [x] `tasks/01_the-doctor-lane.feature` — the findings, their severities, and the doors that must
      keep ignoring them.

## Notes

**The first cell holds a loop id, not a new id form.** `loop:build-to-green` is already the endpoint
grammar the registry uses. Reaching for a new `SIGN-NN` form would mean extending the closed id-form
set in `src/declared-id.mjs` — which ADR-008 of milestone 66 says is extended by ADR only, and which
this milestone has no reason to touch.

**Doctor reads the record when present and never demands it.** ADR-001 deliberately keeps
`EXECUTION.md` out of `CONVENTION_DOCS`: adding it there would make every item in the stream owe the
document, and only items that ran loops owe it.

**The lane is one appended entry.** `CHECK_GROUPS` (`src/work-doctor.mjs:575`) is an append-only array
of pure `(snapshot, ctx) => Finding[]` functions, and this story appends one — the shape 66/02 and
54/04 each used. One story owns the array for the milestone; the recorded ratchet that the family
folds into `src/work-doctor/` is inherited, not discharged here.
