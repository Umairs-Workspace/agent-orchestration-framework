---
type: story
number: 03
slug: architecture-slice
title: "A story reads its slice — the ADRs it declares, and a budget that binds"
parent: 70
status: done
owner: product-owner
created: 2026-08-21
updated: 2026-08-24
depends: [70/00]
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 03 · A story reads its slice — the ADRs it declares, and a budget that binds

## User story

As a story being built against a 3,975-line `ARCHITECTURE.md`,
I want to declare the ADRs that bind me and be handed **those**, plus a line budget that is refused
at accept rather than warned about forever,
so that a phase stops re-reading a document that did not change between reads — in milestone 52 the
invariant part alone was re-read at all 30 phase boots, ≈**1.37 M input tokens** for two files —
and so the document stops growing past the budget nothing enforces.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [ ] `tasks/00_adrs-declared.feature` — `adrs:` becomes an optional story frontmatter key whose absence is benign, validated like the closed keys around it
- [ ] `tasks/01_adr-block-addressable.feature` — a pure extractor returns one `## ADR-NNN` block by id from the single `ARCHITECTURE.md`, and the brief carries the declared slices within 70/00's ceiling
- [ ] `tasks/02_budget-binds-at-accept.feature` — an item being accepted must be within its own artifact budgets; the stream-wide sweep stays `warn` and nothing already `done` is re-litigated

## Notes

- **The SPEC's mechanism was refused; its outcome ships.** The SPEC asks to "split `ARCHITECTURE.md`
  per ADR". ADR-006 refuses that: the file is pinned by **four** independent reader surfaces — the
  artifact manifest (`work-artifacts.mjs`, 5 `src/` dependents), the register's frozen file set
  (`declared-id.mjs` — *the fitness register lives in this file*), the controls checker, and
  memory's ADR indexing. The stated intent, *a story reads its slice*, is delivered through the
  brief instead. FF-7008 keeps the file one artifact.
- **`adrs:` does not exist yet.** The SPEC assumes it does; across **201** `STORY.md` files, zero
  carry it. This story **introduces** it, exactly as `depends:` was introduced — optional, additive,
  absence benign (absent ⇒ the milestone's register only, i.e. today's behaviour).
- **The budget cannot bind retroactively.** 15 milestones already exceed 700 lines (worst: 3,975).
  Failing the sweep turns 15 `done` milestones red at once — chore 64's exact pathology, and
  milestone 55's frozen-set mechanism does not exist in `src/**` yet. ADR-007 binds it at the
  accepting item's own gate instead.
- **Sequenced behind 70/00**, whose compiler this story adds a section to.
