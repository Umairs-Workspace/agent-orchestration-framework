---
type: milestone
number: 66
slug: controls-that-run
title: "Controls That Run — a declared control resolves, executes, and has been seen red"
status: done
owner: product-owner
created: 2026-08-15
updated: 2026-08-16
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context
  (ARCHITECTURE / DESIGN / RESEARCH / UAT live in this folder too, conditionally).
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# 66 · Controls That Run — a declared control resolves, executes, and has been seen red

## Objective

ACD asks for controls it never checks are controls. A fitness function is declared in an
`ARCHITECTURE.md` table, a contract is authored as a `.feature`, a lesson is recorded in a
`RETROSPECTIVE.md` — and `aof work validate` reads none of them. It checks folder↔frontmatter, a
closed tag vocabulary and the `depends` graph, and that is the whole of it. So ACD cannot today
distinguish **a control that works from a control that merely exists**, and it has no path by which
a lesson becomes something that runs.

This is measured, not asserted. The evidence is in
[FINDING-acd-executable-gate.md](../../../planning/FINDING-acd-executable-gate.md), which investigated a
downstream milestone (`352`) and its stream. The load-bearing numbers:

- **Three vacuous guards shipped green in one story**, and the architect's own audit of five put
  **four of five "green for the wrong reason"** — the one failure mode a guard cannot self-report,
  because a wrongly-green control is indistinguishable from a working one in every summary line.
- **33 of 37** authored contract `.feature` files did not parse. The cure had been prescribed in a
  prior milestone's retrospective and called "one command". Nobody ran it, so that milestone shipped
  **38×** the defect density of the milestone the lesson was written about.
- A prior lesson was **recalled, cited by id, and marked "Honoured"** in the architecture document —
  then violated **inside the paragraph that cited it**. Recall is not a weak form of enforcement;
  against this class it is not a form of enforcement at all.
- **8 of 13** fitness functions authored ahead of their subject **changed on contact with a runner**
  (one grew +124%), because the staging convention parks them where no test glob can see them. The
  milestones following ACD's advice most closely are the ones hitting this — the failure correlates
  with compliance, which is the signature of a design hole rather than indiscipline.

**ACD does not need an executable layer.** It needs to treat a **control** as a resolvable citation
with three properties — **declared once**, **located where a runner can see it**, and **carrying a
recorded red observation** — all three checkable declaratively, at gates ACD already owns, without
ACD ever executing a project's tests. That reframe is what makes this milestone small.

An outsider can verify this milestone was met by asking: can I still land a fitness function that
nothing runs, a contract that no parser accepts, an id that collides with a sibling's, or an
assertion nobody has ever seen fail? After this, each of those is a refusal with a named finding.

## Scope

In scope:
- **A contract is parseable, or it is not a contract** — every authored `.feature` is structurally
  linted at `validate`, turning an existing line-scan into a parse.
- **A register entry declares itself in one machine-recognisable form**, so duplicate ids and
  dangling cross-file citations become checkable at all — generalising two checks ACD has already
  written (`duplicate-driver-number`, `loop-graph-dangling-endpoint`), each currently scoped to one
  register.
- **`VERIFICATION.md` gains a schema it has never had**, including a required *failing observation*
  per new assertion — the "seen red" primitive.
- **A declared fitness function must resolve to a path a runner can see**, closing the staging hole
  without ACD gaining a test runner.

Out of scope:
- **Running the project's tests.** ACD checks that a control exists where something else will run it
  and that someone has seen it fail. It never executes the suite. Every story below holds to this.
- **Mutation testing.** It would catch two of the four measured guard defects and miss the other two
  (a vacuous assertion is not a mutation of the code under test), at an order more cost, and ACD
  cannot drive a project's mutation tool. Argued and rejected in the finding, §8.
- **Fabricated red probes.** No declarative model can catch one. The milestone converts an invisible
  absence into a specific checkable claim in a document a reviewer reads — a smaller surface, not a
  closed one. Stated so it is not later mistaken for a promise.
- **Making the observability report gate anything.** Deliberately left alone: the measure→decide path
  already works through a human and produced item 65. Recorded as a decision rather than a gap.
- **The C0-control-character detector.** Cheap and red-probed, but it must stay narrow — ACD's own
  tree holds six *legitimate* control characters, so a blunt rule would be silenced within a week.
  Deferred until the declaration work lands, and tracked as a follow-on rather than absorbed here.

## Stories

<!-- Populated at the Break-down stage (refine), 2026-08-15. The partition below is REVISED from the
     one scaffolded with the finding; ARCHITECTURE.md `## Story partition` holds the reason and the
     graph-derived coupling behind each boundary. Every deliverable in `## Scope` still ships. -->

- [x] `00_story_contract-parses` — a `.feature` that does not parse is a refusal at `validate`,
      inside the acceptance horizon *(depends: nothing)*
- [x] `01_story_declaration-form` — one machine-recognisable declaration form, with one home, shared
      with the parsers memory already runs *(depends: nothing)*
- [x] `02_story_the-controls-lane` — `doctor` gains one lane carrying the register, verification and
      resolution checks, with a frozen eight-code envelope *(depends: 00, 01)*
- [x] `03_story_the-ask` — ACD ships the `VERIFICATION.md` schema and asks authors for the
      declaration form, the red probe, `pending` and unnumbered findings *(depends: nothing)*

**Why this differs from the partition scaffolded with the finding.** That one cut **by check**, and
three of its four checks land in one new module and one shared array (`CHECK_GROUPS`,
`src/work-doctor.mjs:411-426`). Three stories appending to one array is merge friction wearing an
independence claim — a cost story 65 measured directly (`65/STORY.md:69-74`: two stories partitioned
as independent both hammered one file, ×9 and ×8). The revision cuts **by seam** instead — a leaf
parser, a doctor lane, a bundle — so `02` is the single editor of the milestone's one shared edit
point, and its two `depends` edges are real source-side imports rather than sequencing preferences.

**Two waves, not four.** `00`, `01` and `03` start immediately and concurrently (disjoint file sets,
disjoint imports, three different seams); `02` joins when `00` and `01` land. The critical path is
`max(00, 01) → 02`.

## Dependencies

- **65 (concurrent-story-dispatch)** — done. This milestone's `depends` shape (`00` independent,
  `02`/`03` fanning out from `01`) is authored as **data** rather than italic prose, which is only
  readable because 65 made a story's `depends` real. It is therefore also the first honest exercise
  of 65's ready set, and discharging **F-65-A** — the deferred parallelism measurement — is a
  by-product of building this milestone rather than separate work.
