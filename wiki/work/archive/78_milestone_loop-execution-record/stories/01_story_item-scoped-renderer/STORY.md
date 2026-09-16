---
type: story
number: 01
slug: item-scoped-renderer
title: "The item-scoped renderer — the graph of what ran, in bytes a diff can hold still"
parent: 78
status: done
owner: product-owner
created: 2026-09-03
updated: 2026-09-03
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/78_milestone_loop-execution-record/ARCHITECTURE.md#ADR-003, wiki/work/78_milestone_loop-execution-record/ARCHITECTURE.md#ADR-004, wiki/work/78_milestone_loop-execution-record/ARCHITECTURE.md#ADR-005, wiki/work/78_milestone_loop-execution-record/ARCHITECTURE.md#ADR-006, src/commands/loops-graph.mjs, src/work-loops.mjs, test/arch/acd-loop-render-deterministic.test.mjs, test/arch/acd-loop-graph-kind-legible.test.mjs, scripts/test.mjs]
files: [src/loop-record-render.mjs, test/loop-record-render.test.mjs, test/arch/acd-loop-record-renderer-additive.test.mjs, test/arch/acd-loop-record-ceiling-legible.test.mjs, scripts/test.mjs]
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 01 · The item-scoped renderer — the graph of what ran, in bytes a diff can hold still

## User story

As an operator opening a work item's record in a pull request,
I want the loops that actually ran for that item drawn as a graph, with the execution facts and the
named gaps beneath it,
so that I can see what the machinery did on this item without running a command — and so that a change
to it shows up as a change to a picture in the diff.

## Why

`aof work loops graph` renders the same nine framework-wide nodes whatever item you are looking at
(`52/SPEC.md`, and `SPEC.md`'s opening). That is correct for the *declared* graph and useless as a
*per-item* answer: repeating the global picture under every item would be worse than not drawing one.

This story renders the graph **scoped to what ran** — the loops the projection found engaged, their
actuators and their reference owners — plus the two things a picture cannot carry: the execution facts
against the declaration, and the gaps named. It is pure: it takes the model 78/00 returns and gives
back bytes.

**Why a new renderer rather than a parameter on the old one.** `renderLoopGraph`'s bytes are frozen by
52/FF-5208 across ten structural-duplicate scenarios, and `SPEC.md` puts extending it out of scope.
Measured coupling (graph built 2026-09-03T16:13:42.918Z): `src/commands/loops-graph.mjs` has four
dependents and two imports — the cheapest module in the repository to leave alone, and the most
expensive to put a branch inside.

**Why the glyph table is imported and not copied (ADR-006).** `KIND_SHAPES` is already an export
(`src/commands/loops-graph.mjs:32`). Milestones 58 and 59 each added a node kind; a second hand-copied
table would have meant two places to find on each of those days, and the drift would show up as a
diagram silently drawing a watcher as a dangling reference. Importing a frozen export changes none of
its bytes.

## Tasks

- [x] `tasks/00_the-scoped-graph.feature` — the Mermaid graph of what ran, reusing 52's conventions
      and importing its glyph table.
- [x] `tasks/01_the-document-body.feature` — the execution table, the coverage line and the gap
      sections, and the byte-determinism that lets a diff mean something.

## Notes

**Determinism is this story's whole contract.** FF-7803 asserts byte-identity across separate
processes, and it can only assert that cheaply because this module never touches disk. Keeping the
renderer out of the command (78/02) is what buys that.

**The empty graph is a real rendering, not a blank.** At zero coverage — the state of every item in
this repository today (ADR-003) — the document still renders: a coverage line saying what was
measured, and the `declared-never-ran` gaps. A renderer that emitted nothing here would be
indistinguishable from one that had crashed.

**Markdown wrapping a fenced `mermaid` block**, so it renders in GitHub, in an editor preview and in
the board — the same reasoning story 79 records for the declared graph, and now shared with it by
ADR-010.
