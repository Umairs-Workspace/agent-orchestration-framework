---
type: story
doc: retrospective
number: 04
parent: 190
slug: an-existing-project-declares-its-test-layout
title: "Retrospective — an existing project declares its test layout"
created: 2026-11-10
updated: 2026-11-10
---
# 190/04 · Retrospective

These are the lessons from delivering and accepting the story, one `R<n>` per lesson. Findings are referenced here, never restated: they live in the milestone's `VERIFICATION.md`.

## R1 — A check that says `ok` is proved on a project unlike this one

- **Kind:** mistake · **Area:** code (testing) · **Stage:** verify · **Owner:** qa · **Raised by:** aof:verify 190 (F-05, F-06)

Every fixture in the first build shared this repo's runner shape, `.mjs` array suites. The first
live run on a `.test.ts` project got a doctor `ok` over a whole suite of zero (F-06). And on this
repo the warning's only repair was one the runner would reject (F-05).

**Lesson.** An adoption check is proved on at least one project whose runner differs from the
host's. The `ok` answer is cross-checked against what the selector would actually select.

**Refs:** VERIFICATION F-05, F-06; 190/01 R2.

## R2 — "Accounted for" needs a spelling with a reason

- **Kind:** near-miss · **Area:** contract · **Stage:** refine · **Owner:** architect · **Raised by:** 190/04 rework

ADR-008 let a coupling account for a test-shaped file, but it gave no way to say "the runner does
not run this". So the only answer to a true statement about the tree was a false declaration.
`work.test.exclude { paths, why }` is that spelling. Widening it to the truth surfaced 56 more
files the predicate had been misreporting.

**Lesson.** When a check can warn, give the declaration a way to state the honest exception, with
its reason, so the check can reach `ok` without lying.

**Refs:** ADR-008 §7; STATE Feedback (190/04 rework review close).
