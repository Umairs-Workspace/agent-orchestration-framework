---
type: story
number: 04
slug: warm-fix-loop
title: "The fix loop resumes the build instead of re-ingesting it"
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
# 04 · The fix loop resumes the build instead of re-ingesting it

## User story

As the loop applying a review's findings,
I want the findings appended to the **build session that wrote the code** rather than handed to a
cold fixer,
so that the largest single saving available is actually taken — a resumed session re-ingests
**nothing**, where a fresh spawn pays the full cache-creation cost to rediscover the tree it is
about to edit.

This is the delta m52's signature makes expensive: **13 delta-application runs against 5 authoring
runs**. Twelve of those thirteen currently start cold.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [ ] `tasks/00_fix-resumes-the-build.feature` — a fix respawn resolves the build run's recorded session id and resumes it, carrying the findings as its message; an unresolvable id degrades to a cold spawn rather than failing the fix
- [ ] `tasks/01_review-stays-cold.feature` — a review phase resolves no resume target, whatever the item's run history holds

## Notes

- **Both halves already exist and have never been connected.** The driver already accepts
  `options.resumeSessionId` and appends `["--resume", id]` (`src/agent-session-driver.mjs:653`, built
  for m42's terminal re-attach), and 68/01 made the session id a **persisted fact** on the run record
  (`recordSessionId`). This story is the join, not new machinery.
- **The reviewer is deliberately NOT warmed** — and this is the story where that discipline is
  enforced rather than merely documented. Cognition's measured result is that code review *"works
  best when the coding and review agents do not share any context beforehand"*. SPEC and STATE both
  record it as out-of-scope precisely because it is the obvious-looking move. FF-7007 makes the
  distinction structural: it is derived from the phase, never left to a caller's discretion.
- **Degrading is a requirement, not a nicety.** A resume target that no longer resolves (a pruned
  transcript, a run from another machine) must fall back to a cold spawn with a brief. A fix that
  refuses to run because it could not be warmed is strictly worse than a fix that runs cold.
- **Sequenced behind 70/00** — the fix payload is a brief, compiled by the same bounded compiler.
- **No cap and no round limit** ride along (ADR-008); milestone 71 owns review-round discipline.
