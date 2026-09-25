---
type: story
doc: retrospective
number: 03
slug: the-fleet-sees-and-stops-it
parent: 130
title: "Retrospective — the fleet sees and stops it"
created: 2026-09-24
updated: 2026-09-24
---
# 130/03 · Retrospective

Story-level lessons; the milestone's are in `../../RETROSPECTIVE.md`.

## R1 — A story that hoists a copy must declare every gate that measured the copy

- **Kind:** process · **Area:** refine · **Stage:** build · **Owner:** architect · **Raised by:** 130/03 build

**What happened.** TECH_DEBT item 44's ledger entry named three detectors that required the assign
route's copied guard; the hoist found a fourth (`acd-fleet-assign-targets-item-workspace`), plus five
legitimately-moved pins, and widened `files:` by all of them mid-build.

**Lesson.** Before declaring a hoist's write set, grep the controls for the copied code's anchors — the
ledger names the detectors its author knew, not the census of what measures the copy.

## R2 — A design-gap found in review is ratified in contract, not left for the next reader

- **Kind:** defect · **Area:** design · **Stage:** review · **Owner:** product-owner · **Raised by:** 130/03 QA

**What happened.** The first rung memory never lowered and never expired, so a cancelled-then-resumed
loop read `cancelling` with no button for the page's life. The PO ruled it keyed to the drive
(`{ rung, runId }`) and the fix landed in the same story.

**Lesson.** "Never lowers" on client-held state needs a stated reset event; a `--resume` minting a new
drive is that event here, and an ADR that says "never expires" without one is describing a leak.
