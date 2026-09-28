---
type: story
doc: retrospective
number: 10
parent: 131
slug: answer-by-replying-in-discord
title: "Retrospective — answer by replying in Discord"
created: 2026-09-25
updated: 2026-09-25
---
# 131/10 · Retrospective

These are the lessons from delivering and accepting the story. There is one `R<n>` per lesson.
Findings are referenced here, never restated; they live in the milestone's `VERIFICATION.md`.

## R1 — A new module in a swept family lists the sweep's control

- **Kind:** near-miss · **Area:** architecture · **Stage:** refine · **Owner:** architect · **Raised by:** 10's build

`src/notify/ask-messages.mjs` reads its own index records inside `src/notify/`. FF-13106's read leg
allowed only `secret.mjs` to read a file there, so it went red. FF-11901 caught a hand-rolled import
regex in the new arch file. Neither control's file was in 10's `files:`; both were amended in the
build and added afterwards.

**Why.** Refine listed the modules the story writes, not the fitness functions that sweep the
directories those modules land in.

**Lesson.** A story that adds a module to a family some control sweeps (`src/notify/**`,
`src/discord/**`, the arch files) names that control's test file in `files:` at refine, with the
expected amendment.

**Refs:** STATE `(continue 131/10)`, VERIFICATION FF-13106's register row.

## R2 — ADR text that no contract carries is found at review

- **Kind:** near-miss · **Area:** planning · **Stage:** review · **Owner:** product-owner · **Raised by:** 10's review close

ADR-007 §7 says `messaging status` reports each channel's allowlist size. 09 predates `allow`, and
10's contract never carried the line, so the build shipped without it. Review fixed it.

**Lesson.** When an ADR serves several stories, refine walks each numbered clause to the task that
carries it, and names the clauses no task carries.

**Refs:** STATE `(continue 131/10)` review close.
