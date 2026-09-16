---
type: story
doc: retrospective
number: 00
parent: 124
slug: the-census-reports-its-denominator
title: "Retrospective — the census reports its denominator"
created: 2026-09-08
updated: 2026-09-08
---
# 124/00 · Retrospective

Lessons from delivering and accepting the story. One `R<n>` per lesson, each carryable. Findings are
**referenced**, never restated: they live in the milestone's `VERIFICATION.md`.

## R1 — The story's own gate could not go green until it repaired a runner outside its thesis

- **Kind:** blocker · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** a `case-failed` grade on the first attempt

**What happened.** The build's first grade failed with the fitness lane resolving to zero tests.
The rubric runner's flat sweep had matched nothing since the tree gained an interior; this story
made it recursive and gave the zero-lane diagnostic its three numbers (modules swept, names
registered, names matched).

**Why.** The runner was in the story's `files:` because the refine's feasibility beat had already
found the gap; the fix still cost the first attempt.

**Lesson.** A story whose deliverable is "an instrument reports its denominator" should expect to
find an instrument on its own path that does not — and price the first attempt for it. Refs:
`m124/F-05`.

## R2 — The impacted scope collapsed to the whole tree on the one node that cannot host it

- **Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** the test face · **Raised by:** developer

**What happened.** `aof test --scope impacted --story 124/00` widened nine times — every new file
`not-in-graph` or `no-registered-dependent` — and collapsed to `scope all`, 1,035 suites, the run
CLAUDE.md forbids on this control node. The build used `node scripts/test.mjs --only <files>`.

**Why.** The widening is correct and honestly reported; a story whose declared paths are all new to
the graph has no impacted set.

**Lesson.** For a story that lands new modules, the focused-file lane is the verdict, not a fallback;
`--scope impacted` is for stories that edit what already exists. Second instance after `m119/F-09`.
Refs: `m124/F-12`.

## R3 — A contract that cites a counterexample path has cited a path, and the sweep counts it

- **Kind:** misunderstanding · **Area:** contract · **Stage:** refine · **Owner:** architect · **Raised by:** developer, at the un-blinded lane

**What happened.** ADR-003 and two of this story's task features spell a retired-module path as the
counterexample for "a shared prefix is not containment", and two fixture paths as a coverage pair.
FF-11903 cannot tell a deliberate fiction from a stale citation; the ceiling breached by one, and the
developer refused to launder the fixture to buy a green.

**Why.** The instrument's domain is "every `src/` path token in a document"; a counterexample is a
path token.

**Lesson.** Until the fictional-path ruling lands, spell a counterexample so it is not a `src/`
path token — or accept that the ceiling must be paid with a real repair elsewhere, as it was here.
Refs: `m124/F-02`.

## R4 — Three controls that executed nothing were green under `--only` and red only in the lane this story restored

- **Kind:** near-miss · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** the restored fitness lane

**What happened.** `test/arch/loop/index.mjs` gained an import and not the spread — a scripted
edit whose second replace matched nothing and said nothing — so a ten-leg control registered zero
legs; a hand-rolled comment stripper and two fixed-line-window slices shipped beside it. All three
were green under `--only` (which loads the file directly) and caught at once by FF-11906, the
registration control and the review.

**Why.** A story-scoped run loads what it is pointed at; membership in the assembled suite is only
asserted by the assembled suite.

**Lesson.** A scripted edit asserts that each replacement matched, and a story that adds a control
runs the fitness lane before calling the control landed. Refs: `m124/F-07`.
