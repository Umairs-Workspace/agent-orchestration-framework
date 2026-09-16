---
type: milestone
doc: retrospective
number: 54
slug: verification-loop
title: "Retrospective — the milestone about vacuous greens, graded against itself"
created: 2026-08-23
updated: 2026-08-23
---
# 54 · Retrospective

Lessons from delivering and accepting the milestone. One `R<n>` per lesson, each carryable — a lesson
that only describes this diff is a note, not a lesson.

Distilled from `STATE.md`'s `## Feedback (for retro)` (25 entries across the five stories, now
archived) and this milestone's `VERIFICATION.md` findings (F-54-REFINE-1/2, F-54-00-1…4, F-54-01-1,
F-54-04-1, F-54-VERIFY-1…4).

## R1 — A control that reads green for a reason nobody measured is this repository's dominant defect, and seven instances in one milestone makes it a class

The count is the lesson. Milestone 54 exists to refuse inflated greens, and while building it we
found **seven** controls that were green for a reason nobody had measured: F-54-REFINE-2's sixteen
red-probe cells across 69 and 70 filled with a placeholder-substitute; F-54-00-4's REG-MUT-11
promising "by construction" tolerance it does not have; `loop-gate-cost-ladder` asserting *"no runner
is spawned"* over a fixture that declares no rubric, so it could not observe a spawn at all;
FF-5409's own `grade-indeterminate` clause taking its state from the READ-ONLY `work:loop` probe,
which drives nothing and reaches no stop; 69's `F-69-V7` pinning a rubric command that cannot grade
green on this machine; F-54-VERIFY-2's `FF-5304` exactness resting on a hand-edited literal; and the
skipped-case pass of F-54-00-2. **Every one passed. Every one was found by a human or a reviewer
reading it, never by a signal.**

The countermeasure this repository keeps reaching for is another prose rule, and seven recurrences is
the evidence that prose is not working. **The carryable form: a guard whose passing state is "found
nothing" is indistinguishable from a broken one by every signal except a red probe — so the red probe
is not documentation, it is the only measurement.** The open question this milestone could not
answer, and which is worth a spike rather than an eighth rule: can vacuity be detected mechanically —
an assertion whose fixture cannot reach the condition it names?

## R2 — A figure a contract quotes from a live file is a MEASUREMENT with a shelf life

Three instances here, all in one milestone. `LOOP_STOPS` was "exactly nine" at refine and is twelve
today (69 added three); `acd-controls-never-execute` "declares four arch-tests" and declared nine by
the time 54/00 built against it; `GATE_ORDER` was pinned at three rows by a test whose own ADR said
54 would make it five. **Cite a figure so the test can RE-TAKE it, never so the test has to be told
it.** Where the property is what matters, assert the property: 54/03's contract test asserts *"54
contributes exactly one member, the pre-54 eight unrenamed, the set frozen"* and cannot go stale;
`53/FF-5304`'s hand-typed literal beside it had to be hand-edited and therefore measured nothing
(F-54-VERIFY-2).

## R3 — A swallowed error that changes a ROUTING decision is not a degradation

The root cause of 54/03's intermittent red, and the sharpest lesson in the milestone because it is
54's own thesis pointed at 54's own shell. `commands/loop.mjs` caught everything `work:grade` could
throw and left `gradeResult = null` — and a null answer reads as `configured !== true` at every door,
which is exactly the `rubric-unconfigured` row that proceeds as today. **A declared rubric whose
grade threw was indistinguishable from a repository that declared none**, so the loop crossed to
verify and marked the item `done`: absence of evidence rendered as a green light, inside the
milestone built to prevent that. It was invisible because `reportDegrade` throttles per code for 5 s,
so only the first occurrence in a process logged at all. **Carry: a catch that returns a
falsy/neutral value is safe only where that value is not a ROUTING input. Where it is, the neutral
value is a decision, and it must be distinguishable from the decision it imitates.**

## R4 — A baseline is only evidence if it is written down AND taken twice

54/01 established the first half and it paid off immediately — the tier comparison at 54/01's fix
round was possible only because somebody had written the earlier number down. 54/03 established the
second half the hard way: two runs of the same tier on the same tree answered 1,229-pass and
1,230-pass, and the differing case was **this story's own new control**, which made the recorded
baseline one sample of a distribution presented as a fact. At this accept both lanes were taken
twice and agree exactly (165/165 twice; 1,210 cases / 7 failures twice, same seven subjects).
**Carry: "no new failures" against a single sample is a claim nobody can check, including its author
a week later.**

## R5 — A triage that names a MECHANISM and a FIX has given you two claims, not one

