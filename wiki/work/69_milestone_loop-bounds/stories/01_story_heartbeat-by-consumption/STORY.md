---
type: story
number: 01
slug: heartbeat-by-consumption
title: "A live run that is provably alive — the producer that was never wired, wired by consumption"
parent: 69
status: done
owner: product-owner
depends: [69/00]
schema: 1
created: 2026-08-21
updated: 2026-08-23
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 01 · A live run that is provably alive — the producer that was never wired, wired by consumption

## User story

As an operator who cannot tell a working run from a dead one,
I want a run's liveness stamped by the **tool results it is actually producing**, and a reaper that
acts on the absence of them,
so that a run that has stopped doing anything is detected in minutes rather than being discovered by
hand eight days later.

`run-store.heartbeat()` has **zero callers in `src/`**. `heartbeatAt` is `null` from mint to
terminal, so `isStale` silently degrades to `updatedAt` — which only moves on a state transition —
and `autonomous.md` instructs the operator to detect orphans by a field that is always null. Run
`46/00` has read `running` since **2026-08-08**.

The tempting fix is a pinger, and it is worse than nothing: a pinger proves the pinger is alive. The
two 11h07m runs would have pinged faithfully for eleven hours. **Stall means no new tool-result
events, not no ping** — Restate's inactivity timeout, and the shape Temporal's heartbeat-carries-
details assumes.

## Tasks

- [x] `tasks/00_the-hook-stamps.feature` — a `PostToolUse` hook in the driven session records liveness for the run named in its environment, deriving nothing and exiting 0 on every path
- [x] `tasks/01_the-reaper-acts.feature` — the periodic scan reaps a run whose liveness has gone stale against the one declared threshold, through the reclaim edge that already exists
- [x] `tasks/02_one-staleness-constant.feature` — the threshold, the reclaim path and the driver's idle window all resolve to the same value, and the dual-staleness gate gets a real second signal

## Notes

- **The hook is the second instance of a shipped shape, not a new mechanism.** `src/bundle/hooks/`
  already holds `claude-artifact-sync.json` + `artifact-sync-enqueue.mjs`, installed by
  `aof work init` / `aof work update`, `aofManaged`-marked, content-hashed and drift-protected. The
  rule that file learned the hard way is the rule this one is born with: **derive nothing** — no
  workspace identity (TECH_DEBT item 4 silently discarded 100% of worker→control frames for days),
  no `src/` import, no store open, no cwd derivation, and **exit 0 always** because `PostToolUse`
  cannot block.
- **The run's identity is handed in, never derived.** 68/01 already sets
  `OTEL_RESOURCE_ATTRIBUTES` at the spawn env seam, after the IDE-attachment scrub, carrying
  `run.id`. Env is per-process and untracked — the absolute-path-in-a-tracked-file failure that bit
  `artifact-sync-enqueue.mjs` (a `git worktree` inherits `.claude/settings.json` verbatim) cannot
  recur through this route.
- **The reaper reaches the edge that already exists.** `reclaimRun` was consolidated into one home
  by m42 precisely because "how a run is reclaimed" had been written out twice. This story adds a
  caller, not a third copy.
- **Named overlap with 69/04:** both edit `src/mesh-assignment-reclaim.mjs` — this story the
  reclaim half, 69/04 the dispatch loop. Two separate function bodies that do not call each other.
- **Named overlap with 69/02 and with milestone 70/01:** three distinct halves of
  `src/agent-session-driver.mjs` — this story the spawn **env**, 69/02 the **session lifetime**,
  70/01 the launch **argv**. See ARCHITECTURE § Story partition.
