---
type: story
doc: retrospective
number: 01
parent: 190
slug: impacted-narrows-on-what-it-knows
title: "Retrospective — impacted narrows on what it knows"
created: 2026-11-10
updated: 2026-11-10
---
# 190/01 · Retrospective

These are the lessons from delivering and accepting the story, one `R<n>` per lesson. Findings are referenced here, never restated: they live in the milestone's `VERIFICATION.md`.

## R1 — A narrowing claim is measured through the closure the selector walks

- **Kind:** mistake · **Area:** process (research) · **Stage:** refine · **Owner:** researcher · **Raised by:** 190/01 task 03 replay

RESEARCH's "median 8 suites" counted direct importers. ADR-003 §2 walks dependents transitively,
and through the composition root that is 1,119 of 1,269. The measurement answered a different
question from the one the design asked, so SPEC's headline outcome was planned on a number the
build could not reach (F-08).

**Lesson.** When a design's benefit rests on a measured figure, the measurement uses the design's
own rule (here the transitive walk), not a cheaper proxy.

**Refs:** VERIFICATION F-08, 190/01 task 03.

## R2 — "Is a suite" means "the runner can run it"

- **Kind:** mistake · **Area:** code (testing) · **Stage:** build · **Owner:** architect · **Raised by:** 190/01 build; 190/04 verify

ADR-003 §1 admitted `.test.mjs` under package roots, but this repo's per-file runner rejects native
`node:test` files. The build made selection require membership of the runner's whole suite. Verify
then found that whole suite hard-codes two suffixes, so a declared one is ignored (F-06), and that
the doctor counts files the runner never runs (F-05).

**Lesson.** One function answers "what is a suite", and the declaration, the selector and the
doctor all read it.

**Refs:** VERIFICATION F-05, F-06.
