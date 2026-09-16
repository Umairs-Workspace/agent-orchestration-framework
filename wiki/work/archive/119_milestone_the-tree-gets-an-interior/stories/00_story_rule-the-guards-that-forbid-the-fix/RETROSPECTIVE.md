---
type: story
doc: retrospective
number: 00
parent: 119
slug: rule-the-guards-that-forbid-the-fix
title: "Retrospective — rule the guards that forbid the fix"
created: 2026-09-07
updated: 2026-09-07
---
# 119/00 · Retrospective

Lessons from delivering and accepting the story. One `R<n>` per lesson, each carryable. Findings are
**referenced**, never restated: they live in the milestone's `VERIFICATION.md`.

## R1 — The story that RULES a defect reproduced it, and that is evidence for the ruling

- **Kind:** confirmation · **Area:** contract · **Stage:** build · **Owner:** developer · **Raised by:** the build's own write-set correction

This story exists to rule that a control which STORES a fact about the tree sends its next bill to a
stranger. It was itself missing two write-set entries — `test/support/module-family.mjs` (the one
home ADR-002 requires without naming a file) and `acd-mesh-ui-single-data-command.test.mjs` (ADR-003's
named SILENT specimen, declared in `reads:` only). Both were added by the mechanism `STORY.md`
already rules for.

**Lesson.** When a story's subject is a defect class, expect the class inside the story. The write-set
declaration is the first place to look, because a declaration is itself a stored fact about the tree.
The milestone went on to reproduce this four more times (`m119/F-20`, `F-21`, `F-34`, `F-35`), which
is the strongest argument available that the ruling was the right order of work.

## R2 — Three controls reported LOUDLY during the build, and each was a one-line fix

- **Kind:** confirmation · **Area:** controls · **Stage:** build · **Owner:** the control tree · **Raised by:** three reds, seconds apart

`test/work-doctor-controls.test.mjs:350`'s closed census of the doctor spine's `stat` sites, the
session door's `NAMES_THE_NEW_MODULE` policy allowlist, and the registry's terminal-row rule in
`scripts/test.mjs` each went red the moment this story touched their subject. Three carriers, three
seconds each, the file named every time.

**Lesson.** This is the discovery mechanism ADR-003 predicts, working — and it is the reason "loud is
not a defect" is a ruling rather than a preference. A control that reds and names its file costs the
story a line; the same fact stored silently costs a later story a day. Prefer loud over absent when
choosing how to pin a fact you cannot yet derive.

## R3 — A measurement claim in a contract needs its command AND a check that the command is not narrower than the class

- **Kind:** blind spot · **Area:** contract · **Stage:** refine · **Owner:** the amigos · **Raised by:** the review widening the detector

`tasks/00`'s Examples table names eleven sites in nine files, measured with
`grep -rn 'doesNotMatch(.*import' test/arch/*.test.mjs`. That extractor is blind to the
`assert.ok(!/…/.test(source))` and `assert.equal(/…/.test(source), false)` spellings; widening the
detector found two more genuine purity guards, making the class **thirteen sites in eleven files**.
ADR-004 carries the identical defect — its 157/175/20 has never reproduced, and the build measured
357/8,249/77 instead.

**Lesson.** "Every number carries the command that produced it" held; the numbers did not. The rule
needs a second half: the command's extractor must be shown no narrower than the class the row names.
A contract written to rule instrument-blindness arrived carrying it.

## R4 — An unsatisfiable acceptance clause is read narrowly, never edited — and flagged for the next refine

- **Kind:** process · **Area:** contract · **Stage:** build · **Owner:** developer · **Raised by:** the non-vacuity criterion

`tasks/00`'s "the guard cannot pass by finding nothing" asks that a purity guard assert "at least one
import specifier was classified across the family". Every one of the nine subjects carries ZERO
specifiers — precisely what the guards assert — so the clause is unsatisfiable at the carriers. It was
asserted where it IS testable (the extractor's non-vacuity over a synthetic family that has
specifiers, and per-carrier: the family resolved to at least one file, every scoped file read
non-empty). The `.feature` was not touched.

**Lesson.** Delivered acceptance criteria are immutable, so the move is to satisfy the clause where it
is testable and record the wording that would have worked. Here: "the classifier ran over non-empty
source" rather than "a specifier was classified" — otherwise every story converting a tenth guard
re-litigates it.

## R5 — A story's run must be minted BEFORE the first edit, and nothing recovers it afterwards

- **Kind:** defect · **Area:** loop · **Stage:** build · **Owner:** the phase commands · **Raised by:** `m119/F-10`

The run was minted after the build and review. The story therefore sat `not-started` for its whole
build — lying to the board, the fleet and `aof work next` — and its run record carries
`sessionId: null`, so `aof work observe` can never say what this story cost.

**Lesson.** The session id is readable only for seconds after the prompt that invoked the phase, so
this is not recoverable by a later repair; it is only preventable. The milestone's own run was minted
correctly at the top, which is the shape a story's should follow.
