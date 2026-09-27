---
type: story
doc: retrospective
number: 01
parent: 131
slug: the-question-is-read-and-recorded
title: "Retrospective — the question is read and recorded"
created: 2026-09-25
updated: 2026-09-25
---
# 131/01 · Retrospective

These are the lessons from delivering and accepting the story. There is one `R<n>` per lesson.
Findings are referenced here, never restated; they live in the milestone's `VERIFICATION.md`.

## R1 — A `src/`-wide text sweep reads every file, so "run the suites that read a changed file" misses it

- **Kind:** defect-escape · **Area:** testing · **Stage:** verify · **Owner:** developer · **Raised by:** the verify gate's story-lane run

01's single-writer sweep matched `asks:` anywhere under `src/`. 05 later added an options argument
`{ asks: … }` in `list.mjs`, and its close ran every suite that imports or names a changed file. It
did not run 01's sweep, which names no file at all. The sweep was red over the delivered tree
until the verify gate ran the union of the stories' lanes.

**Why.** A text sweep's read set is "all of `src/`", but no import graph or path grep records
that. The census that finds a change's readers therefore never counts it.

**Lesson.** When a story's close lists the suites that read its changed files, it also runs every
suite that sweeps the changed file's directory as text. A sweep's regex matches a syntactic
shape, never a meaning ("a run record"), so it gets an exact-spelling exemption for a known
non-subject, never a widened pattern.

**Refs:** `m131/F-131-05`.

## R2 — A downstream ruling that removes an export's only consumer must amend the upstream contract in the same beat

- **Kind:** process · **Area:** contract · **Stage:** refine · **Owner:** product-owner · **Raised by:** four successive review closes

03's refine ruled the owner's wait a ref'd `setTimeout`, which left 01's contracted `createAskPoll`
with no reader. The note "01 amends or 03 finds a reader" was then carried through 01's, 03's and
06's closes and 06's refine, and nobody owned it. At verify, the contract amendment could not be
made in the gate, so the dead export shipped with its three scenarios.

**Why.** The ruling was written into the downstream contract, not the upstream one it
invalidated. Each later close could only restate the flag.

**Lesson.** A ruling that removes the reason for another story's delivered export amends that
story's contract where it is taken, or it stays open as a named finding with one owner. It is never
a relay note.

**Refs:** `m131/F-131-06`.
