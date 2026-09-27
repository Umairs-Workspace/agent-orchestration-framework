---
type: story
doc: retrospective
number: 11
parent: 131
slug: slash-commands
title: "Retrospective — slash commands"
created: 2026-09-25
updated: 2026-09-25
---
# 131/11 · Retrospective

These are the lessons from delivering and accepting the story. There is one `R<n>` per lesson.
Findings are referenced here, never restated; they live in the milestone's `VERIFICATION.md`.

## R1 — A verb that mirrors a sibling takes every one of the sibling's refusals

- **Kind:** defect · **Area:** architecture · **Stage:** review · **Owner:** architect · **Raised by:** 11's review close (Important)

`handOffLoop` was built beside 130's `stopLoop` and read the same declaration, but had no
`not-local` check. A declaration whose latest run names another node would have been handed to
this node's supervisor and relaunched here. Review added `loop-hand-off-not-local`.

**Why.** ADR-009 §6 listed three refusals from the hand-off's own logic. The sibling's refusals
were not walked, and `not-local` is 130/ADR-006 §1's.

**Lesson.** When a new verb acts on the same record as a sibling verb, its ADR lists the sibling's
refusals one by one and rules each in or out.

**Refs:** STATE `(continue 131/11)` review close.

## R2 — Additive flags reach delivered pins in other milestones

- **Kind:** estimate · **Area:** planning · **Stage:** refine · **Owner:** architect · **Raised by:** 11's build

`handOff` touched pins in 126 (FF-12602), 130 (FF-13003, FF-13001) and 131 (FF-13108), plus the
`work:loop` property and flag counts in `loop-command-probe` and `acd-loop-level-l3-gated`. None was
in `files:`. Each amendment is small, but together they widened the story's surface by six files.

**Lesson.** A new flag on `work:loop` greps the tree for the command's pinned property list and
flag count at refine; those pins are the flag's real footprint.

**Refs:** STATE `(continue 131/11)`.
