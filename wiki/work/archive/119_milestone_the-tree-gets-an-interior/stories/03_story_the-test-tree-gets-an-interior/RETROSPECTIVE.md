---
type: story
doc: retrospective
number: 03
parent: 119
slug: the-test-tree-gets-an-interior
title: "Retrospective — the test tree gets an interior"
created: 2026-09-07
updated: 2026-09-07
---
# 119/03 · Retrospective

Lessons from delivering and accepting the story. One `R<n>` per lesson, each carryable. Findings are
**referenced**, never restated: they live in the milestone's `VERIFICATION.md`.

## R1 — A blocker with no legal repair is an ADR question, not a build question — and the medicine already existed

- **Kind:** process · **Area:** contract · **Stage:** build · **Owner:** architect + operator · **Raised by:** `m119/F-25`

Moving the test tree stranded 489 suite citations in 156 DELIVERED `.feature` files. Delivered
acceptance criteria may not be edited, so the citations could not be repaired; ADR-004's two readers
(the doctor's control-path probe, and FF-11903's `src/` sweep) reached neither. It was gated, so the
story could not reach green around it. The build STOPPED and put three options to the operator rather
than choosing: extend the resolver, rescope the partition, or knowingly break 156 immutable records.

**Lesson.** The right option was the one that repairs nothing and breaks nothing — extend ADR-004 to a
third reader, the same medicine that admitted the `src/` fold at `119/00`. The carryable part is the
stopping: a story that reaches a choice between breaking immutable records and abandoning its scope
has found an architecture question, and the cost of guessing is a delivered record that lies. What
the refine missed is also worth naming — ADR-004 priced the CONTROL-path citations this move would
strand and admitted the move because the resolver lands with it; the `.feature` EVIDENCE axis was
never measured.

## R2 — A change lands with its own tests green and leaves a control ONE DIRECTORY OVER asserting the behaviour it replaced

- **Kind:** blind spot · **Area:** controls · **Stage:** build · **Owner:** every lane · **Raised by:** `m119/F-31`, four instances

Four reds on this branch were never 119's: `work:debt` was registered and absent from a "exactly the
known work ids" list; `pay-debt` was a bundled member an "complete pre-existing member set" did not
name; `validate` for a missing ref became a `scope-not-found` finding while a suite still asserted the
empty envelope; `taskFilesState` was made one answer while a suite still asserted the divergence — and
its NAME called the divergence deliberate.

**Lesson.** THE PATTERN, not the four instances: nothing catches this until something forces a
whole-tree run, and **`--scope impacted` structurally cannot**, because the stale control's file is not
in the changed set. Two of the four came from a single `aof:pay-debt` session, which is the lane most
likely to change behaviour a distant control pins. This is the argument for the milestone-level
regression gate stated from the inside.

## R3 — The verdict is the EXIT CODE; a grep is a summary, never the answer

- **Kind:** defect · **Area:** tooling · **Stage:** build · **Owner:** developer · **Raised by:** `m119/F-32`, caught in-session

A duplicate `const` introduced while re-depthing made a module a SyntaxError. The runner printed a
stack and NO TAP line, and a `grep -c 'not ok'` check reported clean. A suite that fails to LOAD emits
no `not ok` at all.

**Lesson.** The same shape is already recorded against `node --test` on this repo's suites, which makes
this the second recorded instance of one cause. A wrapper that prints `exit=`, `pass=`, `fail=` and
dumps a load failure explicitly is the cheap fix, and it is what the rest of this milestone ran on.

## R4 — A story whose write set includes the runner cannot be story-scoped, and the declared face cannot say so

- **Kind:** defect · **Area:** loop · **Stage:** build · **Owner:** the test face · **Raised by:** `m119/F-09`

`aof test --scope impacted --story 119/03` resolves to all 1,031 suites — the declared write set is
`test/`, so "impacted" is everything — then exceeds its 2,700,000 ms deadline and reports NOTHING
rather than what it got through. The build ran `node scripts/test.mjs --only <the 50 failing suites>`
instead: **1m45s against ~40 minutes.**

**Lesson.** Two separate faults worth separating: a selector that degenerates to the whole tree on a
tree-wide story, and a deadline whose expiry produces no partial result. The second is the worse one —
a run that reports nothing is indistinguishable from a run that never happened.

## R5 — The recursive walk found a real orphan the flat walk could never see

- **Kind:** confirmation · **Area:** controls · **Stage:** build · **Owner:** the control tree · **Raised by:** `m119/F-28`

`test/integration/cli-child-process.test.mjs` is imported by neither runner and by no index: green, red
or deleted with identical effect on CI. The old flat walk over `test` and `test/arch` could not reach
it.

**Lesson.** Widening a sweep is how pre-existing vacuity surfaces, and the honest handling is to record
it rather than absorb it — it was NOT added to the shrink-only baseline, which may only shrink, and
NOT fixed inside a move story whose claim is that it changes nothing.
