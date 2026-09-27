---
doc: retrospective
updated: 2026-09-05
---
<!--
  Story RETROSPECTIVE.md — the lessons from HOW this story was built and gated, not what it
  delivered (that is OUTCOME.md) and not what was found (that is VERIFICATION.md, referenced here
  and never restated). One `R<n>` per lesson, appended, never renumbered.
-->
# 118 · Finding triage weighs what a driver costs — Retrospective

## R1 — a rule stated at three layers binds at two, and only the accept gate went looking

- **Kind:** near-miss · **Area:** architecture · **Stage:** verify · **Owner:** the story's contract
- **Raised by:** the product owner at `aof:verify`, by grepping for callers rather than reading the suite

**What happened.** The story deliberately lands the cost test and the depth bound in three places —
the pure decider `routeFinding`, the `<finding_triage>` prose, and the `aof work promote-finding`
refusal — and every one of them is green. At the gate a caller grep showed `routeFinding` and
`routeFindings` are imported by two test files and by nothing under `src/`. **Refs:**
`@finding-F-118-B`.

**Why.** The decider is pure BY CONTRACT: `work-loop-determinism` requires the module to import
nothing, and 71/ADR-009 §B made it a decider precisely so the ordered questions could be driven as
scenarios instead of asserted over prose. Purity and reachability pull in opposite directions here,
and nothing in the build loop makes that visible — the suite that drives the decider looks exactly
like a suite that drives a production path, because it is the same call.

**Lesson.** When a rule is stated at more than one layer, the accept record must say which layer
actually binds at run time, and a green decider suite is never the answer on its own. The cheap
check is a caller grep at the gate: a module with no `src/` importer is a STATEMENT of the rule, and
whatever does bind — here, the prose the agent reads and the verb's refusal — is what the evidence
row has to name. Skipping that grep is the F-78-A species one turn later: inferring a discharge from
a green control.

## R2 — the reflex the story removed was still available at its own gate, and the rule was applied instead

- **Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** the product owner
- **Raised by:** the gate itself, by putting its own findings to the five questions

**What happened.** This gate raised one Important finding whose remedy is a change to a `done`
milestone's fitness assertion. It reads checklist-shaped — "re-base the floor" — and under the four
ordered questions in force before this story it would have been question 2's top-level chore, minted
by reflex. It was put to the five questions instead: not cheaper than a driver, but needing criteria
a `.feature` must state, so it was handed to the operator. **The close created no chore.** **Refs:**
`@finding-F-118-A`.

**Why.** The recursion this story measured — twenty-three promoted chores in items 88–117, six of them
minted while reviewing another chore — was never a decision anyone took. It was the rule executing,
and a reviewer following the rule correctly produced it every time. The countermeasure therefore had
to be in the rule, not in reviewer discipline, which is exactly what the story argued and exactly the
trap the gate itself could still have fallen into while shipping the fix.

**Lesson.** A close that ships a routing rule must route its OWN findings through the shipped
version, and say in the accept decision which question each finding answered. That is the first
non-fabricable test the rule gets, and it costs one paragraph. More generally: when the loop mints a
driver whose whole remedy is smaller than the driver, that is evidence about the RULE and belongs in
a story, not another chore — the move the operator took at `aof:verify 101` that produced this story.

## R3 — a refusal is the one act safe to drive against the live stream, and doing so beat the fixture

- **Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** the product owner
- **Raised by:** the verification method, at the gate

**What happened.** The depth bound's verb-level gate is covered by the story's suite inside a temp
work-dir fixture. At the gate it was ALSO driven against this repository's real
`wiki/work` — `aof work promote-finding 88 …`, where 88 is a real top-level chore and a passing verb
would have written a real folder into the stream. It refused with exit 1, and the work-dir listing
and `git status -- wiki/work` hashed identically before and after.

**Why.** The fixture proves the refusal fires over a stream the test built. What it cannot prove is
that the shipped verb, resolving a real ref through the real `listItems`, reaches the guard before
anything writes — and the guard's whole design point is that it decides BEFORE the idempotence scan.
Reading the source establishes the order; running it against the live stream establishes that the
order holds on the bytes that shipped.

**Lesson.** A guard whose success condition is "nothing happened" is cheap to verify at the source:
hash the tree, run it, hash again. Reserve this for acts that refuse — a positive path must stay in a
fixture — and take the exit code unpiped, because a `| grep` reports grep's status and reads as a
pass.

## Not recorded, deliberately

- **The observability snapshot is dark for this story too** — `aof work observe 118 --write` reports
  2 runs, 51m53s wall-clock, **0 agent runs across 0 sessions** and both runs with no declared phase.
  That is the standing gap story 102 recorded as `@finding-F-102-D` and 78's `OUTCOME.md` still
  carries open; recording it a second time under a different item would restate rather than distil.
- **The supersession of `71/01/tasks/00`'s "four ordered questions"** went exactly as the discipline
  prescribes — stated in the accepting item's own contract, the delivered `.feature` untouched, `git
  status` over milestone 71 empty. A process working as designed is not a lesson.
