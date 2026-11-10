---
type: story
doc: retrospective
number: 03
slug: memory-reports-effectiveness-and-health
parent: 153
title: "Retrospective — memory reports effectiveness and health"
created: 2026-10-11
updated: 2026-10-11
promotionFrom: 1
---
# 153/03 · Retrospective

These are story-level lessons. The milestone's lessons are in `../../RETROSPECTIVE.md`. Findings are referenced, not restated (`../../VERIFICATION.md`).

## R1 — A policy question goes to the operator with its measured yield on the real stream

- **Kind:** misunderstanding · **Area:** contract · **Stage:** refine · **Owner:** product-owner · **Raised by:** developer (153/03 build) · **Promoted to:** none

**What happened.** Q1 asked at how many later accepted milestones an unpromoted lesson starts warning. The operator chose 5 from the example map. On the real stream that default produces 738 `memory-lesson-unpromoted-aged` warnings. Every legacy lesson has no `Promoted to` field, so it counts as unpromoted. Acceptance age is also read from `updated`, which ties milestones accepted on the same day.

**Why.** The question showed boundary examples (quiet at 4, warns at 5) but never what the choice would do to the stream that exists.

**Lesson.** When a refine asks the operator for a threshold or other policy, run the candidate values over the live stream first. Put the counts beside the options. An answer chosen without its yield commits the operator to a result they never saw.

**Refs:** `../../VERIFICATION.md` F-06; `EXAMPLES.md` Q1.
