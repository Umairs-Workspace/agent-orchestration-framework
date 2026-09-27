---
type: story
number: 81
slug: bounds-under-a-real-grader
title: "The loop's bounds survive a grader that takes real time"
status: done
owner: product-owner
created: 2026-08-24
updated: 2026-09-04
depends: [54]
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/54_milestone_verification-loop/ARCHITECTURE.md#ADR-003, wiki/work/54_milestone_verification-loop/ARCHITECTURE.md#ADR-005, wiki/work/54_milestone_verification-loop/ARCHITECTURE.md#ADR-007, wiki/work/54_milestone_verification-loop/ARCHITECTURE.md#ADR-008, wiki/work/54_milestone_verification-loop/ARCHITECTURE.md#ADR-009, wiki/work/54_milestone_verification-loop/OUTCOME.md, wiki/work/54_milestone_verification-loop/VERIFICATION.md, wiki/work/54_milestone_verification-loop/stories/03_story_feedback-rides-the-redrive/OUTCOME.md, wiki/work/69_milestone_loop-bounds/ARCHITECTURE.md#ADR-001, wiki/work/69_milestone_loop-bounds/ARCHITECTURE.md#ADR-002, wiki/work/69_milestone_loop-bounds/ARCHITECTURE.md#ADR-003, wiki/work/70_milestone_warm-start/ARCHITECTURE.md#ADR-003, wiki/work/53_milestone_loop-artifact/ARCHITECTURE.md#ADR-009, src/work-grade.mjs, src/loop-bounds.mjs, src/commands/grade.mjs, src/commands/loop.mjs, src/commands/drive.mjs, src/work-loop.mjs, src/phase-brief.mjs, src/run-store.mjs, src/effects/run-transitions.mjs, src/run-heartbeat-consumption.mjs, src/agent-session-driver.mjs, test/arch/acd-grade-read-face-never-executes.test.mjs, test/arch/acd-grade-record-envelope.test.mjs, test/arch/acd-loop-cap-single-home.test.mjs, test/grade-rubric-is-declared.test.mjs, test/grade-unconfigured-no-op.test.mjs, scripts/test.mjs]
files: [src/work-grade.mjs, src/loop-bounds.mjs, src/commands/grade.mjs, src/commands/loop.mjs, src/commands/drive.mjs, test/arch/acd-grade-bounded-single-spawn.test.mjs, test/arch/acd-loop-probe-contract.test.mjs, test/grade-spawn-bounded-and-single.test.mjs, test/grade-waits-without-blocking.test.mjs, test/grade-payload-bounded-in-the-writer.test.mjs, test/loop-resumed-redrive-declares-its-grade.test.mjs, test/loop-fix-transport-shape.test.mjs, test/loop-bounds.test.mjs, test/loop-gate-cost-ladder.test.mjs, test/loop-command-resume.test.mjs, test/loop-driven-row-carries-the-grade.test.mjs, test/loop-record-reaches-the-redrive.test.mjs, test/loop-cap-exhaustion-carries-the-record.test.mjs, test/warm-fix-loop.test.mjs, scripts/test.mjs]
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 81 · The loop's bounds survive a grader that takes real time

## User story

