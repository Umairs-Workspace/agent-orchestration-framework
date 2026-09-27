---
type: milestone
number: 58
slug: supervising-loops
title: "Supervising loops — reference ownership, timescale separation, arbitration"
status: done
owner: product-owner
created: 2026-08-13
updated: 2026-08-29
depends: [52]
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
# 58 · Supervising loops

## Objective

Two of the four ways a single loop fails are answered by the same structural move: **put a slower loop
above it**.

A task loop drives toward its `.feature` and nothing inside it can ask whether that feature is the
right target — the classic single-loop limit, where error is corrected without the governing variables
ever being questioned. ACD *has* the hierarchy as documents (task ← story ← milestone ← PRD ← human)
but not as **reference ownership**: no edge says which artifact owns which target, so revising a target
is an edit someone makes, not a cycle someone owns. The control-theory form of the fix is exact — a
higher loop sets the lower loop's reference signal — and it is the one aof is missing.

Meanwhile the loops aof runs pull on the same actuators. Cost and wall-clock optimisation, verify's
thoroughness, and the autonomy ladder's unattended reach all move the same knobs in different
directions, and today the tie-break is whichever concern the operator has front of mind that evening.
That is loop interaction, and the discipline's answer is an arbiter that owns the trade-off plus
enough **timescale separation** that a fast loop cannot thrash the reference a slow loop is trying to
hold. An outer loop that is not several times slower than its inner loop does not supervise it; it
fights it.

**This milestone makes ownership, timescale and arbitration explicit edges on the loop graph** — so
"who may change this target" is a query, changing one is a governed cycle, and competing adjustments
cannot oscillate.

## Scope

In scope:
- **`target-setting` ownership edges** making the reference hierarchy explicit (task ← story ←
  milestone ← PRD ← human), so every reference has a named owner and revising it is a governed cycle
  rather than an edit.
- **Declared timescale layers** per loop — fast operational, medium management, slow governance — with
  sparse inter-layer edges and a **minimum separation ratio**, so the timescale-inversion check 52
  reports becomes meaningful and enforceable.
- **A declared arbiter** for the standing speed vs thoroughness vs autonomy conflict, recording the
  trade-off as an owned decision rather than an evening's mood.
- **Anti-oscillation devices** on any competing adjustment — **ordering** (which loop runs first),
  **dwell time** (an adjustment must stand for N cycles before reversion is considered), and a
  **dead-band** (small variations do not trigger a reversion; only clear regressions do).

Out of scope:
- **Counter-metrics** (57) and **instrument audits** (59) — the other two of the four fixes.
- **Choosing the root reference.** The human owns what is worth controlling at all; this milestone only
  makes the chain of ownership below that explicit.
- **The self-tuning proposer and its acceptor** (62, 61) — this milestone declares who owns a knob, not
  the rule by which a proposed change to one commits.

## Stories

<!-- Broken down 2026-08-28 (`aof:refine 58 --autonomous`). The partition is graph-derived — see
     `ARCHITECTURE.md` ADR-007. Its defining property: no two stories write the same file, source or
     test, and each contended module AND each contended test file has exactly one owning story. The
     order is **58/00 → 58/01 → {58/02, 58/03}** — three stages with one parallel pair — on three
     named ordering edges: a record cannot declare a kind the schema does not admit; a gate must not
     arrive before the records that clear it; and the face cannot render a layer, a glyph or a
     reference-setter that no record has yet declared. The third edge was found at refine by the
     developer sweep, correcting an earlier claim that 58/03 was independent. -->

- [x] `00_story_the-supervision-vocabulary` — a fifth kind that records a trade-off and cannot act, plus the layer a loop declares (`src/work-loops.mjs`).
- [x] `01_story_the-reference-hierarchy` — the day-one hierarchy: five authored ownership edges, seven declared layers, one anchor and one arbiter, shipped and installed.
- [x] `02_story_layer-separation-and-the-gate` — the timescale check decides on layers, arbitration clears only on an arbiter, and the structural codes become errors.
- [x] `03_story_the-supervision-face` — `show` names each loop's layer and reference-setter, and every declared kind renders as its own shape.

## Dependencies

- **52 (loop-registry-and-graph)** — ownership, timescale and arbitration are all edges and attributes
  on declared loops. The unowned-reference, actuator-conflict and timescale-inversion checks are 52's
  reports; this milestone is what makes them satisfiable. Independent of 55–57 and parallel-eligible
  with them.
