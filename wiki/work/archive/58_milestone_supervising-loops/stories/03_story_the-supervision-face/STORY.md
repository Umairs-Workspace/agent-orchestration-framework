---
type: story
number: 03
slug: the-supervision-face
title: "The supervision face — who sets this loop's reference, at which layer, in a graph where every kind looks different"
parent: 58
status: done
owner: product-owner
created: 2026-08-28
updated: 2026-08-29
depends: [58/01]
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/58_milestone_supervising-loops/ARCHITECTURE.md#ADR-002, wiki/work/58_milestone_supervising-loops/ARCHITECTURE.md#ADR-003, wiki/work/58_milestone_supervising-loops/ARCHITECTURE.md#ADR-006, src/commands/loops-show.mjs, src/commands/loops-graph.mjs, src/work-loops.mjs, test/arch/acd-loop-render-deterministic.test.mjs]
files: [src/commands/loops-show.mjs, src/commands/loops-graph.mjs, test/arch/acd-loop-graph-kind-legible.test.mjs, test/loops-supervision-face.test.mjs, scripts/test.mjs]
---
# 03 · The supervision face

## User story

As an operator looking at this system's loop graph rather than parsing its records,
I want each loop to show the layer it runs at and the node that sets its reference, and every kind of
node to look like what it is,
so that "who may change this target" is something I can answer by reading one screen, instead of a
question I answer by opening fourteen files or by drawing the picture wrong.

The registry already has a face — `show` for the records, `graph` for the picture — and both were
built when there were three kinds and no hierarchy above a loop. Today several kinds render through
shapes that do not distinguish them, and the two commands say nothing about who supervises whom
because nothing did. This story catches the face up with the model, and adds the guard that makes the
next kind fail CI until somebody gives it a shape.

## Tasks

- [x] `tasks/00_the-face-names-the-supervisor.feature` — reading a loop shows the layer it declares and the node that sets its reference, and says so plainly when nothing does
- [x] `tasks/01_every-kind-has-its-own-shape.feature` — each declared kind renders as a distinct shape, the fallback for an endpoint nobody declared is untouched, and the rendering stays deterministic

## Notes

- **This story lands after 58/01, and the correction is worth reading before you schedule it.**
  ADR-007 §5 originally called it independent, on the reasoning that the glyph leg drives a hand-built
  fixture and needs no loader change. That was false, and measurably so: **every** scenario in both
  tasks drives the CLI over records on disk, and neither command has an injection seam. Before the
  schema and the records land, `layer:` is an unknown key and the field is never set, `kind: arbiter`
  leaves the kind null so the node renders as *unknown* and falls into the **fallback shape this
  story's own Examples row forbids**, and the operator's edge is a bad value so the reference-setter
  list comes back empty where a row requires the operator. An injection seam was considered and
  refused — it buys a scheduling claim by adding a test-only door into a production command.
  The honest shape of the milestone is **58/00 → 58/01 → {58/02, 58/03}**: three stages, one parallel
  pair, less parallelism than the partition first claimed.
- **The glyph table belongs in the exported, pure renderer**, which is what lets `FF-5808` assert the
  glyph set without standing up a workspace.
- **The undeclared-endpoint fallback is pinned by an existing arch-test and must not move.**
  `test/arch/acd-loop-render-deterministic.test.mjs` fixes the shape used for endpoints nobody
  declared — `command:`, `config:`, `module:` and dangling `loop:` references. The new shapes are for
  *declared kinds* only, which is why that suite is in this story's `reads:` and not its `files:`.
- **The kind-legibility guard is the durable half.** `FF-5808` asserts that the number of distinct
  shapes the renderer emits equals the number of declared kinds — so the sixth kind, whenever it
  arrives, fails CI until it is given a glyph rather than silently rendering as something it is not.
  Several kinds collide today; that is a measured codebase-health finding (ADR-006), repaired inside
  the milestone rather than ledgered.
- **Two commands, one production dependent each** (`aof graph impact`, 2026-08-28): the face is the
  cheapest surface in the milestone to change and the only one an operator sees directly.