As an operator running `aof work loop` on a repository whose test suite takes minutes,
I want the loop's liveness and payload bounds to hold while the grader is actually working,
so that a healthy grade is not killed and retried as a stranded run, and the feedback it produces
does not arrive as an unbounded wall of text.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [x] [00 · The grade waits without blocking, and can never outlast the window that supervises it](tasks/00_the-grade-waits-without-blocking.feature)
- [x] [01 · The grade's failures are bounded where they are WRITTEN, not only where a human reads them](tasks/01_the-payload-is-bounded-in-the-writer.feature)
- [x] [02 · A re-drive the resume path reconstructed DECLARES that it carries no grade](tasks/02_a-resumed-redrive-declares-its-grade.feature)
- [x] [03 · The fix transport carries the findings and nothing else; the grade travels beside it](tasks/03_the-transport-carries-what-the-transport-needs.feature)

## Decisions taken at refine

Both forks the gaps left open were ADR-level, and a standalone story has no `ARCHITECTURE.md` — so
they are ratified in the contracts that raised them (the reasoning is stated in full there) and
recorded here so a reviewer sees the two choices in one place.

- **The headline fork — `task 00`. Both limbs, and the pinger reading REFUSED.** The discharge
  condition offered *"an async spawn that heartbeats while the runner works"* **or** *"a grade
  deadline resolved under the heartbeat window"*. The first limb's gloss is rejected on `69/ADR-003`
  — the heartbeat is stamped by **consumption**, and *"the producer is a hook, not a pinger"*; a
  grade that beat while it waited would defeat the liveness signal rather than satisfy it. What
  survives of limb one is the property actually worth having: **the spawn stops blocking the event
  loop**, so `SIGINT`, queued timers and every other run's heartbeat consumption keep working while
  the runner runs — and it produces no beat of its own. Limb two lands beside it, because the grade
  currently resolves `startToClose` (30 min), **twice the window it must survive**: the deadline
  becomes `min(startToCloseMs, heartbeatMs)`, **derived** in `69/ADR-001`'s single home from two
  values 69 already chose. **No new config key, no new default, no invented number** — the tuner's
  declared ranges are untouched. The cost is named and taken: a consumer repository whose rubric
  legitimately exceeds `heartbeatMs` gets a legible `runner-timeout` → `grade-indeterminate` halt
  instead of a silent reap, and the remedy is the one existing key `work.loop.heartbeatMs`.

- **The resume fork — `task 02`. The absence is DECLARED; no re-grade, no carried-forward grade.**
  Re-grading on resume would put a rung-3 spawn on a path `54/ADR-007 §1` prices as *once per
  completed build*; carrying the pre-interruption grade forward would present evidence about the old
  tree as evidence about the new one — 54's own defect shape. The declaration rides the `driven` row
  (`54/ADR-008 §2`'s per-drive, additive, unpinned place), so `LoopState` keeps its ten keys and
  `actShape()`'s whitelist is untouched. It appears **only where a rubric is declared**, so an
  unconfigured repository's document stays byte-identical (`54/ADR-002 §3`).

- **No value is invented anywhere in this story.** `task 01`'s ceiling reuses the entry count the
  operator render already declares (20) and the character ceiling `70` already declared for a payload
  handed to a maker; `task 00`'s deadline is derived from 69's two bounds. The story decides SHAPE,
  which is exactly what 54 was barred from doing.

## Notes

- **Why this is a story and not a milestone.** Four changes, one seam, one file — `src/commands/loop.mjs`
  and the grade path beside it. The scope was sized down from an initial six-item milestone at the
  operator's challenge; two of those items (the `loop.mjs` decomposition and a `src/**` line-ceiling
  ratchet) were dropped as not-a-defect and shared with 69/70, and one became [`82_spike_vacuous-control-detection`](../82_spike_vacuous-control-detection/SPIKE.md).

- **The headline task has been routed three times and refused three times.** Found at `54/01`, routed
  to `54/02`, made to bite by `54/03` — and every one of those contracts was structurally barred from
  fixing it, because `54/ADR-009 §1` forbids milestone 54 choosing a bound at all. A defect every
  receiving contract is barred from closing needs a contract of its own. That is this story.

- **The measurement it starts from, taken at 54's accept (2026-08-23).** `commands/grade.mjs` spawns
  with `spawnSync`, which blocks the event loop, and `work:grade` is a rung in `GATE_ORDER`. This
  repository's declared rubric runs in **116 s / 118 s** against `69/ADR-002`'s
  `DEFAULT_HEARTBEAT_MS` of **900 s** — a **7.8×** margin, so the fault is **latent here, not
  absent**. It reinstates in full for any declared rubric approaching the window, on this repository
  as its tier grows or on any consumer repository with a slower suite. The consequence when it fires
  is `69/ADR-002`'s stated one: *"kill the attempt and retry it"* — a healthy grade reaped as a
  stranded run.

- **The bound's VALUE is still not this story's to invent.** `53/ADR-009 §1` and `69/ADR-001` hold:
  the deadline resolves through `src/loop-bounds.mjs` as the single home. What this story decides is
  the SHAPE — whether the grade heartbeats while it waits, or is bounded under the window — which is
  an ADR-level act and is exactly what 54 could not take.

- **Prior art to read before refining**, so the seams are not re-derived: `54/ADR-003` (one bounded
  spawn site), `54/ADR-004 §2` (the project declares its hazards; aof guesses none), `54/ADR-008`
  (the record rides the run, `LoopState` keeps its ten keys, 54 builds no transport), `70/ADR-003`
  (the phase brief is bounded **in the writer** — the precedent the payload task should follow), and
  `54/03/OUTCOME.md` § Gaps, which states three of the four tasks as product state with discharge
  conditions.
