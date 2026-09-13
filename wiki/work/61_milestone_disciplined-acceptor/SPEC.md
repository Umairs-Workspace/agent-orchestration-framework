---
type: milestone
number: 61
slug: disciplined-acceptor
title: "The disciplined acceptor — the gate a self-tuning proposal must clear"
status: done
owner: product-owner
created: 2026-08-13
updated: 2026-08-31
depends: [55, 57, 59, 60]
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
# 61 · The disciplined acceptor

## Objective

Everything else in this arc exists so that this milestone can be honest.

A self-improving system's weak point is not its proposer — it is its **acceptor**. "Keep it if the
score went up" is uncontrolled adaptive multiple testing: the system p-hacks itself, and the measured
cost is 30–42% false commits and 10–33% actively harmful edits when a real improvement is hidden among
noisy proposals. A self-improving coding agent given a metric and write access to its own harness will
find the legitimate improvement *and* the one that deletes the detector. Neither of those is a model
failure; both are acceptor failures.

**This milestone ships the rule a harness-change proposal must clear before it applies.** A minimum
evidence count, the acceptance test spike 60 settles, a bounded step within declared floors and
ceilings, a dwell period before any reversion is entertained, full reversibility with the evidence
recorded alongside the change, and **report-only until the threshold is genuinely met** — because
"4 rulings, threshold 10, no change" is the machinery working correctly, not the machinery waiting.
The evaluation criterion is **frozen within the epoch being scored** and revisable only at an epoch
boundary, so a proposal cannot be accepted by a yardstick that moved while it was being measured.

What may be proposed at all is bounded by 55's frozen set: economics and cadence, never standards. What
counts as evidence is bounded by 55's anchors and 57's counter-metrics. Whether the instruments
producing that evidence still work is 59's answer. This milestone is the gate those three make
meaningful.

## Scope

In scope:
- **The commit rule** for any harness-change proposal: minimum evidence count, the acceptance test 60
  settles, bounded step within declared floors/ceilings, dwell before reversion, reversibility with the
  justifying evidence recorded alongside the change.
- **Report-only mode** as the default state, with the threshold and the current evidence count both
  visible — the machinery says what it is waiting for.
- **Epoch semantics** — the evaluation criterion frozen within the epoch being scored, revisable only
  at a boundary, so the evaluator cannot drift under a proposal mid-flight.
- **A registered command surface** for pending proposals, their evidence, their verdicts and their
  reversals, with a stable `--json` contract.

Out of scope:
- **Generating proposals** — 62. This milestone is the gate; that milestone is what walks up to it.
- **What may be tuned at all** — 55's frozen set draws that line, and this milestone enforces rather
  than redraws it.
- **Root references.** No proposal may author or revise what "better" means; that is exogenous,
  permanently.

## Stories

<!-- Broken down at `aof:refine 61` (2026-08-30), and repartitioned in the same session after the
     developer's feasibility pass. Landing order is
     {61/00 || 61/01 || 61/02 || 61/03} -> 61/04 -> 61/05 -> 61/06; see ARCHITECTURE.md ADR-012. -->

- [x] `00_story_the-clamp` — the one bound missing a ceiling gets one; the key that turns out to be
      two bounds is refused rather than given an invented range
- [x] `01_story_the-epoch-and-the-frozen-criterion` — an epoch is one milestone, its boundary is any
      transition into `done`, and the criterion cannot move while it is measuring
- [x] `02_story_the-observation-census` — a count that says what it filtered, or it is not a count
- [x] `03_story_no-executed-consumer-no-proposal` — a bound whose value reaches no decision refuses
      every proposal on it
- [x] `04_story_the-rule-and-the-ledger` — one commit condition, its crossing records derived from
      the criterion's own inputs, accruing across epochs
- [x] `05_story_the-event-a-ruling-raises` — the ruling and the knob it moves are written beside each
      other, and an undeclared event name is finally refused
- [x] `06_story_the-acceptors-face` — one command, report-only by default, every applicable refusal
      reported rather than only the first

## Dependencies

- **60 (acceptor-discipline)** — the acceptance rule itself is that spike's finding: a valid sequential
  test if aof's sample sizes admit one, and the defensible fixed-threshold rule if they do not.
- **55 (anchors-and-frozen-set)** — a rigorous test applied to a fabricated number is worse than no
  test. Evidence must be anchored, and the frozen set bounds what a proposal may touch.
- **57 (paired-loops)** — a proposal that improves a metric while degrading its counter-metric is not
  an improvement; the acceptor reads both.
- **59 (audit-loops)** — the acceptor trusts its instruments, so something must be checking that they
  still work.
