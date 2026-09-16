---
type: story
number: 03
slug: progress-not-liveness
title: "The signal a heartbeat cannot give — a progress ledger with no model in it"
parent: 69
status: done
owner: product-owner
depends: [69/00]
schema: 1
created: 2026-08-21
updated: 2026-08-23
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 03 · The signal a heartbeat cannot give — a progress ledger with no model in it

## User story

As the framework paying for runs that are busy and getting nowhere,
I want an objective measure of whether an attempt is *making progress*, not merely whether it is
*alive*,
so that a run that has been editing the same file for four hours is reset or escalated rather than
heartbeating faithfully until its wall clock expires.

A heartbeat would have caught the eight-day zombie. It would **not** have caught the two 11h07m
burns, which were almost certainly heartbeating fine while looping. The worst recorded case,
`Build story 49/05`, ran **199 edits against 1 test run** — one file edited 70×, one command re-run
33×, 65 error-ish results, 593 turns, 9.43M cache-create tokens for 377k of output. Grinding is not
test-waiting. It is editing without checking, and it is invisible to every signal aof currently has.

Magentic-One's Progress Ledger is the shape — `maxStalls` → reset with a summary, `maxResets` →
escalate. What is deliberately **not** copied is its evaluator: theirs asks a model each round
whether progress is being made. This repo has direct evidence (Huang et al.; its own m52) that a
model asked whether progress is being made will find some.

## Tasks

- [x] `tasks/00_progress-is-sampled.feature` — an attempt's progress is sampled from deterministic signals only, and the sample is appended rather than rewritten
- [x] `tasks/01_stalls-reset-and-escalate.feature` — consecutive no-progress samples reset the attempt with a summary, and repeated resets escalate
- [x] `tasks/02_the-build-loop-stops-on-no-progress.feature` — the build loop's declared ceiling is this rule: two consecutive rounds with no reduction in the failing-scenario count

## Notes

- **The measurement already exists.** `laneChanges(worktreePath)` reads `git status --porcelain`
  inside the lane's own tree and is already in service for the lane sweep. This story reads it; it
  does not build a second one.
- **The ledger does not touch the run record.** Samples land in a `runs/<runId>.progress.ndjson`
  sibling. `readRuns` skips every entry that is not `*.json` — in both the flat branch and the
  node-partitioned branch — so the file is invisible to the god-node's reader by construction, and
  68/ADR-007's append-only discipline is preserved rather than re-argued. `src/run-store.mjs` has
  seventeen `src/` dependents; this milestone adds no key to it (FF-6908).
- **Failing-scenario count is a signal, not a judgement.** It is the number the build loop already
  drives to zero. Using its *derivative* as the bound is what lets the ceiling be a progress rule
  rather than an arbitrary N.
- **Fully independent.** A new pure leaf plus a file nothing else reads. No shared writer.
