---
type: story
number: 02
slug: cache-economics
title: "Cache economics per phase — the ratio that says whether any of this worked"
parent: 70
status: done
owner: product-owner
created: 2026-08-21
updated: 2026-08-22
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 02 · Cache economics per phase — the ratio that says whether any of this worked

## User story

As whoever has to decide whether this milestone paid for itself,
I want `cacheRead ÷ cacheCreate` reported per phase from the run record, against a stated target,
so that "the prefix is being shared" is a **measurement** rather than a belief — and a prefix that
silently stops being shared is visible the week it happens, not the quarter it is noticed.

The rule this operationalises is the one the research states plainly: *if creation stays high turn
after turn, something is changing in your prefix.* That is the only signal that distinguishes a
working cache flag from an inert one, and 70/01's flag is exactly the kind that fails silently.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [x] `tasks/00_ratio-per-phase.feature` — the ratio is derived from `spend.tokens` and grouped by the phase the loop declared, with runs that carry no spend reported as unmeasured rather than as zero
- [x] `tasks/01_target-and-verdict.feature` — a stated target turns the ratio into a met/missed verdict per phase, and an absent target reports the ratio without inventing one

## Notes

- **Fully independent — it starts with 70/00 and 70/01.** Its subject, `src/work-observe.mjs`, has
  **zero dependencies** and is the self-contained leaf 68 already proved partitionable by region.
- **Read-only over 68's record.** Milestone 68 already landed the four mutually-exclusive token
  buckets including `cacheRead` and `cacheCreate`, writer-enforced. This story adds **no key** to
  `src/run-store.mjs` (17 `src/` dependents) and writes no record — it reads what 68 made true.
- **Phase comes from `brief.loop.phase`**, 53's declaration, per 68/ADR-002's single-authority
  ruling. This story mints no rival phase and adds no column.
- **Absence must stay honest.** A run with no `spend` is *unmeasured*; reporting it as a 0.0 ratio
  would make an un-instrumented run look like a cache failure and would corrupt the very
  before/after this milestone is judged by.
