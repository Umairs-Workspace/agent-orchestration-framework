---
type: story
doc: retrospective
number: 02
slug: the-verb-and-the-shell-honour-it
parent: 130
title: "Retrospective — the verb and the shell honour it"
created: 2026-09-24
updated: 2026-09-24
---
# 130/02 · Retrospective

Story-level lessons; the milestone's are in `../../RETROSPECTIVE.md`. Findings are referenced, never
restated (`../../VERIFICATION.md`).

## R1 — A story that shares a file with an in-flight story must declare that story's new homes

- **Kind:** process · **Area:** refine · **Stage:** build · **Owner:** architect · **Raised by:** 130/02 build

**What happened.** The story was authored against the pre-129/04 shell. 129/04 landed first and moved
the drive/settle/row trio into `src/loop/cycle.mjs` and the wave into `src/loop/wave.mjs`; the build
edited both, widened `files:` by four, and moved two schema pins outside the declared set.

**Lesson.** When ADR-001 §6-style sequencing says "whichever lands second adapts", the second story's
contract should already declare the first story's announced homes in `reads:`/`files:` — the adaptation
was foreseen, so the write set should have been too.

## R2 — Two whole-tree reds rode the lane commit to the next door

- **Kind:** defect · **Area:** tests · **Stage:** gate · **Owner:** developer · **Raised by:** m129/F-69

**What happened.** The lane commit made `work:loop`'s `run` a non-`AsyncFunction` and had
`loop-command-stops` spell the frozen `LOOP_STOPS` literal another control already pins; both surfaced
only at 129's whole-tree door and were repaired there.

**Lesson.** A story that edits a command's `run` or a frozen literal's neighbourhood should run the
command-core contract and the grade controls in its own lane — they are cheap, and they are exactly the
two that a focused `loop-command-*` run does not reach.
