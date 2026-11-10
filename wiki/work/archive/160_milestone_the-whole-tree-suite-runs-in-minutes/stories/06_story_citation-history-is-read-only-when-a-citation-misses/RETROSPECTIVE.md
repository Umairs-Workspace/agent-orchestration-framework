---
doc: retrospective
promotionFrom: 1
---
# 160/06 · Citation history is read only when a citation misses — retrospective

## R1 · A stale graph turned the story lane into a three-hour whole-tree run

**Kind:** near-miss (recurring) · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** developer · **Recurs:** 148/01/R1 · **Promoted to:** none

**What happened:** The graph had been built on 2026-10-06, so `--scope impacted --story` widened all eight
declared files as `no-registered-dependent`. The run went to `scope all` on the control node, ran for about three
hours, and was killed at its two-hour deadline. 160/02 then hit the same widening (160/02/R1).

**Why:** The impacted selector widens on any path the graph does not know, and nothing warned that the graph was
a week old.

**Lesson:** Run a story's suites by file. Use `--scope impacted` only after checking the graph's build date
against the files the story touches.

**Refs:** ../../STATE.md `## Feedback (for retro)` (160/06).

## R2 · The read set missed the tests that pin the edge being changed

**Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** architect · **Raised by:** developer (build) · **Promoted to:** none

**What happened:** `test/arch/command/acd-wiki-citation-resolver.test.mjs` (161's FF-16101),
`packages/work/test/command-faces.test.mjs` and `packages/work/src/wiki-citations.mjs` all pin or consume the
history edge, and none of them was in `reads:`. The two tests had to be updated for the loader shape during the
build, and FF-16101's red probes were retargeted.

**Why:** 161 landed its consumer of the edge while 160 was being refined, and the read set was not re-grepped.

**Lesson:** Before a build changes a shared edge's shape, re-grep for its importers and pinning tests at build
start, not only at refine.

**Refs:** ../../STATE.md `## Feedback (for retro)` (160/06 — the read set).
