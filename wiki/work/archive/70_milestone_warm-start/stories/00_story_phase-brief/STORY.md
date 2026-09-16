---
type: story
number: 00
slug: phase-brief
title: "The phase brief — a spawn is handed 2,000 tokens instead of a tree"
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
# 00 · The phase brief — a spawn is handed 2,000 tokens instead of a tree

## User story

As the loop that spawns a phase,
I want the session handed a compiled, bounded brief **by value** — what this item is, what it must
satisfy, and what it must not break — instead of a bare `/aof:continue <ref>` and a repository,
so that the phase starts from the extraction refine already performed and then discarded, rather
than spending 927k cache-creation tokens rediscovering it.

The benefit is not only the money. A 100-line window resolves **18.0%** of SWE-bench Lite against
**12.7%** for the full file, and ~300 focused tokens beat ~113k of full history. A smaller brief is
expected to produce *better* work, not merely cheaper work — and this story is what makes that
claim testable at all.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [x] `tasks/00_compile-the-brief.feature` — a pure compiler turns an item's already-read documents into one `brief.context`, with a declared section set and no I/O of its own
- [x] `tasks/01_bounded-and-truncated.feature` — the ceiling is enforced inside the compiler; an over-ceiling brief truncates by section priority and says so, and never returns empty
- [x] `tasks/02_passed-at-both-seams.feature` — the local drive and the mesh worker both hand the compiled brief to the driver by value, on the `brief` bag that already exists

## Notes

- **This story is the milestone's spine.** 70/03 adds a section to its compiler and 70/04 reuses it
  as a fix payload; both are sequenced behind it.
- **It extends an existing surface.** The driver's first parameter is already named `brief`
  (`src/agent-session-driver.mjs:691`) and a `brief` bag already carries 53's loop declaration.
  ADR-001 rules that this story widens that bag and mints no rival payload — there is no new
  "context object" to invent.
- **The compiler's home is forced, not chosen.** `test/arch/acd-session-driver-single-home.test.mjs`
  freezes the driver's export set at exactly seventeen, so the compiler cannot live there. It goes
  in a pure leaf, `src/phase-brief.mjs`, copying `otel-attribution.mjs`'s shape (ADR-002).
- **Declared overlap with 70/01.** Both edit `src/commands/drive.mjs` — this story the `command`
  const, 70/01 the `driverOptions` object. Whichever lands second rebases rather than re-derives.
