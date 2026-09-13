---
type: milestone
number: 54
slug: verification-loop
title: "Verification as a feedback loop — a bounded grader, not a coarse stage"
status: done
owner: product-owner
created: 2026-08-13
updated: 2026-08-23
depends: [53]
origin: [../../planning/PRD-acd-loop-engineering.md, ../../planning/PRD-graph-engineering.md]
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context
  (ARCHITECTURE / DESIGN / RESEARCH / UAT live in this folder too, conditionally).
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# 54 · Verification as a feedback loop

## Objective

aof already has the rubric and the feedback path: `@executable` scenarios plus fitness functions say
what "correct" means, and verify's findings route back to continue. What it lacks is the *loop shape*.
Verification runs as a **coarse stage** — a pass/fail verdict handed back at a boundary — rather than a
grader that re-drives the maker with structured feedback under a declared bound.

**This milestone reframes the continue→verify boundary as a bounded grader loop.** A failed rubric
emits structured feedback — which scenario, which fitness function, the delta — that re-drives the
maker for a bounded number of cycles rather than returning a verdict and a paragraph. Deterministic
grading runs before any model grading, because a validator that can answer should never be paid for
with a model turn. On cap-exhaustion the loop **stops and flags**, with the accumulated feedback as
the record of what it could not close — a stalled grader that keeps trying is worse than one that
stops and says so.

The bound itself is deliberately not this milestone's to choose: the cap belongs to the
loop-performance arc, and the *evidence* that more iterations stop helping past a point is the
reward-overoptimisation result this arc's PRD records. This milestone enforces a bound; it does not
invent its value.

## Scope

In scope:
- **Structured rubric feedback** — a machine-readable failure record (which scenario, which fitness
  function, the observed delta) rather than prose handed back at a stage boundary.
- **The bounded grader cycle** — that feedback re-drives the maker under an enforced cap, in code,
  through 53's shell rather than as a prompt instruction.
- **Deterministic before model** — `validate` and the fitness functions grade before any review turn is
  spent.
- **Stop-and-flag on exhaustion** — the loop terminates with the accumulated feedback as the record and
  the item surfaced, never silently retried or silently accepted.

Out of scope:
- **Whether the rubric is honest.** "Did the scenario move to fit the code" is the counter-metric
  question and belongs to 57; this milestone tightens the loop around the rubric it is given.
- **The cap's value** and the token economics of retrying — `PRD-acd-loop-performance.md`.
- **Auditing the gates themselves** — 59.
- **Human acceptance (`@uat`)** — unchanged; a genuine human gate still pauses and surfaces.
- **A viewable, committed record of loop execution, and a human signature on it** — **78**
  (`loop-execution-record`). This milestone's "record" is the grader's accumulated feedback, not a
  document; the artefact an operator reads and signs is 78's, and it reads `brief.loop` from 53
  rather than anything this milestone produces.

## Stories

<!-- Broken down 2026-08-22 (`aof:refine 54`). The partition is graph-derived against a graph built
     fresh that day — see ARCHITECTURE.md § Grounding and § Story partition. Its defining property:
     no two stories edit the same file except one SEQUENCED pair (54/02 → 54/03), and `src/work.mjs`
     (256 dependents) is edited by NOBODY — as are `src/run-store.mjs`,
     `src/effects/run-transitions.mjs`, `src/work-doctor-controls.mjs`, `src/board-ui.mjs`, `ui/`
     and `src/bundle/commands/**`. -->

- [x] `00_story_the-grade-record` — the frozen vocabularies, the verdict rules and the evidence
  floor, as a pure leaf with no command and no loop. Green is positive evidence; an exit code is
  none of it. *(fully independent)*
- [x] `01_story_the-declared-rubric` — the rubric declared as an argv in its own `work.rubric` home,
  spawned once, bounded, with a read-only bare face. An unconfigured repo loops exactly as today.
  *(depends 00 — and the only story in the milestone that registers)*
- [x] `02_story_fitness-in-the-gate` — the SPEC's missing half: the fitness lane grades before a
  review turn, on a four-rung cost ladder where each gate short-circuits the ones after it.
  *(fully independent — needs no runner)*
- [x] `03_story_feedback-rides-the-redrive` — the findings stop being dropped in the three places
  they are dropped today, and cap-exhaustion carries the accumulated record instead of an empty
  list. *(depends 01, 02)*
- [x] `04_story_scenario-traceability` — the `@executable` → case join `validate` has announced since
  m15, filled outside the god-node, declared rather than inferred, advisory at `warn`.
  *(fully independent)*

**Sequencing.** **54/00, 54/02 and 54/04 start together** — three disjoint seams (a new pure leaf, the
gate order, a new doctor lane), none of which reads another's code. **54/01 follows 54/00**, which
supplies the vocabularies it returns. **54/03 follows 54/01 and 54/02**, threading the record 01
produces through the gate 02 reorders. That is 3-wide, then 1, then 1.

**One live cross-milestone overlap is declared** rather than left to be discovered: 54/03 and **70/04**
both edit `src/commands/loop.mjs`, at different seams. **54 supplies the findings; 70 carries them.**
Whichever lands second rebases rather than re-derives — see ARCHITECTURE.md § Story partition.

**Three of this document's premises were checked at refine**, and are corrected in ARCHITECTURE.md
§ Corrections: the fitness half of the headline below is not wired at all; "deterministic grading
before model grading" is true today only of *malformed* rubrics; and the doctor gate 54/02 lands is a
deliberate behaviour change, whose blast radius on this tree was measured at **zero items**.

## Dependencies

- **53 (loop-artifact)** — the grader cycle is enforced by the code-owned shell. Declared gate order,
  the bounded retry and the stop-conditions are the shell's to run; this milestone supplies the rubric
  feedback it drives on. Without 53 the cap is once again a sentence in a prompt.
