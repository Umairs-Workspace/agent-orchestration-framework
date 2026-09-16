---
type: milestone
number: 69
slug: loop-bounds
title: "Loop bounds — deadlines the runtime enforces, and the cap's value"
status: done
owner: product-owner
created: 2026-08-16
updated: 2026-08-24
depends: [68]
origin: [../../planning/PRD-acd-loop-performance.md, ../../planning/RESEARCH-agent-loop-economics.md]
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context
  (ARCHITECTURE / DESIGN / RESEARCH / UAT live in this folder too, conditionally).
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# 69 · Loop bounds — deadlines the runtime enforces, and the cap's value

## Objective

**There is no token limit, no turn limit, no wall-clock limit and no cost ceiling anywhere in the
aof runtime.** The interactive claude PTY path has no timeout at all. What bounds exist are either
unwired, dead, or delegated to a language model's good behaviour:

- **The heartbeat is a producer nobody calls.** `run-store.heartbeat()` (`src/run-store.mjs:647-653`)
  has zero callers in `src/`. `heartbeatAt` is therefore `null` from mint to terminal, `isStale`
  silently degrades to `updatedAt` (`:668`), and a live run is indistinguishable from a dead one.
  `autonomous.md:57-59` tells the operator to detect orphans by that field. Run `46/00` has read
  `running` since 2026-08-08.
- **The concurrency bound is prose.** `dispatchReadySet` (`src/work-dispatch.mjs:205-235`) — the only
  bounded worker pool in the repo — has no production caller. `aof work dispatch` computes `bound`
  and hands it to an agent to respect (`continue.md:66-88`). On the mesh side there is no bound at
  all: the control tick dispatches every connected `assigned` row, every 15 s.
- **A blocked run looks identical to a working one.** Blocked-on-human is the largest recorded
  lost-time category in all six instrumented milestones — **107h28m in m47, 58h05m in m48,
  46h38m in m50** — and that wait currently holds a concurrency slot.

The cost is measured. Runs `47/01` and `47/02` each burned **11h07m before failing**, then succeeded
in **15.9 minutes** on retry — 22 hours of wall-clock that produced nothing, replaced by 32 minutes
of work. That is not a hard problem. It is a missing deadline.

**This milestone also picks the cap's value, which is what four other milestones are waiting on.**
Milestone 54 (verification-loop) is `not-started` because it *"enforces a bound; it does not invent
its value"*, and the arc that owns the value had no milestone. Milestones 53, 62 and 65 defer to the
same PRD. The value is now derivable from evidence rather than taste, and
[RESEARCH-agent-loop-economics.md §7](../../../planning/RESEARCH-agent-loop-economics.md) derives it.

Every mechanism here is table stakes in Temporal, Restate, DBOS, Inngest and Step Functions, and
most of it is available as flags on the CLI aof already spawns.

## Scope

In scope:
- **The cap's value, declared and defensible.** Review→fix→re-review **N = 1** by default, a second
  round only on a named blocker. Build-to-green bounded on *failure to progress* — stop after two
  consecutive rounds with no reduction in the failing-scenario count — rather than an arbitrary
  iteration count. `maxAttempts` stays at 3, paired with a total-duration ceiling. These land as a
  declared bound the loop registry validates, so milestone 54 has a number to enforce.
- **The four timeouts.** Schedule-to-start (alert and escalate, never retry), start-to-close (kill
  and retry, per attempt, ~30 min as the evidenced starting value), schedule-to-close (give up,
  escalate), and heartbeat. A startup grace so worktree creation and dependency install are not
  mistaken for a stall.
- **Heartbeat by consumption, not by pinging.** An async `PostToolUse` hook stamps `heartbeatAt`;
  a reaper enforces the deadline. Stall means *no new tool-result events*, not *no ping*.
- **A progress ledger.** Liveness is not progress: the 11h07m runs were almost certainly
  heartbeating fine while looping. Objective proxies — lines changed, files touched, commits, tests
  newly green — with `maxStalls` → reset with a summary, `maxResets` → escalate.
- **In-process caps at the spawn site.** `--max-turns` and `--max-budget-usd` where the spawn path
  supports them, and an out-of-process wall-clock kill for the interactive PTY path, which is the
  path aof actually uses.
- **Real concurrency enforcement.** A slot acquired before work is accepted: a mesh-wide lease
  keyed in the store for the global bound, in-process limiting for the per-machine bound. The prose
  bound and the dead worker pool are resolved into one live mechanism.
- **Blocked-on-human runs release their slot.** Terminate the process, persist
  `{sessionId, resumeSessionAt}`, register a durable timer, drop the lease, resume on answer.
- **`on-max-attempts: pause`, not kill.** An exhausted run preserves its worktree for triage.

Out of scope:
- **Prompt-level discipline** — where the cap is *spoken* to the agent, how review rounds are
  worded, findings-become-work-items — is milestone 71. This one makes the bound real in the
  runtime; 71 makes the prompts agree with it.
- **Spend routing.** Cheaper models for cheaper phases is milestone 70's warm-start work.
- **Mesh dispatch topology** — leasing semantics beyond the concurrency slot, presence, reclaim
  cadences — remains milestone 22+ territory.
- **Escalation ladders for human approval** (reminder → escalate → timeout policies). Releasing the
  slot is in scope; designing the notification ladder is not.

## Stories

<!-- Populated at break-down (`aof:refine 69`, 2026-08-21). The partition and its graph rationale
     live in ARCHITECTURE.md § Story partition. -->

- [x] `stories/00_story_the-declared-cap` — the number four milestones are waiting on: N=1 on review, failure-to-progress on build, `maxAttempts` paired with a total ceiling, resolvable from one home and declared in the loop registry
- [x] `stories/01_story_heartbeat-by-consumption` — the producer that was never wired, wired by consumption: a `PostToolUse` hook stamps liveness, the periodic scan reaps on its absence, one staleness constant
- [x] `stories/02_story_the-four-deadlines` — deadlines aof enforces against a process it holds, because the CLI's own caps are unreachable on this path (measured — see ARCHITECTURE § Corrections, item 1)
- [x] `stories/03_story_progress-not-liveness` — the signal a heartbeat cannot give: a progress ledger over deterministic proxies, `maxStalls` → reset, `maxResets` → escalate
- [x] `stories/04_story_slots-before-work` — a slot acquired before work is accepted: the dead worker pool resurrected for the machine, the control tick bounded for the mesh
- [x] `stories/05_story_blocked-releases-its-slot` — the largest measured lost-time category stops holding capacity: a blocked run parks, releases its slot, and resumes the same conversation
- [x] `stories/06_story_the-ledger-binds-the-build-loop` — **added at verify (finding F-69-V7)**: the progress ledger 69/03 delivered has zero importers in `src/`, so the build loop never consults it — the leaf gets the caller its own features never demanded

**Sequencing.** 69/00, 69/04 and 69/05 start together; 69/01, 69/02 and 69/03 follow 69/00, which
supplies the resolver each reads.

## Dependencies

- **68 (loop-telemetry)** — a bound you cannot measure is a bound you cannot tune. The progress
  ledger consumes 68's per-phase record, and the before/after on every cap here is 68's output.

## Unblocks

- **54 (verification-loop)** — takes the cap's value from this milestone and enforces it.
- **53 (loop-artifact)**, **62 (self-improvement-loop)**, **65 (concurrent-story-dispatch)** — all
  defer loop economics to the loop-performance arc.
