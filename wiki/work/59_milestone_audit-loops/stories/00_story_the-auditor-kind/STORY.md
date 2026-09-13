---
type: story
number: 00
slug: the-auditor-kind
title: "The auditor kind — a sixth node whose subject is the instruments and which has no words for acting"
parent: 59
status: done
owner: product-owner
created: 2026-08-29
updated: 2026-08-29
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/59_milestone_audit-loops/ARCHITECTURE.md#ADR-001, wiki/work/59_milestone_audit-loops/ARCHITECTURE.md#ADR-005, wiki/work/59_milestone_audit-loops/ARCHITECTURE.md#ADR-008, wiki/work/59_milestone_audit-loops/ARCHITECTURE.md#fitness-functions, wiki/work/58_milestone_supervising-loops/ARCHITECTURE.md#ADR-003, wiki/work/57_milestone_paired-loops/ARCHITECTURE.md#ADR-001, wiki/work/55_milestone_anchors-and-frozen-set/ARCHITECTURE.md#ADR-001, src/bundle/loops/run-liveness.md, src/bundle/loops/build-to-green-watcher.md, test/support/loop-registry-fixture.mjs, test/support/registry-fixture.mjs, test/support/feature-parse.mjs, src/work-loops.mjs, test/arch/acd-auditor-taxonomy-additive.test.mjs, test/arch/acd-anchor-freshness-declared.test.mjs, test/anchor-taxonomy.test.mjs, test/work-loops-record.test.mjs, scripts/test.mjs, src/commands/loops-graph.mjs, test/arch/acd-loop-vocabulary-closed.test.mjs, test/arch/acd-anchor-taxonomy-additive.test.mjs, test/arch/acd-watcher-taxonomy-additive.test.mjs, test/arch/acd-arbiter-taxonomy-additive.test.mjs, test/arch/acd-registry-framework-owned.test.mjs, test/arch/acd-anchor-grounding-seed.test.mjs, test/arch/acd-registry-fixture-closed.test.mjs, test/work-loops-value.test.mjs]
files: [src/work-loops.mjs, test/arch/acd-auditor-taxonomy-additive.test.mjs, test/arch/acd-anchor-freshness-declared.test.mjs, test/anchor-taxonomy.test.mjs, test/work-loops-record.test.mjs, scripts/test.mjs, src/commands/loops-graph.mjs, test/arch/acd-loop-vocabulary-closed.test.mjs, test/arch/acd-anchor-taxonomy-additive.test.mjs, test/arch/acd-watcher-taxonomy-additive.test.mjs, test/arch/acd-arbiter-taxonomy-additive.test.mjs, test/arch/acd-registry-framework-owned.test.mjs, test/arch/acd-anchor-grounding-seed.test.mjs, test/arch/acd-registry-fixture-closed.test.mjs, test/work-loops-value.test.mjs]
---
# 00 · The auditor kind

## User story

As an operator reading this system's loop registry,
I want an auditor to be its own kind of node — one that must name the instruments it reads and how it
reads them, and that has no vocabulary in which to say it also fixes, optimises or grounds anything,
so that "something independent is checking the measuring apparatus" is a fact I can read off six lines
of frontmatter rather than a promise the apparatus made about itself.

The registry can already say *a loop optimises*, *a watcher counts what the optimiser cannot edit*,
*an anchor is where the world answers* and *an arbiter owns a standing trade-off*. It cannot say
**a node whose subject is the instruments themselves** — including a watcher's counter and an
anchor's authority. Forced into an existing kind, an auditor would have to be a loop (which optimises
and acts), an actor (which means a human looked), or a watcher (which pairs an optimiser, not an
instrument). None of those is true of a cadenced, deterministic pass over the gates.

This story adds the sixth kind and freezes its grammar. It ships no check, no lane, no face and no
record — 59/01 through 59/04 own those. What it ships is the language all four are written in, plus
the one new anchor key the freshness check needs (`checked:`), so that story can stay a pure leaf.

## Tasks

- [x] `tasks/00_a-sixth-kind.feature` — `auditor` joins the kind vocabulary additively, and every one of the sixteen records already on disk parses with the same codes in the same counts
- [x] `tasks/01_what-an-auditor-must-declare.feature` — `audits`, `measurement`, `cadence` and `escalation` are required, an `item:` subject is refused, and a prose-only measurement is refused because a person reading something is not a machine reading it
- [x] `tasks/02_an-auditor-cannot-act.feature` — the ten keys the kind omits are refused by the loader's existing code, so an auditor that claims to fix, optimise, hold a setpoint or ground itself is a parse error rather than a review comment
- [x] `tasks/03_the-report-is-an-edge-and-nothing-points-back.feature` — `reporting` is the sixth edge key, outbound from the auditor, and no record may name an auditor as an endpoint
- [x] `tasks/04_an-anchor-says-when-it-was-checked.feature` — `checked:` is admitted on the anchor alone, is optional, holds an ISO date, and refuses every sentinel that would let an anchor opt out of freshness

## Notes

- **Additive, or it is a regression.** 55 widened this enum from two kinds to three, 57 to four, 58 to
  five; this is the fourth widening and it deletes nothing. The measurable form is that the **sixteen**
  records in `.aof/loops/` today parse with **zero new findings** — task 00's compatibility scenario is
  that assertion, and FF-5901 is its structural twin.
- **The omitted keys are the design, not tidiness.** ADR-001 §2 gives a row per omission. Each is
  enforced by the loader's existing `loop-key-not-admitted-for-kind` — no new finding code, exactly the
  free enforcement 57 bought for the watcher's absent `actuator`. That is why task 02 asserts the
  *existing* code rather than inventing one.
- **`determinism` is deliberately NOT admitted.** It would have one legal value. The same guarantee is
  bought by refusing a `prose:` measurement, which is a rule on a field that already exists rather than
  an enum that could later be widened to admit a judge.
- **`ENDPOINT_SCHEMES` is untouched.** 58/ADR-003 §6's precedent: widen the endpoint vocabulary only
  for an edge actually declared. Nothing points at an auditor, and task 03's last scenario is what
  keeps that true rather than incidental.
- **`checked:` lands here, not in 59/03.** The checks module imports nothing and must keep importing
  nothing (52/ADR-007), so the key has to arrive with the loader. It is optional: an anchor that has
  never declared one is not thereby stale — it is undated, and 59/03 says which.
- **`src/work-loops.mjs` has 4 production dependents, all `commands/loops-*`** (`aof graph impact`,
  2026-08-29). Nothing outside the loops command family can be broken here, which is why this story is
  in stage 1 alongside a story it shares no file with.
