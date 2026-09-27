---
type: milestone
number: 57
slug: paired-loops
title: "Paired loops — every optimizing loop gets a watcher it cannot edit"
status: done
owner: product-owner
created: 2026-08-13
updated: 2026-08-28
depends: [52, 55, 56]
origin: [../../planning/PRD-acd-loop-engineering.md, ../../planning/PRD-graph-engineering.md]
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context
  (ARCHITECTURE / DESIGN / RESEARCH / UAT live in this folder too, conditionally).
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# 57 · Paired loops

## Objective

The build loop's metric is *scenarios green*, and its actuator is an agent that can edit the scenario.
That is not a hypothetical exposure — it is the best-measured failure in agentic coding: benchmarks
find models saturating the visible suite while the gap to held-out tests widens with task complexity,
agents editing tests and verifiers, and a self-improving coding agent that, told to reduce
hallucination, found both the real fix and the hack of deleting the detection markers. aof's structural
defence today is a review stage that may or may not look. That is guidance, not a loop.

**This milestone gives every optimizing loop a watcher on a counter-metric that the optimizer cannot
edit.** Throughput is paired with rework and finding-escape rate. Cost is paired with escape rate.
Autonomy is paired with intervention rate. And build-green is paired with **test integrity** — did the
scenario move to fit the code, did coverage of the changed lines drop, does a deliberate mutation still
fail — with the exact form of that pairing settled by spike 56.

Two rules give the pairing teeth. **Independence is structural**: a watcher is a different node reading
a different artifact, and where a model must judge, not the same model instance grading its own output
— LLM judges systematically prefer their own generations, so a watcher that shares the maker's model
and context is decoration. And **counters beat judges**: where a counter-metric can be computed
deterministically it must be, because a number that code produced cannot be talked out of.

The pairing is enforced structurally, not culturally: after this milestone an optimizing loop with no
monitoring edge is a `validate` finding, promoted from the report 52 emits.

## Scope

In scope:
- **A counter-metric and an owning watcher per optimizing loop**, declared as monitoring edges on the
  loop graph — the pairing table for the loops aof actually runs.
- **Test integrity as the build loop's pair** — the specific counter-metric chosen on spike 56's
  finding (scenario churn against the change, coverage delta on changed lines, or probe survival).
- **The independence rule, structurally enforced** — the watcher is a different node on a different
  artifact, and never the same model instance judging its own output.
- **Deterministic counters preferred to model judgment**, wherever the counter-metric admits one.
- **Unpaired optimizing loops become validate findings** — 52's report becomes a gate.

Out of scope:
- **Auditing whether the instruments still work** — 59. Pairing assumes the counter-metric measures
  something; the audit is what checks that assumption.
- **Holdout scenario authoring** (QA-authored cases withheld from the maker until accept) — the
  cleanest structural answer to build-loop gaming, but it changes how tasks are authored and is its own
  arc.
- **Reference ownership and arbitration** — 58.
- **The acceptance rule for tuning proposals** — 61.

## Stories

Partitioned in `ARCHITECTURE.md` ADR-007 by module cluster, on coupling measured with
`aof graph impact`. Every story is parallel-eligible except the one ordering edge named in ADR-007 §6
(57/05 lands before 57/01's gate turns on).

- [x] `00_story_the-watcher-node` — a watcher is a fourth node kind whose counter-metric is a required field, and which cannot declare an actuator at all
- [x] `01_story_independence-and-the-gate` — independence is computed from the records on four legs, and an unpaired optimizer stops being a warning
- [x] `02_story_examples-rows-in-the-parser` — the feature parser sees Examples rows, so the 20% of criteria that live in Outlines stop being invisible
- [x] `03_story_the-contract-integrity-ratchet` — the build loop's counter: four deterministic legs, discharge by pre-existing authority, and a refusal when the base commit cannot be resolved
- [x] `04_story_escape-and-intervention-counters` — the review loop is paired with finding-escape and the cascade with intervention rate, both counted from records that already exist
- [x] `05_story_the-pairing-table` — the day-one pairing table: every optimizing loop aof runs gets its watcher, shipped in the bundle

## Dependencies

- **52 (loop-registry-and-graph)** — pairing is a monitoring edge between declared loops, and the
  unpaired-optimizer check is 52's, promoted here from finding to gate.
- **55 (anchors-and-frozen-set)** — a counter-metric that is itself ungrounded just moves the gaming one
  hop. Pairing after ground, never before.
- **56 (gate-probe-feasibility)** — the build loop's counter-metric is chosen on that spike's finding;
  if probing proves unaffordable at useful granularity, this milestone pairs on something else and says
  so explicitly.
