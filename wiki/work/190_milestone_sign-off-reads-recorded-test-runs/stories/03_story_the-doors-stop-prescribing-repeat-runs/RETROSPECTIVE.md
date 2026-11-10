---
type: story
doc: retrospective
number: 03
parent: 190
slug: the-doors-stop-prescribing-repeat-runs
title: "Retrospective — the doors stop prescribing repeat runs"
created: 2026-11-10
updated: 2026-11-10
---
# 190/03 · Retrospective

These are the lessons from delivering and accepting the story, one `R<n>` per lesson. Findings are referenced here, never restated: they live in the milestone's `VERIFICATION.md`.

## R1 — A prose rewrite runs every control that reads that prose, not only the story's own

- **Kind:** mistake · **Area:** process (testing) · **Stage:** build · **Owner:** developer · **Raised by:** aof:verify 190 (F-01)

03 rewrote `verify.md`'s `not-finished` paragraph, and the reflow split a phrase that 160/05's
control reads as one line. 03's scoped lane did not select 160's case. It surfaced only when verify
ran the 97 suites that read the rewritten files.

**Lesson.** A story that edits a bundle command's text selects, as its lane, every suite that reads
that file. A literal-phrase control over reflowable prose tolerates whitespace (`\s+`), so a
reflow is not a regression.

**Refs:** VERIFICATION F-01; m96/F-96-B.

## R2 — A bundle member's write set is the render set

- **Kind:** mistake · **Area:** process · **Stage:** refine · **Owner:** architect · **Raised by:** 190/03 build (FF-7106)

`files:` named the `.claude/` and `.aof/templates/` renders but not the 16 tracked `.agents/`,
`.opencode/` and `.codex/` renders the same render writes. FF-7106 caught it.

**Lesson.** A story that edits a bundle member declares every tracked render of it, read from the
render, not from memory.

**Refs:** STATE Feedback (190/03 build).
