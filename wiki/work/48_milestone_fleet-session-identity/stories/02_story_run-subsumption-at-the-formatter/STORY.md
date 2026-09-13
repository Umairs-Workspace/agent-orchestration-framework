---
type: story
number: 02
slug: run-subsumption-at-the-formatter
title: "Run subsumption moves to the formatter — the wire carries every live session, the render keeps the line it always drew"
parent: 48
status: done
owner: product-owner
created: 2026-08-10
updated: 2026-08-11
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 02 · Run subsumption moves to the formatter

## User story

As the operator who will one day want to open a terminal on the machine that is *actually working*,
I want a session to stay on the wire even while its workspace has a run in flight,
so that the busiest session in the fleet is addressable instead of being the one session the wire
deliberately hides.

The benefit is challengeable and it is exact. Today
[mesh-launcher.mjs:585](../../../../../src/mesh-launcher.mjs#L585) filters a session OUT of
`sessions[]` when the same workspace has a running run —
`.filter((session) => !workspacesWithRuns.has(session.workspaceId))`. That is m38/ADR-004's *display*
rule, implemented on the *wire*. The consequence: the moment a node picks up assignment work, its
session disappears from the only record that could name it, and this milestone's whole premise — any
live session is addressable — fails precisely where it matters most. After this story the wire is
complete, the policy lives in the one pure formatter that renders the line, and what the operator
sees is byte-identical to what they see today.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [ ] `tasks/00_the-wire-carries-every-live-session.feature` — the producer's subsumption filter is
      gone: a live session in a workspace that also has a running run is PRESENT in `sessions[]` with
      `workspaceHasRun: true`, and `activeRuns` still carries that run unchanged
- [ ] `tasks/01_the-formatter-keeps-the-line.feature` — `fleetCurrentWorkLines` applies the policy at
      the render: exactly one line for a run+session workspace (no duplicate `(session)` line), and the
      session-only and run-in-A + session-in-B cases render exactly as they do today

## Notes

**This is the milestone's ONLY behaviour-changing merge, and it is isolated on purpose** so it gets
its own review. Its two halves must merge atomically: a window in which the wire is complete but the
formatter still ignores `workspaceHasRun` renders a duplicate `working · <repo> (session)` line beside
a real run line. That is why `ui/src/fleet/runs.mjs` is not split into its own story.

**Merge-order edge: after story 01** (it needs `workspaceHasRun` to exist on the entry). Not a build
order — both are buildable in parallel.

**The amendment inverts a live assertion, and it ships in this change.**
[test/arch/acd-session-run-reconciliation.test.mjs:138](../../../../../test/arch/acd-session-run-reconciliation.test.mjs#L138)
today asserts *"the SAME-workspace session is subsumed — absent from the assembled `sessions[]`"*. It
goes RED the moment the filter is deleted. Amending it is part of this story's work, not a follow-up:
the producer side now asserts the session is PRESENT with `workspaceHasRun: true`, the formatter side
asserts the SAME rendered outcome as before, and the other two producer-fed cases keep their existing
assertions unchanged — which is the proof that ADR-004's rendered behaviour is preserved rather than
merely claimed.

**No UI work, despite touching `ui/`.** `ui/src/fleet/runs.mjs` is a framework-free pure projection
(no React, no DOM, no I/O — see its own header); this story adds one policy line to it. No component,
layout or interaction changes.

**The blast radius is small and the graph says why.** `src/mesh-launcher.mjs` is a sink — 36
dependencies, 2 dependents (`commands/mesh-serve`, `mesh-worker-execution`) — so nothing downstream
re-reads the assembler. `ui/src/fleet/runs.mjs` has 2 dependents (`Fleet.tsx`, `scope.mjs`) plus the
four tests that already prove ADR-004. Per ADR-009 the launcher gets *shorter*: the session block is
deleted, not relocated — the `workspaceHasRun` stamp lands in `readLiveSessions` (story 01), giving
the session projection one home.

**The desktop app needs no change and no cargo build.** The Rust `current_work` short-circuits on
`!runs.is_empty()` before it reads sessions, so the added entry is never rendered there.

Governing ADRs: **004** (subsumption moves to the formatter; the wire carries the fact, not the
policy; m38/ADR-004's rendered behaviour preserved byte-for-byte), **009** (one home for the session
projection).
Fitness function this story amends: `acd-session-run-reconciliation` (its central assertion inverts —
see above).
