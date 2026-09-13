---
type: story
number: 05
slug: brief-carries-the-contract
title: "A brief that carries what the phase must satisfy"
parent: 70
status: done
owner: product-owner
created: 2026-08-22
updated: 2026-08-23
depends: [70/00]
adrs: [ADR-002, ADR-003, ADR-009]
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 05 · A brief that carries what the phase must satisfy

## User story

As a phase handed a brief instead of a tree,
I want that brief to contain the acceptance criteria I must satisfy and the architecture that binds
me,
so that the budget buys context rather than a notice saying the context was dropped — measured on
this milestone's own five stories, a build brief today carries the story description **alone** and a
verify brief carries **244 characters**: an item ref and the truncation notice.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [x] `tasks/00_the-contract-reaches-the-phase.feature` — the acceptance criteria and the binding
      architecture reach the phase, condensed to fit rather than dropped, and a condensed section
      says so and says where the rest is (ADR-009 §2, §6).
- [x] `tasks/01_the-budget-is-spent.feature` — one miss no longer cascades, sacrifice runs
      bottom-up, and the compiler is handed addressed extracts instead of whole documents — at the
      unchanged ceiling (ADR-009 §1, §3, §4).
- [x] `tasks/02_pinned-against-the-real-stream.feature` — the brief is proven against this repo's
      own `wiki/work/`, at whatever size it has grown to: the guard whose absence let F-11 through
      three story gates.

## Notes

**Measured 2026-08-22 at the milestone gate**, through the real reader (`compileBriefForItem`) on
this milestone's own five stories — not a fixture:

| phase | sections retained | sections dropped |
|---|---|---|
| `refine` | `item`, `story` | `objective`, `tasks`, `architecture`/`fitness`, `dependencies` |
| `continue` | `item`, `story` | `tasks`, `architecture`/`fitness` |
| `verify` | `item` — **244 chars** | `tasks`, `architecture`/`fitness` |

The same shape holds for all five stories. Briefs land at 3,119–3,736 chars against an 8,000-char
ceiling, so **less than half the budget is spent** while the contract is dropped.

**Two independent causes, both in `assemble` (`src/phase-brief.mjs`):**

1. **The task contracts do not fit at all.** They measure 7,115–12,311 chars against the 8,000-char
   ceiling. A section is retained whole or dropped whole — there is no truncation *within* a
   section — so the acceptance criteria can never appear.
2. **Packing stops at the first miss.** `lowerPriorityDropped` makes every subsequent section drop
   regardless of its size. 70/03's declared ADR slice is 5,306 chars and is evicted with roughly
   4,400 chars of budget unused.

**Both the ceiling and the drop-whole policy are ADR-003**, so changing either is an architecture
decision rather than a diff. The realistic options — a larger ceiling, truncation within a section,
a per-section budget, or summarising the contract rather than embedding it — are refine's to weigh.

**A THIRD cause, measured at refine (2026-08-22) and larger than either of the two above.** The
sections are **whole documents, not extracts**: `compileBriefForItem` passes `objective: spec` — the
entire `SPEC.md`, **9,514 chars** — and `story`, the entire `STORY.md` including frontmatter and
scaffold HTML comments. A 9,514-char section can never fit under an 8,000-char ceiling, and at
priority three it takes `tasks`, `fitness` and `dependencies` down with it through cause 2. That is
why the `refine` row above reads `item, story` for **every** story in the milestone — one
un-addressed document poisons the four sections beneath it. Addressed to its `## Objective` block
the same section measures **2,638**.

**Weighed and decided at refine: [ARCHITECTURE.md](../../ARCHITECTURE.md) ADR-009** — the ceiling
stands, the drop-whole policy does not. Every section declares a condenser (a task contract set
condenses to its scenario headlines at **13%** — 12,310 → 1,555) and is offered condensed before it
is sacrificed; sacrifice runs strictly bottom-up so one miss never cascades; the compiler is handed
addressed extracts. At the unchanged ceiling a `continue` brief for 70/00 then measures
`item ~50 + story 2,294 + tasks 1,555 + fitness 2,845 ≈ 6,800` — the whole contract, inside budget.

**Why nothing caught this.** Every `@executable` scenario in 70/00 and 70/03 passes, on fixtures
sized to fit. Nothing ever compiled a brief for a real item under `wiki/work/` and looked at it.
Whatever this story delivers should be pinned against the **real stream**, not a fixture — that is
the guard whose absence let the defect through three story gates.

**70/03 is inert until this lands.** Its declared-ADR slice reaches no brief on this repo's own
data; recorded as the first Gap in `m70/03`'s `OUTCOME.md` and as `m70/F-11`.

**Sequenced behind 70/00**, whose compiler this story changes.
