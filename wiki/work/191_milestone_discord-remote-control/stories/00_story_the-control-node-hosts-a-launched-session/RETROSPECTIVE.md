---
type: story
doc: retrospective
number: 00
parent: 191
slug: the-control-node-hosts-a-launched-session
title: "Retrospective — the control node hosts a launched session"
created: 2026-11-12
updated: 2026-11-12
promotionFrom: 1
---
# 191/00 · Retrospective

These are the lessons from delivering and accepting the story, one `R<n>` per lesson. Findings are referenced here, never restated: they live in the milestone's `VERIFICATION.md`.

## R1 — A guard built for the worker was handed to the control without reading its answer there

- **Kind:** near-miss · **Area:** architecture · **Stage:** refine · **Owner:** architect · **Raised by:** 191/00 review · **Promoted to:** none

**What happened.** ADR-001 §1 gave the control's handler the worker's `workerHasRepo` and
`meshCheckoutPath`, and §3 made a relay URL the condition for building a handler at all. The
contract's fixture seeds the published marker and a relay, so every scenario is green. On the
laptop the milestone is for, neither holds, and a start for the control's own node refuses. The
build's review caught it by reading the two seams at source and the laptop's global config.

**Why.** Refine checked that the factory could be reused, and did not ask what its guard answers
for a project the control serves from a registered checkout. The example map held no row for "the
machine as it is today", so the fixture's preconditions were never compared with the real ones.

**Lesson.** A refine that reuses a guard written for another role runs that guard against the
target machine's real state before the contract locks. The example map carries one row for the
operator's machine as it is configured today, and a precondition the fixture has to seed is named
as an assumption or scoped as work.

**Refs:** 191/F-03 · ADR-001 §1, §3 · STATE, 191/00 review (2026-11-12)

## R2 — A continue run reported done with the story's status and task boxes untouched

- **Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** the loop, cycle 2 · **Promoted to:** none

**What happened.** Run `20261112T112500688Z-0000` closed `done` while the story still read
`in-progress` and its three task boxes were unticked. The loop sent the story back, and run
`20261112T124150064Z-0001` re-verified code that had not changed before it moved the status.

**Why.** The run recorded its own completion before it recorded the item's. The run record and the
story record are written by different steps, and nothing in the first run compared them.

**Lesson.** A continue run ticks the tasks and moves the story's status first, then reports done.
Its last check is that the story reads `in-review`.

**Refs:** STATE, 191/00 continue, cycle 2 (2026-11-12) · runs `…112500688Z-0000`, `…124150064Z-0001`
