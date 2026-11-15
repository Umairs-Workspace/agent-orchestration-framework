---
type: milestone
doc: retrospective
number: 191
slug: discord-remote-control
title: "Retrospective — Discord drives the work from a phone"
created: 2026-11-15
updated: 2026-11-15
promotionFrom: 1
---
# 191 · Retrospective

These are the lessons the milestone as a whole teaches, one `R<n>` per lesson. Each story's own lessons are in its folder (00, 01, 04, 08). Findings are referenced, never restated: they live in `VERIFICATION.md`.

## R1 — The outsider check found three blockers that every contract passed

- **Kind:** mistake · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** the outsider check · **Promoted to:** none

**What happened.** Every story was green, and the first live attempts still failed three times.
A start could not open on the single-node laptop (F-03), a launch kept two records (F-05), and a
start was refused for a published project (F-14). Each fixture seeded something the real machine
does not have: a published marker and a relay URL, a single writer, a pinned workspace id.

**Why.** The outsider check was planned as the milestone's last step. Until then, nothing ran the
stories against the machine they were for.

**Lesson.** A milestone whose acceptance is an outsider check on a real device runs a first live
attempt as soon as the first slice reaches the device, here after 00 and 01. The rest of the
stories are refined against what that attempt measured.

**Refs:** 191/F-03 · 191/F-05 · 191/F-14 · m191/00 R1 · m191/04 R1

## R2 — A new face put old loop defects in front of the operator

- **Kind:** near-miss · **Area:** process · **Stage:** refine · **Owner:** product-owner · **Raised by:** the outsider check · **Promoted to:** none

**What happened.** `/loop start` on a parentless story reported done and built nothing (F-13, open
since m65), and the supervisor relaunched a just-started loop (F-15, open since m129). Neither is
191's code. From a phone, both read as Discord being broken.

**Why.** Refine treated `work:loop` as a settled verb and did not recall its open findings before
exposing it to a new audience.

**Lesson.** When a milestone exposes an existing verb through a new face, refine recalls that verb's
open findings and decides, for each one, whether the face guards it, words around it, or names it
as a known gap in the guide.

**Refs:** 191/F-13 · 191/F-15 · m65/F-65-C · m129/F-61

## R3 — Declared write sets kept missing the core binding adapters

- **Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** architect · **Raised by:** 191/04 build, 191/05 continue, 191/04 task 03 · **Promoted to:** none

**What happened.** Three builds touched files their story's `files:` did not declare. Each time,
these were the core binding adapters under `packages/core/src/application/bindings/` that hand a
new collaborator to a factory package, plus once an audit digest.

**Why.** Refine lists the package module that changes, and not the binding that injects it.

**Lesson.** A story that gives a factory package a new collaborator lists that package's core
binding adapter in `files:`. When source the audit stamps changes, it also lists
`scripts/workspace-runtime-audit.json`.

**Refs:** 191 STATE (Feedback, 2026-11-12) · 191/04 task 03 evidence

## R4 — A fix checked by the suites it touched broke a bound held by another suite

- **Kind:** mistake · **Area:** process (testing) · **Stage:** verify · **Owner:** developer · **Raised by:** the runner gate (`gate.yml` run 43736866808) · **Promoted to:** none

**What happened.** F-14's fix added two comment lines to `packages/work-loop/src/commands/loop.mjs`.
Every suite the developer ran was green, but the shell's size bound, 2250 lines, lives in
`test/loop/loop-command-wave.test.mjs`, which no one ran. The whole-tree gate was red on that one
case.

**Why.** The developer chose suites by what they import and the story declares. A test that reads
a file's text, and does not import it, is invisible to that choice.

**Lesson.** A change to a file is checked against every test that names the file's path
(`grep -rl '<path>' test/`), as well as the tests that import it. A bounded file's growth is either
extracted or raised with a reason, and never left to the gate.

**Refs:** 191/04 task 03 · `e4ad00fe` · TECH_DEBT item 92
