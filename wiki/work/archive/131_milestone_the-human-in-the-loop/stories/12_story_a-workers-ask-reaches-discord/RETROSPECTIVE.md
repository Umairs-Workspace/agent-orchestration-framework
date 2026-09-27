---
type: story
doc: retrospective
number: 12
parent: 131
slug: a-workers-ask-reaches-discord
title: "Retrospective — a worker's ask reaches Discord"
created: 2026-09-25
updated: 2026-09-25
---
# 131/12 · Retrospective

These are the lessons from delivering and accepting the story. There is one `R<n>` per lesson.
Findings are referenced here, never restated; they live in the milestone's `VERIFICATION.md`.

## R1 — Line-pinned ratchets shape the code that touches them

- **Kind:** process · **Area:** architecture · **Stage:** build · **Owner:** architect · **Raised by:** 12's build

Three ratchets held rather than raised. `global-work-store.mjs` stood at 1,279 of 1,280 lines, so
the `ask` column is one `ALTER` line. FF-5810 cites `transitionAssignmentState` at
`assignment-transitions.mjs:272` in a shipped loop record, so the carriage was folded onto its
payload line instead of moving the export. FF-6909's self-check matched the park line's exact text,
and was rewritten to find the line by what it publishes.

**Why.** Each pin is sound alone. Together they decide the layout of new code: a key is added on an
existing line because a line number is cited elsewhere.

**Lesson.** A control that pins a line number or an exact line of text is replaced, when a story
touches it, by one that finds the line by what it does (as FF-6909's was). A refine that sees a
file within a line or two of its cap names the cap in the plan.

**Refs:** STATE `(continue 131/12)`.
