---
type: story
doc: retrospective
number: 02
parent: 190
slug: a-gate-that-did-not-finish-resumes
title: "Retrospective — a gate that did not finish resumes"
created: 2026-11-10
updated: 2026-11-10
---
# 190/02 · Retrospective

These are the lessons from delivering and accepting the story, one `R<n>` per lesson. Findings are referenced here, never restated: they live in the milestone's `VERIFICATION.md`.

## R1 — A live-check plan is checked against the real CLI before it is written

- **Kind:** mistake · **Area:** process · **Stage:** refine · **Owner:** product-owner · **Raised by:** 190/02 live check at verify

PLAN.md's live check named `regression-gate --budget-min 1`, a flag that does not exist (the budget
is a tracked config key), and expected `git commit --allow-empty` to refuse a resume. It does not,
because the key is the content and not the commit.

**Lesson.** A plan's verification step is run, or at least checked against the command's usage and
the ADR's own key, when it is written, not first discovered at verify.

**Refs:** VERIFICATION 190/02 live resume check.

## R2 — A subset run must not overwrite whole-set state

- **Kind:** mistake · **Area:** code (testing) · **Stage:** verify · **Owner:** developer · **Raised by:** 190/02 live check at verify

The resume reused the sharded runner's timing write, which replaces the stored timings with the
files just run (F-04). `--shard` had the same behaviour, but a resume hits it every time.

**Lesson.** When a new caller reuses a writer built for whole runs, check what that writer
overwrites.

**Refs:** VERIFICATION F-04.
