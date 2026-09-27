---
type: story
doc: retrospective
number: 00
slug: the-driver-reads-the-screen
parent: 138
title: "Retrospective — the driver reads the screen"
created: 2026-09-27
updated: 2026-09-27
---
# 138/00 · Retrospective

Story-level lessons; the milestone's are in `../../RETROSPECTIVE.md`. Findings are referenced, never
restated (`../../VERIFICATION.md`).

## R1 — A rewrite of a quoted module reds the controls that quote it, and an import census cannot find them

- **Kind:** defect · **Area:** verification · **Stage:** build · **Owner:** developer · **Raised by:** m138/F-11, m138/F-12, m138/F-13

**What happened.** The build's focused lane was every suite that imports the driver, the launch seam
or the worker execution: 994 ok. Three whole-tree controls read the driver's TEXT, not its exports.
46's geometry tie wanted `cols: 80` as a literal and met `PTY_COLS`. 38's end-of-stream check sliced
`finish()` from the first brace and met `settle = {}`. And the budget case this story added spelled its
own import extractor, which FF-11901 refuses. The verify lane found all three.

**Lesson.** When a story rewrites a module other controls quote, run
`grep -rl <module-basename> test/arch` and add every hit to the lane. A text reader has no import edge
to follow.

## R2 — The recogniser's buffer clause was a measured fact from one renderer

- **Kind:** defect · **Area:** design · **Stage:** refine · **Owner:** architect · **Raised by:** m138/F-03

**What happened.** ADR-002 §1 required the alternate buffer, because every REPL recording was drawn
by the fullscreen renderer. claude also has a classic renderer, which draws the same box on the normal
buffer, once after an unfinished boot and always under `/tui default`. The clause turned that into a
cap timeout on every such drive, where the byte gate it replaced had typed. The operator struck the
clause at verify.

**Lesson.** A structural recogniser keys only on facts measured under every mode the target can run
in. A clause that holds in the one mode recorded is a hypothesis, and it wants a second recording
before it becomes a rule.
