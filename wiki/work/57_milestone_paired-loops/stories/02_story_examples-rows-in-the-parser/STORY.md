---
type: story
number: 02
slug: examples-rows-in-the-parser
title: "Examples rows in the parser — the 20% of acceptance criteria the counter cannot currently see"
parent: 57
status: done
owner: product-owner
created: 2026-08-27
updated: 2026-08-27
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 02 · Examples rows in the parser

## User story

As the counter-metric that has to notice when an acceptance criterion gets smaller,
I want the feature parser to report how many Examples rows each scenario carries,
so that deleting rows from a table stops being the one way to shrink a contract that nothing in this
repository can see.

Spike 56 measured the hole precisely. `parseFeature` (`src/feature-parse.mjs:90`) returns scenarios
as `{name, outline, lane, verification, line}` — **no Examples rows** — and `Examples:` is recognised
only as a structural header, with table lines consumed at `:137` as *carrying no step position* and
discarded. **1,044 of 5,194 scenarios in this tree (20%) are Outlines.** Deleting rows from an
Examples table therefore does not decrease the executable scenario count, which makes it the cheapest
way to shrink an acceptance criterion here — and it is precisely the QA-owned surface.

This story closes the hole and does nothing else. It is the narrowest change in the milestone and the
one with the widest blast radius if done carelessly: the parser's three production consumers include
`src/work.mjs`, which has 262 dependents.

## Tasks

- [x] `tasks/00_a-scenario-reports-its-rows.feature` — every scenario carries an ordered list of its Examples blocks with the data-row count, the caption and the line
- [x] `tasks/01_nothing-else-moves.feature` — the five existing scenario keys and the litmus fields are unchanged for every feature in the tree, and no consumer is edited

## Notes

- **Additive means additive, and it is asserted rather than trusted.** ADR-005 §2/§3. The five
  existing keys keep their names and values; `examples` is the only addition; and none of
  `src/work.mjs`, `src/commands/tasks.mjs` or `src/work-doctor-rubric.mjs` is touched by this
  milestone. `FF-5704` is the structural twin of task 01.
- **The row count excludes the column-header row.** A table's first row names the columns; it is not
  a case. Getting this wrong would make every Outline look one criterion richer than it is, which is
  the wrong direction for a ratchet to be wrong in.
- **An Outline with no Examples block yields an empty list, not null.** ADR-005 §1. One shape for the
  key means the consumer never branches on absence, and an Outline with no table is a real thing in
  this tree that the ratchet must be able to count as zero.
- **The table branch at `:137` keeps closing the free-text region exactly as it does now.** The
  litmus lane depends on that behaviour — a prose paragraph after an Examples table must still not be
  a finding. The row counter rides alongside the existing branch and changes no control flow.
- **`executableScenariosOf` is not edited here or anywhere in this milestone.** 57/03 imports it.
  ADR-005 §4: copying the definition of "an executable scenario" is how `ITEM_RE` came to exist in
  four places.
- **This story ships no consumer of the new key.** 57/03 is the consumer. Landing the parser first
  means the ratchet is built against a real shape rather than a planned one, and the two stories stay
  independent because the dependency is strictly one-way.
