---
type: story
number: 01
slug: the-groundedness-report
title: "The groundedness report — anchored, stale, or floating free, and the ungrounded named"
parent: 55
status: done
owner: product-owner
created: 2026-08-26
updated: 2026-08-27
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 01 · The groundedness report — anchored, stale, or floating free

## User story

As an operator deciding whether this system's checks mean anything,
I want one command that tells me — **by name** — which loops settle against the world, which only
watch each other, and which are anchored to a measurement that has quietly stopped resolving,
so that "every check passes" becomes a claim I can audit instead of a claim I have to trust.

Milestone 52 built the algorithm and stopped one step short on purpose. `checkGrounding`
(`src/work-loops-checks.mjs:163`) already decomposes the graph into strongly connected components
and floods forward from ground — but it seeds from exactly one predicate, `kind === "actor" &&
ground === "exogenous"` (`:169-172`), and it has no notion of **stale** at all, because 52 never
resolves a pointer. `52/ADR-003` assigned resolution and staleness to milestone 55 by name and said
they would arrive additively.

This story is that arrival. The traversal does not change — only the seed widens, a fourth verdict
appears, and a loop with no anchor at all stops being invisible.

## Tasks

- [x] `tasks/00_the-seed-widens.feature` — grounding seeds from any node bearing a ground class, the flood and the component decomposition are unchanged, and every verdict names the class that supported it
- [x] `tasks/01_a-loop-with-no-anchor.feature` — a declared loop with no inbound anchor edge is named, and absence is the finding rather than a missing key
- [x] `tasks/02_a-stale-anchor.feature` — an anchor whose authority no longer resolves reports stale, which is neither anchored nor ungrounded, and says which pointer decayed
- [x] `tasks/03_the-report-face.feature` — the report is a registered command with a frozen `--json` contract, deterministic on unchanged inputs, and resolution happens at the command boundary rather than inside the checks

## Notes

- **The traversal is not the deliverable — the seed and the verdict set are.** `decomposeLoopGraph`
  (`src/work-loops-checks.mjs:118-161`) is Tarjan over the adjacency the five edge keys build, and it
  is correct. Changing it would be a regression dressed as progress. `FF-5502` asserts it stays
  byte-unchanged.
- **Four verdicts, and `stale` is the only new one.** `anchored` / `exogenous-only` /
  `self-referential` / `stale` (ADR-002 §3). `stale` sits strictly between the last two: an anchor
  that resolved once and does not now is a different fact from one that never existed. Collapsing
  them would repeat the `unknown`-vs-`uncapped` mistake `52/ADR-002` refused, one milestone later.
- **The checks module imports nothing, and must still import nothing when this lands.** Measured:
  0 imports, 8 dependents of which exactly **one** is production (`aof graph impact`, 2026-08-26).
  That purity is why this story can be built and tested in parallel with everything else in the
  milestone, and `FF-5503` extends 52's existing guard rather than adding a sibling to it. The
  resolver lives at the command face and passes a resolution **map** in — `53/ADR-007`'s shape and
  `54`'s injected-observation shape, both already in service.
- **This story does not register its check in the Loop-Ready score.** `COMPOSED_CHECK_IDS`
  (`src/work-doctor-loop-ready.mjs:14-20`) is owned by 55/05, which is the story that gates on the
  result and must not inherit a half-registered score. The check id is declared in ADR-002 §3 so both
  stories can name it before either lands. ADR-007 §3.
- **The line against milestone 78, so neither builds the other's resolver.** 55 resolves registry
  pointers and reports staleness per component, framework-wide. 78 reports an unresolvable authority
  per work item, in a committed per-item document, and depends on `52, 53, 79` — not on 55. 78's
  record is a face over this answer, never a second one. ADR-002 §5.
- **No verdict is recorded to disk by this story.** A `stale` verdict is a claim about the world, and
  `52/ADR-003` rejected shipping one in 52 because *"a resolver without provenance is an instrument
  nobody can audit"*. The stamp is 55/02's; this story reports, and reporting is not recording.
