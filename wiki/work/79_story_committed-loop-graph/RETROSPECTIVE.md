---
type: story
doc: retrospective
number: 79
slug: committed-loop-graph
title: "Retrospective — the committed loop graph"
created: 2026-09-03
updated: 2026-09-03
---
# 79 · Retrospective

Lessons from delivering and accepting the story. One `R<n>` per lesson, each carryable — a lesson
that only describes this diff is a note, not a lesson.

## R1 — A criterion only a diff can prove needs a diff-time check, or it is unverified

Task 00 asserts that `src/commands/loops-graph.mjs` is "byte-unmodified by this story". The developer
mechanised the two ways THIS story could have moved it — a write call form, an output-path input —
plus FF-5201's own sweep, and the review close correctly flagged the residue: **whole-file byte
identity across a story is a property of the DIFF, not of the runtime**, and no runtime gate can
re-check it later. The fix is not a cleverer assertion; it is to notice which half of a criterion the
suite can reach and run the other half at the gate that can. Here that was one command —
`git status --porcelain src/commands/loops-graph.mjs` → empty — recorded in the verification evidence.
**When a contract says "X is unchanged by this story", the suite proves the mechanisms and the accept
gate proves the diff. Write the diff probe into the record, or the claim ships unverified.**

## R2 — The declared write set drifts the moment a shared test-support file appears

`files:` omitted `test/support/loop-document-fixture.mjs` — the fixture repo that both new behavioural
suites and all four structural gates stand up. It was invisible to the author because it is not a
source module and not a suite; it is the thing the suites are built ON, and it was created part-way
through the build rather than declared at refine. **Every item's declared write set has the same blind
spot with the same shape: shared test scaffolding, added mid-build, belonging to no lane's own file
list.** The review close asked for a repair "at refine" — but refine does not run again on a story
being accepted, so the honest routing for a record-accuracy defect found at review close is the accept
gate, where `aof:verify` already owns the record docs. It was fixed there (F-79-A).

## R3 — The gate that FORBIDS the shape is the gate that names the design, and it must be re-run

52/FF-5201 discovers loop modules from disk by two patterns, asserts the discovered set, and holds
every discovered module free of write call forms — its own comment naming *"a writer
`src/commands/loops-init.mjs`"* as the case it exists to catch. That gate did not merely veto `--out`
on `loops-graph`; it **chose the module name, the command id, and the family the writer belongs to**,
while leaving the CLI route free to sit where an operator looks for it. This is the shape worth
carrying: a fitness function that forbids a construction is a design constraint with an answer already
in it, and the discipline is to read the gate's own comment for the answer rather than route around
it. The corollary is procedural — **re-run the forbidding gate rather than reasoning about it**: the
whole `arch/52` family was in this story's verification selection precisely because it is the family
the design was derived from, and "the name is legal" is a claim only that gate can settle.

## R4 — An honest no-op must name the condition that actually failed, not the key it looked for

`aof work doctor` reports `rubric-join-unchecked` with *"no `work.rubric.report` is configured"* — and
this repository **does** configure `work.rubric.report`. What is missing is `report.path`, which
`declaredReportFrom` requires before the key resolves at all. The lane's design is right (it reports
that it did not check, rather than passing on a report nobody read); the sentence is wrong, and it
sends a reader to add a key that is already there. **A no-op message is a diagnostic, and a diagnostic
that names the wrong missing thing costs more than silence — it is a lie with a fix attached.** Report
the predicate that failed (`report.path` absent), not the parent key it lives under. Recorded as
F-79-C.

## R5 — Acceptance is where the artifact budget binds; read the door before you reach it

`STORY.md` measured 151 lines against a 150-line budget. On the ordinary doctor surface that is a
`warn` and easy to scroll past — but `aof work status <ref> done` runs the **same** budget group with
the accepting ref injected, which promotes it to `error` and refuses the transition with
`artifact-budget-exceeded` (`src/commands/item-status.mjs:96-114`). The gate was found by reading the
door, not by being refused by it, which is the cheaper order. **A `warn` that is scoped to become an
`error` at exactly one door is not an advisory — it is a gate with a delayed fuse.** The honest remedy
is content that has stopped being true (here a refine-time note claiming the mesh cache still reported
chore 64 as `not-started`, which `aof work find 64` now contradicts), never a reflow that shaves a
line while keeping the words.
