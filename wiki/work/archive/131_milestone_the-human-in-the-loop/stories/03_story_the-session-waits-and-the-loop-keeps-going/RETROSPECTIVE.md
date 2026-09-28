---
type: story
doc: retrospective
number: 03
parent: 131
slug: the-session-waits-and-the-loop-keeps-going
title: "Retrospective — the session waits and the loop keeps going"
created: 2026-09-25
updated: 2026-09-25
---
# 131/03 · Retrospective

These are the lessons from delivering and accepting the story. There is one `R<n>` per lesson.
Findings are referenced here, never restated; they live in the milestone's `VERIFICATION.md`.

## R1 — A story that introduces a one-spelling helper greps for the old spelling at its own close

- **Kind:** near-miss · **Area:** architecture · **Stage:** review · **Owner:** developer · **Raised by:** 06's refine, measuring FF-13105 against the delivered tree

03 made `parkedHalt` the only minter of `session-needs-input`. Its review went green with the
standing-stop verify branch in `src/loop/cycle.mjs` still spelling
`haltDecision("session-needs-input", …)` directly. 06's refine found it when it measured FF-13105
over the tree, and 06's build fixed it on 03's authority.

**Why.** The rule that makes one helper the only spelling belonged to a control that lands two
stories later. Until then nothing checked it, and the old sites were re-aimed from a list rather
than from a search.

**Lesson.** When a story makes one function the only home of a spelling, its close greps `src/`
for the spelling it replaced. It does not wait for the register story to find the stragglers.

**Refs:** STATE `(refine 131/06)`, VERIFICATION FF-13105's register row.

## R2 — Re-estimate size after the contract adds scenarios

- **Kind:** estimate · **Area:** planning · **Stage:** refine · **Owner:** architect · **Raised by:** 03's review close

The ADR sized the shell edit at about 50 lines, and the developer's feasibility check at about 80–90
in `loop.mjs` and about 80 in `wave.mjs`. The build landed about +200 and about +160. Both figures predated the
`--resume` re-entry contract, `runLoopLaunch` and the death notice, so review was measuring against
a number made before those were in scope.

**Lesson.** A size figure is re-stated at the end of the contract beat that adds a task. Review can
then read a delta against the contract it built to.

**Refs:** STATE `(developer + review, build 03)` (1).
