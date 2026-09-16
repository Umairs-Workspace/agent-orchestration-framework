---
type: story
number: 04
slug: the-signals-that-are-not-the-mesh
title: "The signals that are not the mesh — a cadence, a CI signal and an inbound finding, each answering only which scope, and never classifying"
parent: 63
status: done
owner: product-owner
created: 2026-09-01
updated: 2026-09-02
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/63_milestone_event-driven-triggers/ARCHITECTURE.md#ADR-007, src/commands/feedback.mjs, src/work-loop.mjs, wiki/work/55_milestone_anchors-and-frozen-set/ARCHITECTURE.md#ADR-005, wiki/work/53_milestone_loop-artifact/ARCHITECTURE.md#ADR-003]
files: [src/work-trigger/sources.mjs, test/trigger-sources.test.mjs, test/arch/acd-trigger-never-classifies.test.mjs, scripts/test.mjs]
---
# 04 · The signals that are not the mesh

## User story

As the engineer wiring a crontab line, a CI step or a feedback capture to the loop,
I want each of those signals to answer exactly one question — *which scope* — and to be refused by name
when it cannot,
so that the thing standing between an external event and an unattended run is a resolution I can read,
not a policy that grew inside the trigger layer.

Three sources, one job, and one hazard each. What they share is the discipline: a source answers *which
scope*, and everything else — the level, the gate, the launch — belongs to somebody who already owns it.

**The finding source's hazard is already ruled on, one layer away.** 55/ADR-005 made raw capture
structural, and `src/commands/feedback.mjs` refuses any classification key at capture with
`feedback-classification-deferred`: *"Feedback capture accepts raw text and attribution only;
classification belongs to later triage."* A trigger that woke a loop **because a finding was a bug**
would be performing exactly the classification capture refuses, at a place nothing would catch it. So a
finding-triggered wake keys on the **existence** of a capture and the item it is attributed to, and may
not read, infer, score or branch on what the capture says. That is not caution; it is 55/ADR-005's rule
holding at its second consumer, and it is what makes this a legitimate trigger rather than an
untriaged triage.

**A CI signal is a signal, not a verdict.** The source reads which ref the signal names and answers
with a scope. It does not read a build's status, decide whether a failure is worth a loop, or hold a
policy about which pipelines matter. A source that graded its input would be a coordinator with a
different noun.

**A cadence source resolves a declared scope, and the clock is the caller's.** No timer ships here. The
cadence source exists so that a crontab line's scope and level are declared and reviewable in
`.aof/triggers.jsonc` rather than buried in a scheduler nobody reads — and so that 63/00's cadence
contradiction check has something to check.

Two rules bind all three. Scope resolves through `LOOP_SCOPE_FORMS` and **no grammar is authored here**
— TECH_DEBT item 49 measured what a fourth scope parser costs, and `src/work-ref-scope.mjs` is a
different resolver for a different question and is not conscripted. A signal naming a story does not
silently become a whole-stream walk: 53/ADR-003 made a story-shaped scope a coded refusal, and an
implicit widening is a scope the caller did not ask for. And **a source that cannot answer is a coded
refusal, never an empty resolution** — an empty resolution from an unattended caller is
indistinguishable from "nothing to do", which is how a wake path dies silently. That is 59/ADR-004's
*a sweep that read nothing is a finding rather than a pass*, applied to a resolution that resolved
nothing.

## Tasks

- [x] `tasks/00_each-source-answers-only-which-scope.feature` — a cadence, a CI signal and an inbound finding each resolve to a scope and nothing else, and no source carries a level, a cap, a gate or a launch
- [x] `tasks/01_a-finding-triggered-wake-never-classifies.feature` — the wake keys on a capture's existence and attribution, the capture's text is unreachable from the source, and no classification vocabulary appears in the family
- [x] `tasks/02_a-ci-signal-is-a-signal-not-a-verdict.feature` — the source reads which ref the signal names, and reads no build status and holds no content filter
- [x] `tasks/03_a-scope-resolves-through-the-loops-own-forms-or-is-refused.feature` — a driver and a range resolve, a story-shaped scope is refused with the driver it belongs to named, and no scope or range grammar is authored here
- [x] `tasks/04_a-source-that-cannot-answer-refuses-by-name.feature` — an unresolvable signal produces a coded refusal naming the source and what it could not resolve, never an empty resolution that reads as nothing to do

## Notes

The three sources are one module rather than three because they share the contract and would otherwise
be three stories writing one file. Their independence is at the **case** level, not the module level:
each is refusable, resolvable and testable without the other two.
