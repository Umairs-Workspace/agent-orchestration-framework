---
type: story
doc: retrospective
number: 07
parent: 131
slug: the-live-run
title: "Retrospective — the live run"
created: 2026-09-27
updated: 2026-09-27
---
# 131/07 · Retrospective

These are the lessons from delivering and accepting the story. There is one `R<n>` per lesson.
Findings are referenced here, never restated; they live in the milestone's `VERIFICATION.md`.

## R1 — The live run found what twelve green stories could not

- **Kind:** insight · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** the live run

Every story of 131 was accepted on green suites before 07 ran. The live run still found a high
defect (F-131-17, a resumed session killed by its own redrawn sentinel), a broken view (F-131-11),
three concurrency or supervisor faults outside 131 (F-131-12, F-131-18, F-131-19), and two gaps
in the ask's form (F-131-13, F-131-15). None of them is reachable by a fake PTY or a fixture store.

**Lesson.** A milestone whose behaviour crosses a real TUI, a real gateway and real lanes schedules
its live run early, before the last stories, and budgets for what it finds, not as a closing formality.

**Refs:** VERIFICATION `### 131/07`, F-131-11…F-131-19.

## R2 — The operator's answers follow the easiest path, so the contract should not fix the refs

- **Kind:** process · **Area:** product · **Stage:** verify · **Owner:** product-owner · **Raised by:** the live run

The contract tied each answer path to a named story: CLI for 03/00, board for 03/01, Discord for
03/03. The operator answered almost everything by Discord reply, because the question was there. The
CLI and board legs landed on other asks, and one needed an extra fixture.

**Lesson.** A live-run contract names the paths it must see and asks for them on whatever asks come,
not on fixed refs. The operator's natural choice is data, and the procedure should flow around it.

**Refs:** VERIFICATION `### 131/07`, "The legs ran on different refs".

## R3 — Test the ask's form on a delegation, not only on an answer

- **Kind:** near-miss · **Area:** product · **Stage:** verify · **Owner:** product-owner · **Raised by:** the operator

`I would pick: none` was agreed to rather than answered, and `Proceed with best judgement` produced
the same question again. The form of the ask (131/01) was reviewed against answers, never against
an operator who delegates or agrees.

**Lesson.** The producer paragraph's cases include "the operator agrees with the pick" and "the
operator delegates", and each has a defined next step.

**Refs:** F-131-13, F-131-15.
