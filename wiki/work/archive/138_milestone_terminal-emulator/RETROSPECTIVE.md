---
type: milestone
doc: retrospective
number: 138
slug: terminal-emulator
title: "Retrospective — the session driver sees claude's screen"
created: 2026-09-27
updated: 2026-09-27
---
# 138 · Retrospective

Milestone-level lessons: the ones no single story's retrospective states. Story lessons live in
`stories/*/RETROSPECTIVE.md`. Findings are **referenced**, never restated; they live in `VERIFICATION.md`.

## R1 — Every defect the live story found was a variable the recordings held constant

- **Kind:** defect · **Area:** verification · **Stage:** verify · **Owner:** architect · **Raised by:** F-01, F-03

**What happened.** Every recording was drawn from one launch environment (a shell that declared a
Unicode terminal) and one renderer (fullscreen). The live legs met the other value of each variable
once. With no `TERM`, claude drew `>` for `❯`. After an unfinished boot, it drew the box on the normal
buffer. The suites were green over both defects, because a recording can only prove the conditions it
was taken under.

**Lesson.** Before a recogniser is ruled, list the inputs that change what the target draws (terminal,
renderer, config, version), and either record each value or show that the recogniser ignores it. The
live story then confirms a matrix instead of discovering one.

## R2 — Squash-only `main` turned history-reading checks into standing reds that the next door pays for

- **Kind:** process · **Area:** gates · **Stage:** verify · **Owner:** the operator · **Raised by:** F-15, F-16

**What happened.** The gate pre-scan at this door found four whole-tree reds that 138 did not cause.
Two done drivers (131 and 139) had been merged without being archived. Two checks read per-commit
history that the PR squashes erased. All four were red on `origin/main` already, and nothing had run
the whole tree since the squashes began. The operator ruled that the door fold the backlog story in.

**Lesson.** When a merge rule changes, run the whole tree on `main` once, straight after. Checks that
read history break at that moment, and a red nobody measures becomes the next milestone door's cost.

## R3 — The verify lane read `0 not ok` from a run that had three

- **Kind:** process · **Area:** verification · **Stage:** verify · **Owner:** product-owner · **Raised by:** F-10, F-11, F-12

**What happened.** `scripts/test.mjs` writes each `not ok` line to stderr and each `ok` line to stdout.
The first read of the verify lane counted stdout and saw 1,620 ok and 0 not ok, over a run that exited 1.

**Lesson.** Read the exit code first, and count `not ok` across both streams. A zero drawn from one
stream is not a green run.
