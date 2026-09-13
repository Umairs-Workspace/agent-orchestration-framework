---
type: milestone
number: 52
slug: loop-registry-and-graph
title: "Loop registry & the loop graph — aof's improvement machinery, declared and checkable"
status: done
owner: product-owner
created: 2026-08-13
updated: 2026-08-15
depends: [08, 20]
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
# 52 · Loop registry & the loop graph

## Objective

aof runs at least seven control loops — build-to-green, review→fix→re-review, verify→triage→accept,
the autonomous cascade, run resilience, retrospective→memory-ingest, and (proposed) observe→tune. Every
one of them is real, and only one of them — run resilience — is written down as machinery rather than
prose. Nothing enumerates the set, so nothing can check it.

**This milestone makes aof's own improvement machinery a declared, traversable, checkable artifact.**
Each loop becomes a first-class work-stream record — `{controlled variable, reference, measurement,
actuator, cadence, owner}` — and the loops are connected by a closed edge vocabulary so the *network*
is legible, not just the list: **data-feed**, **target-setting** (who owns this reference),
**monitoring** (who watches this metric), **veto/constraint** (what may stop this loop), and
**parameter-tuning** (what may adjust this loop's knobs). `depends` stays what it is — the item-level
edge — and becomes one edge type among several rather than the only relation aof can see.

The payoff is immediate and deliberately unglamorous: because the graph is declared, its pathologies
become **algorithms rather than opinions**. A strongly connected component with no path to a ground
truth is ungrounded by construction; an optimizing loop with no monitoring edge is unpaired; a
reference with no target-setting owner is blind; two loops sharing an actuator with no arbiter will
fight; an outer loop that is not meaningfully slower than the loop it supervises will thrash it. All
five are computable over the declared graph and all five are reported by `validate` here.

This milestone ships as a **faithful description of the loops aof runs today** — not an aspiration —
so it is verifiable on day one and every later milestone in this arc has somewhere to attach.

## Scope

In scope:
- **Loop records** — each control loop declared as a work-stream artifact carrying its controlled
  variable, reference, measurement, actuator, cadence and owner; authored for the loops that run today.
- **The closed edge vocabulary** — data-feed, target-setting, monitoring, veto/constraint,
  parameter-tuning — authored between the declared loops, with `depends` retained unchanged as the
  item-level edge.
- **`work:loops` in the command core** — `show` / `graph` / `validate` registered with stable `--json`
  contracts, per the milestone-08 rule that every observable is a command first.
- **The structural checks, reported** — ungrounded strongly-connected components, unpaired optimizing
  loops, references with no owner, actuator conflicts with no arbiter, and timescale inversions. In
  this milestone they are **findings, not enforcement**.
- **One readable rendering** of the graph an operator can look at and recognise.

Out of scope:
- **Anchors, the frozen set and any enforcement** — the checks report here; ground and teeth arrive in
  55.
- **Pairing, ownership hierarchies, arbitration and audits** — 57, 58, 59; this milestone only makes
  their absence visible.
- **The loop engine.** `aof work loop` is 53. This milestone declares what runs; it drives nothing.
- **graphify's codebase graph** (09–11) — a different graph, advisory, untouched. The `graph:*`
  namespace is taken, hence `work:loops`.
- **A graph database or query language** — the work stream is the store; queries are commands.

## Stories

<!-- Broken down 2026-08-14 (`aof:refine 52 --autonomous`). The partition is graph-derived — see
     ARCHITECTURE.md §Story partition. Its defining property: no two stories edit the same file, and
     exactly ONE story edits exactly ONE pre-existing source file (`src/command-core.mjs`, six lines).
     `src/work.mjs` (240 dependents) is edited by nobody. 00, 01 and 03 start concurrently. -->

- [x] `00_story_loop-model-and-loader` — the frozen schema, read into plain data (`src/work-loops.mjs`).
- [x] `01_story_structural-checks` — the five pathologies as pure algorithms (`src/work-loops-checks.mjs`).
- [x] `02_story_work-loops-command-family` — `work:loops show|graph|validate` + the Mermaid rendering. *(depends 00, 01)*
- [x] `03_story_the-day-one-registry` — nine evidence-cited records of the loops aof runs today. *(depends 00, verification-time only)*
- [x] `04_story_the-fitness-functions` — FF-5201…FF-5209, landed green. *(depends 00–03)*
- [x] `05_story_behavioural-suites` — the 15 `@executable` features of 00–02 as registered, re-runnable
  suites. *(depends 00, 01, 02, 04; added 2026-08-15)*

<!-- 05 was added after 04's review measured that 00, 01 and 02 shipped 1,176 lines of src/ with zero
     test suites, leaving their 15 @executable features mechanised by nothing and this milestone's
     VERIFICATION evidence unfalsifiable. It is not a sixth deliverable — it is the missing evidence for
     three already-accepted ones. TECH_DEBT.md item 48 / VERIFICATION.md F-52-04-H. -->


## Dependencies

- **08 (cli-command-core)** — every observable in this arc is a registered command with a `--json`
  contract before it is a face; the loop registry is authored into that core, not beside it.
- **20 (autonomous-run-resilience)**, and through it 19 — the run store's transition validator, failure
  classification and attempt ceiling are the one loop in aof that already behaves like an engineered
  controller, and its records are what the registry declares over. The registry must describe that
  machinery, never duplicate it.
