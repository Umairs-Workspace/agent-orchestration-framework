---
type: milestone
number: 59
slug: audit-loops
title: "The audit loop — watching the instruments, not the work"
status: done
owner: product-owner
created: 2026-08-13
updated: 2026-08-30
depends: [55, 56, 57, 58]
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
# 59 · The audit loop

## Objective

The fourth way a loop fails is the quietest: its **measurement rots** while the dashboard stays green.
Sensors drift, definitions shift under the metric, and measurement slides from checking reality into
checking paperwork.

aof has done this twice, on the record. `TECH_DEBT.md` item 5 — *"Part of the fitness gate is dead"* —
found 10 of 700 arch tests failing before any change, test files reading modules that no longer
existed, and a gate that "reads green-ish while not running". It was repaired by hand in milestone 42
and **nothing watches for the recurrence**. Separately, ACD's `@manual` evidence is written by the same
agents that did the work, which produced exactly the predicted failure: evidence subagents authoring
record docs and recording decisions no node was entitled to make.

**This milestone gives aof an audit loop whose only subject is the instruments.** It does not review
the work, and it does not answer to the loops it audits. It probes the gates by deliberately breaking
what they claim to protect, re-runs `@manual` evidence for reproducibility, detects anchors that have
gone stale, and — the part that catches the silent failures — **reports absence explicitly**: which
gate ran on nothing, which channel has been silent for weeks, which loop has not moved its metric in N
cycles. A dashboard cannot stay green through an audit that names what is missing.

It reports to reference-owners rather than to the audited loop, and it may escalate straight past the
hierarchy when what it finds is serious — the emergency channel a governed system needs so bad news
does not have to travel through the party responsible for it. Its second job is pruning: a declared
loop nobody consults, an edge nobody queries, a metric nobody acts on comes out of the graph.

## Scope

In scope:
- **A cadenced, independent audit pass** whose inputs are anchors and whose subject is the measuring
  apparatus — never the work product.
- **Gate probing** — deliberately break the invariant, confirm the gate fails; the direct recurrence
  guard for "part of the fitness gate is dead", at the granularity spike 56 finds affordable.
- **`@manual` evidence reproducibility** — re-run recorded evidence rather than reading it, closing the
  agent-writes-its-own-evidence gap.
- **Stale-anchor detection** — an anchor that has not been refreshed is not an anchor.
- **Explicit absence reporting** — gates that ran on nothing, silent channels, loops whose metric has
  not moved, all named rather than omitted.
- **Reporting to reference-owners, with an escalation channel that bypasses the audited loop.**
- **Dead-loop pruning** — the audit removes the graph's own dead weight.

Out of scope:
- **Judging the work** — that is verify's, and pairing's. The audit judges instruments.
- **Agent-as-judge auditing** for the questions deterministic probes cannot answer (was the evidence
  actually *used*) — a later arc, and never the same model judging its own output.
- **The acceptor** (61), which consumes this milestone's verdicts but is its own rule.

## Stories

<!-- Broken down 2026-08-29 (`aof:refine 59 --autonomous`). The partition is graph-derived — see
     `ARCHITECTURE.md` ADR-008, on the 2026-08-29 build (13,031 nodes / 31,815 edges). Its defining
     property: no two stories write the same source file, and each contended test file has exactly one
     owning story. The order is **{59/00 ‖ 59/01} → {59/02 ‖ 59/03} → 59/04** — three stages with two
     parallel pairs — on two named ordering edges: the evidence lane imports the census story's bounded
     spawn seam, and the checks read the vocabulary story's `auditor` kind and its `checked:` key. -->

- [x] `00_story_the-auditor-kind` — a sixth kind whose subject is the instruments and which has no vocabulary for acting, plus the `checked:` date an anchor declares (`src/work-loops.mjs`).
- [x] `01_story_the-instrument-census` — registration decided by what the runner assembled rather than by its source text; the twenty-six de-armed suites re-armed; and the one bounded spawn seam.
- [x] `02_story_evidence-re-run` — the fitness register is executed rather than read, judged on the failure message, and a citation that could not run says what was tried.
- [x] `03_story_staleness-silence-and-the-prune` — an anchor nobody refreshed, an instrument nobody heard from, a metric that has not moved, a loop nobody consults.
- [x] `04_story_the-audit-face` — `aof work audit`, findings addressed to the reference-owner and never to the audited loop, an escalation bypass, and the day-one auditor record.

## Dependencies

- **55 (anchors-and-frozen-set)** — an audit with nothing to settle against is one more ungrounded
  loop. The audit's only inputs are anchors, so the anchors must exist first.
- **56 (gate-probe-feasibility)** — the audit's cadence, granularity and cost are sized on that spike's
  finding; probing is the core mechanic and its affordability is the open question.
- **57 (paired-loops)** — the counter-metrics are part of what the audit checks; auditing an
  unpaired system audits half a picture.
- **58 (supervising-loops)** — added at refine, 2026-08-29. The SPEC's *"reports to reference-owners
  rather than to the audited loop"* is only computable once `target-setting` edges exist: the addressee
  of a finding is the node that owns the audited loop's reference, and 58 is what declares that edge.
  Without it every finding would escalate for want of an owner, which is the degraded path, not the
  design. See `ARCHITECTURE.md` ADR-006 §2.