F-54-01-1's triage correctly diagnosed a race between process creation and a 400 ms bound, and
prescribed a startup byte. Implemented, then probed under 8-way load: **4 of 8 still red** — the
startup byte is written *after* node boots, and boot is exactly what the deadline was being spent on.
The triage's other half (a larger literal only moves the race onto a slower machine) was right and
load-bearing, so neither the diagnosis nor the prescription was wrong on its own. **Carry: re-probe
the fix under the conditions that produced the finding — a fix reasoned correctly from the mechanism
can still sit on the wrong side of it.**

## R6 — Whose blocker is it, is decided by which document the fix must change — not by who typed the line

The cost-ladder violation was routed as 69/06's, correctly on the evidence available: the offending
call site is 69/06's. The half that was missed is that **54/03's own task 00 scenario 2 requires the
violation to persist** — it asks for a payload carrying both a validate finding and a graded case,
which is unreachable under a short-circuiting ladder. So the contract that pins the violation in
place was 54's, and repairing 69/06's call order would have made a delivered scenario unsatisfiable.
**Carry: trace a blocker to the document that would have to change, not to the file that contains
it.** Settled here by amending ADR-007 §1 rather than re-contracting a delivered `.feature`.

## R7 — A builder that flags a contract contradiction and then picks a side has taken a contract decision

54/03 found two places where its own delivered scenarios pull against each other, flagged both
without editing either `.feature` — correct — and resolved each by choosing a side. Both choices were
independently judged right at review. But the completeness check is not *"did I flag the
contradictions I hit"*; it is **"did I flag every one, including the one that lets my own
implementation stand?"** The third contradiction — task 00 scenario 2 against ADR-007 §1's cost
ladder — went unnamed, and it was the one that entrenched a violated invariant (R6).

## R8 — A test helper that spawns is production code for the suite

It needs its own fuse and its own reap, or it trades one intermittent red for another. 54/01 shipped
a boot probe that polled for its first byte with **no bound at all** — right in spirit (bounding a
measurement at the value it is measuring begs the question) and wrong as shipped, because a machine
that cannot start node gets a silent hang on a CI runner instead of a red. Its sibling raced an open
file handle on Windows for `EPERM` because a cleanup `rm` ran without awaiting the child's exit — a
cleanup flake introduced by a flake fix.

## R9 — When a contract asks you to OBSERVE an act, read it off the subject

Two assertions shipped at 54/01 as inferences dressed as observations — *"no process from that run is
still alive afterwards"* resting on "`spawnSync` returns only once the child is reaped", and *"the
runner observes end-of-file on standard input"* on "we got a result back at all". Both true, both
arguments about the parent's API rather than measurements of the child, and both would have stayed
green if the deadline had DETACHED instead of killing. Replaced with observations: the runner appends
a byte every 25 ms and the test asserts the file STOPS growing; the stdin runner writes what its read
actually returned. **Carry: a correct argument about the parent is not the evidence the contract
asked for.** Its positive twin, from 54/00: when a report carries a summary of itself (`# tests 3`,
`# suites 1`), assert the normaliser against THAT — a producer's self-count is the one independent
witness available, and it is free.

## R10 — Prefer widening a surface a HUMAN also reads over adding a seam only a test uses

"The last gate invoked is X" and "`work:doctor` is not invoked" are assertions about acts that leave
no artefact. The alternatives were a test-only `ctx` hook (production code carrying an instrument
nobody in production uses) or an assertion about SOURCE (which proves the code was written, never
that it ran). The rungs instead announce themselves on the operator's own report line —
`Gate work:validate <ref> — N finding(s).` — which an operator genuinely wants ("which rung stopped
me?") and which the test observes through the already-injectable `report` callback. **Carry: the
first option pays for itself twice and cannot rot unnoticed.**

## R11 — Extending another milestone's gate is fine; discharging its debt while you are in there is not

Held twice under real temptation. 54/02 found `acd-loop-probe-contract` already red on arrival for a
reason belonging to 69, two characters from fixed, and refused — 69's stories were `in-review` and
the pin was theirs to move. At this accept the same rule kept F-54-VERIFY-2 routed to 53 rather than
fixed in passing, and 54 amended only its OWN declaration to stop claiming a count. **Carry: say so
instead. A silent edit from a neighbouring milestone is how two lanes end up disagreeing about who
owns a frozen literal.**

## R12 — A gate whose blast radius was argued at refine must be RE-MEASURED against a real item at build, and the number recorded

F-54-REFINE-1's original measurement said the new fitness gate's blast radius was **zero open
items** — an artefact of the corpus, not a property of the mechanism: 29 of 30 items read clean
because their registers used a placeholder-substitute that the shape test reads as "probe recorded".
The honest number was 26 errors across three milestones. **Carry: a sweep that returns zero is not
evidence until you have measured WHY each subject returned clean** — a corpus green for the wrong
reason produces exactly the same number as one that is genuinely clean. Re-measured live at 54/02's
build against this milestone's own record: `aof work doctor 54` returned 17 findings, 8 of them
`error`, and the gate admitted **0** — the circularity ruling working on the corpus that motivated
it.
