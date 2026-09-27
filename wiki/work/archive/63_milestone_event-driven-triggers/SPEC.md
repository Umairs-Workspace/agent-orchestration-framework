---
type: milestone
number: 63
slug: event-driven-triggers
title: "Event-driven triggers — the loop wakes without an orchestrator session"
status: done
owner: product-owner
created: 2026-08-13
updated: 2026-09-03
depends: [38, 53, 55]
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
# 63 · Event-driven triggers

## Objective

Nothing wakes aof's loop. It is human-invoked — someone types `/aof:autonomous` — which means a Claude
session must be the orchestrator for any work to start, and work that *should* begin on a signal
instead waits for someone to notice the signal.

Once the loop is a CLI entrypoint this becomes almost trivial, which is exactly why it is sequenced
last rather than first: **a trigger just calls the CLI.** A cron cadence, a mesh work-assignment, a PR
or CI signal, an inbound `aof:feedback` finding — each resolves to a plain `aof work loop <ref>` at a
declared autonomy level, with no session-as-orchestrator in the middle. The mesh is the execution
substrate; the trigger is a caller, not a coordinator.

The reason this milestone waits on the frozen set as well as the shell is that an unattended trigger is
the sharpest form of the autonomy question. A loop a human started is bounded by the human watching it.
A loop a webhook started is bounded only by what the machinery will refuse — so what an unattended run
may touch has to be declared and enforced before anything is allowed to wake one.

## Scope

In scope:
- **Trigger sources resolving to `aof work loop <ref>`** — a cron cadence over a range, a mesh
  work-assignment, a PR/CI signal, and an inbound `aof:feedback` finding.
- **A declared autonomy level per trigger** — a trigger states the level it runs at, and cannot exceed
  the Loop-Ready and groundedness bar that level requires.
- **Bounding by the frozen set** — what an unattended trigger may touch is the declared capability
  grant, enforced at the boundary, not a convention.
- **No orchestrator session** — the trigger path never requires a Claude session to act as the
  coordinator.

Out of scope:
- **Mesh dispatch topology** — leasing, reclaim, presence, routing — milestone 22+ territory; only the
  trigger→loop seam is touched here.
- **New runtimes** beyond `claude` / `codex`.
- **Fleet-level orchestration** — many concurrent loops with a supervisor rebalancing them is its own
  arc.

## Stories

Broken down 2026-09-01. The landing order is **{00 ‖ 01 ‖ 02 ‖ 03 ‖ 04} → 05** — five stage-1 stories
with no edge between them, and one convergence (`ARCHITECTURE.md#ADR-009`). **06 was added 2026-09-02**,
after 63/03's structural review found the composition defect `ARCHITECTURE.md#ADR-013` §1 routes here —
ADR-013's own ruling, not a re-partition: it `depends:` on 63/03 and could not be an edit inside it.

- [x] `00_story_the-trigger-declaration` — a trigger is reviewable data at `.aof/triggers.jsonc` with one pure compiler; a member that does not compile refuses the whole set, and the cadence grammar is imported rather than copied.
- [x] `01_story_the-level-is-a-ceiling-not-an-admission` — a declared level is a request the existing gate re-decides at every fire; a refused level is named, never silently downgraded.
- [x] `02_story_the-launch-envelope-compiles` — the frozen set's fourth enforcement point stops being a spelling and `gate-order` leaves `deferred`; every attended launch stays byte-identical.
- [x] `03_story_a-mesh-assignment-resolves-to-a-loop-call` — the one phase with a coordinator to remove dispatches a loop launch instead of a slash command typed into a session; the other three are byte-unchanged.
- [x] `04_story_the-signals-that-are-not-the-mesh` — a cadence, a CI signal and an inbound finding, each answering only *which scope*, never classifying and never inventing a scope.
- [x] `05_story_the-triggers-face` — one registered command whose whole output is a `work:loop` input and its argv, which launches nothing, and which owns the claim that the shipped declaration actually resolves.
- [x] `06_story_the-loop-launch-is-watched-as-a-loop` — the composed unattended launch stops being handed the session-shaped transcript watch over the worktree it writes its own sessions into; settlement falls through to the process exit the loop already has.

## Dependencies

- **53 (loop-artifact)** — the loop must be a CLI entrypoint before an event can call it. Without it a
  trigger would have to drive a prompt, which is the coupling this arc exists to remove.
- **55 (anchors-and-frozen-set)** — an unattended trigger is bounded by what the machinery refuses, so
  the capability grant must be declared and enforced before anything may wake a loop unattended.
- **38 (cross-machine-worker-execution)** — the mesh is the execution substrate a triggered run lands
  on, and the assignment path is itself one of the trigger sources.
