---
type: story
number: 00
slug: contract-parses
title: "Contract Parses"
parent: 66
depends: []
status: done
owner: product-owner
created: 2026-08-15
updated: 2026-08-16
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 00 · Contract Parses

## User story

As an author of a work item's acceptance criteria,
I want a `.feature` that does not parse to be refused at `aof work validate`,
so that the contract ACD asks me to write is an artifact something reads, rather than prose that is
only ever read by a human who already believes it.

<!-- The measured benefit, from `wiki/planning/FINDING-acd-executable-gate.md` §1b/§7 item 6: in the
     investigated downstream milestone **33 of 37** authored contract `.feature` files did not parse
     (189 wrapped step-continuation lines). The cure had been prescribed in a prior retrospective and
     called "one command"; nobody ran it, and that milestone shipped **38×** the defect density of
     the milestone the lesson was written about. ACD defines the contract artifact and has never
     parsed it. -->

## Tasks

- [x] `tasks/00_one-gherkin-parser.feature` — `src/feature-parse.mjs` becomes the one Gherkin reader
      in `src/`, gaining structural findings additively; `checkFeatureTags` becomes a thin caller and
      the god node gets shorter
- [x] `tasks/01_the-acceptance-horizon.feature` — one exported predicate decides whether an item's
      record is still editable, and therefore whether a check may gate on it
- [x] `tasks/02_a-contract-that-does-not-parse-is-refused.feature` — `aof work validate` reports a
      structural parse finding inside the horizon, and is silent on the records nobody may edit

## Notes

**Read `ARCHITECTURE.md` ADR-002 and ADR-003 §1 before building.** This story owns both, and ADR-002
(the acceptance horizon) is a milestone-wide rule that 66/02 imports — it is landed here because
66/00's gate is the first thing that cannot ship without it.

**The parser already exists, and so does the duplication.** `src/feature-parse.mjs` (56 lines, **1
dependent** — `src/commands/tasks.mjs` — and **0 dependencies**, per `aof graph impact`) says in its
own header that it *"mirrors the hand-rolled parse in `work.mjs`'s `checkFeatureTags` — the repo
deliberately hand-parses Gherkin rather than take a dependency"* (`src/feature-parse.mjs:1-4`). Two
parsers of one artifact, with the duplication ledgered in a comment. This story discharges it rather
than adding a third copy — the alternative ADR-003 names as *"the alternative most likely to be
reached for by accident: it is the smaller diff, and the third copy of one derivation."*

**The god-node touch is a net deletion.** `src/work.mjs` has **243 dependents** (graph, 2026-08-15).
`checkFeatureTags` (`:719-755`) is a 37-line line scanner; the tag rules stay where they are, the
scanning leaves for the leaf, and no signature moves — so all 243 dependents are unaffected. This is
the only story in milestone 66 that touches `src/work.mjs`.

**The horizon is not optional, and the numbers say why.** `aof work validate` has **no severity** and
exits 1 on any finding (`src/commands/validate.mjs:71`; envelope `{path, problem}`,
`src/work.mjs:793`). Measured over all **653** `.feature` files in `wiki/work`: **13 files carry 35
lines a strict parse rejects** — and **12 of the 13 belong to milestones whose status is `done`** (00,
04, 37, 38, 43, 49, 52). A delivered `.feature` is immutable — no edit, no annotation, no
`@superseded` tag — so a finding on those twelve is a permanent red no legal act can clear. The
thirteenth, `53/01/tasks/04_gate-order-and-cap.feature` (17 of the 35 lines), is under an
`in-progress` milestone: live, fixable, and exactly where a contract gate should bite. Run today this
story's gate reports **one file** and grandfathers twelve.

**One accepted contract is superseded, and it is recorded HERE.** `00/01/tasks/01_tag-vocabulary.feature`
pins `validate`'s treatment of a task feature as a tag-vocabulary check over a line scan. After this
story the same read is a parse. Every scenario that milestone delivered stays true on every file that
parses, and its feature file stays **byte-intact** — the new rule lives in this story's contract, the
pattern set by `wiki/work/65_story_concurrent-story-dispatch/tasks/00_story-depends-becomes-data.feature`.
Tests are a different matter: they are code, they track current behaviour, and they change.

**The horizon predicate lands in a NEW ZERO-IMPORT LEAF, `src/acceptance-horizon.mjs`** — not in
`src/work.mjs`, where the partition first put it. Measured reason: `src/work.mjs:13-16` imports
`node:path`, `node:os`, `node:fs/promises` and `node:fs`, and FF-6605 forbids the controls lane
reaching any of those. Story 66/02 must import this predicate, so homing it in the god node would
fail 66/02's own fitness function on day one. The leaf also takes `VALID_STATUS` (today a private
const at `src/work.mjs:49`), because leaving it behind gives the five lifecycle words a second copy —
the debt this milestone exists to close. ADR-002 §5's "exactly one implementation" then becomes a
fact of the module graph rather than of discipline, and the god-node touch is a net deletion in one
more place.

**Two things the builder should know, both measured at refine.** A hand-rolled strict parse is
sufficient and a Gherkin dependency is **contract-disqualified**: a ~60-line region machine produced
**0 findings on 649 of 665 files** across the whole accept-matrix and reproduced every measured
defect at its cited line, while `@cucumber/gherkin` throws with no partial-result mode — and
`tasks/00`'s contract requires a failing file to still return the scenarios it could recognise. And
the keyword match is **case-sensitive**: folding case takes the population from 16 files / 47 lines
to **67 files / 492 lines**, firing on ~18 live files instead of one.

**Expect test-fixture churn.** Eight suites build `.feature` fixtures whose default frontmatter is
`status: "done"` — headline `test/work-validate.test.mjs:105` (`writeStory`), with ~20 call sites.
The moment the horizon silences `done` items' features they assert against an empty findings array.
Cheap per site, but it is the largest mechanical chunk in the story and it will read as a regression
if it arrives unexpected.

**Fitness functions owned here** (ADR-007 §1 — each story lands its own, in `test/arch/`, registered
in a runner, green, with a red probe recorded in `VERIFICATION.md`): **FF-6601**
`test/arch/acd-feature-parser-single-home.test.mjs` — its scan must distinguish a **recogniser** (a
pattern tested against input) from a **renderer** (`src/commands/migrate-folder.mjs:571-580` emits
`Feature:`/`Scenario:`/`Given ` into a scaffold), or it reports three homes and is wrong about the
tree. **FF-6602** `test/arch/acd-acceptance-horizon-single-predicate.test.mjs` — its invariant is
*"no code path in `src/` opens an **existing** `.feature` for writing"*, with
`src/commands/migrate-folder.mjs:225-229` the single named create-only write; adding `{ flag: "wx" }`
there makes the claim true **at the call**, so the guard asserts it structurally instead of reasoning
about surrounding control flow.
