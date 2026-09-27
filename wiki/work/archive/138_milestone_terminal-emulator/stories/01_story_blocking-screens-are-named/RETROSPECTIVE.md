---
type: story
doc: retrospective
number: 01
slug: blocking-screens-are-named
parent: 138
title: "Retrospective — blocking screens are named"
created: 2026-09-27
updated: 2026-09-27
---
# 138/01 · Retrospective

Story-level lessons; the milestone's are in `../../RETROSPECTIVE.md`. Findings are referenced, never
restated (`../../VERIFICATION.md`).

## R1 — The recording overturned the consent before a line of it was built

- **Kind:** process · **Area:** refine · **Stage:** build · **Owner:** architect · **Raised by:** 138/01 task 00

**What happened.** ADR-003 §4 planned trust as one Enter on the dialog's default. The first capture
showed claude 2.1.283 opening it on `❯ No, exit`, so that Enter would have exited claude on every lane
whose pre-write lost. The MCP dialog's default is `Continue without using this MCP server`. The operator
ruled a navigated consent ("Allow down then enter … detect the order"), and 01 was re-refined before
it was built.

**Lesson.** Capture first, then author the action. For any screen the driver will answer, the
recording is part of the refine, not the build, because a guessed default is exactly the blind
keystroke the milestone exists to remove.

## R2 — A fixture directory is a census too

- **Kind:** defect · **Area:** verification · **Stage:** verify · **Owner:** developer · **Raised by:** m138/F-10

**What happened.** FF-13802 read the fixture directory through a `.json` filter with no floor on the
result, so a moved directory would have emptied the control rather than reddened it. FF-11902 caught
it at verify.

**Lesson.** A control that walks a data directory states its floor, naming the directory, exactly as a
control walking `src/` does.
