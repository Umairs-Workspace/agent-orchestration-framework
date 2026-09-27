---
type: story
number: 05
slug: blocked-releases-its-slot
title: "The largest lost-time category stops holding capacity — a blocked run parks and comes back"
parent: 69
status: done
owner: product-owner
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
# 05 · The largest lost-time category stops holding capacity — a blocked run parks and comes back

## User story

As an operator whose machine sits idle behind a run that is waiting for an answer nobody has given
yet,
I want a run blocked on a human to **release its slot**, terminate its process, and resume the same
conversation when the answer arrives,
so that waiting on me stops costing capacity, and the answer I eventually give does not pay for a
cold restart.

**Blocked-on-human is the largest recorded lost-time category in all six instrumented milestones** —
107h28m in m47, 58h05m in m48, 46h38m in m50. Today a `needs-input` outcome reports the assignment
as `running` with a code, so the row stays live and the slot stays held; a blocked run and an
eleven-hour run look identical to the scheduler. Worse, a pending question holds the **PTY itself**
open while it out-waits the 15-minute idle window.

Every comparable system releases the slot: Inngest's `step.waitForEvent()`, Cloudflare's
`waitForApproval()` hibernating the Durable Object, Temporal's *"while waiting, the agent consumes
no compute resources."*

## Tasks

- [x] `tasks/00_a-blocked-run-parks.feature` — a run detected as waiting on a human parks: the process exits first, the park is published once and applied durably, the conversation is preserved, and the row leaves the counted set
- [x] `tasks/01_the-park-resumes-the-same-run.feature` — answering resumes the same conversation and the same run record, admitted before a process exists, never a second attempt

## Notes

- **One park concept, two causes.** The parking machinery already exists, built for session limits
  after the vista-app 348 post-mortem: `resumeAfter`, `parseResumeAfter`, `DEFAULT_PARK_MINUTES`,
  `retryReadiness`, the `retry-parked` loop stop. A blocked run parks through the same gate.
- **The run stays `running` and the record gains nothing.** No new state, no new failure reason, no
  retry lineage. `RETRYABLE_REASONS` would turn a park into a second attempt, and the resume path's
  own comment already states the rule: *"a needs-input park is the same run resuming, never a
  second record."* `src/run-store.mjs` has seventeen `src/` dependents; FF-6908 pins that this
  milestone adds nothing to it.
- **The park fact rides a column that already exists.** The worker already writes the
  `needs-input` code onto the assignment row. 69/04's counted set already excludes it. This story
  is the other half of that contract.
- **Detection is the explicit signal, and only that — the contract's two review blockers
  (2026-08-22) both land here.** A pending human-input tool call is detected directly, so the park
  need not wait fifteen minutes. **Silence is not a park signal.** A block the detector misses is
  observationally just "no tool results", which is what 69/02's liveness deadline already kills and
  retries — the runtime cannot read human intent out of silence, and one signal cannot carry two
  terminal behaviours. So a missed block costs an attempt and is retried; exhaustion preserves the
  worktree under `on-max-attempts: pause`. **No fifth timeout is introduced**, and 69/02 keeps the
  silence path whole.
- **A slot is released by an APPLIED park, never by an attempted one.** Two defects, one rule.
  Today the capacity code is published mid-flight, while the PTY is still alive and can still be
  answered in place — the scheduler admits new work onto a machine that is still hosting the
  blocked session. And the durable channel the settle rides refuses non-terminal reports on
  arrival (`state-not-terminal:running`), so the park is carried durably and then discarded, paid
  for a row it never changed. The park is published **once**, **after a confirmed exit**, and it
  releases nothing until the row carries it. ADR-007's 2026-08-22 amendment and FF-6909 pin both
  halves.
- **The resume path exists and is used.** `--resume` attaches a new process to the same persisted
  conversation, `sessionId` is already persisted at spawn (68/01), and the worker already has a
  branch that continues a paused run rather than minting a second one. What the amendment adds is
  the mirror ordering: the park's code is **cleared before a resumed process exists**, never after,
  so the counted set never under-counts a live process. Refusing an answer at a target that is over
  its bound is **69/04's door** — a second admission check here would be the second
  concurrency-resolution site FF-6907 forbids, and would give this story a dependency it does not
  need.
- **Starts immediately** — it depends on nothing, because everything it consumes is already
  written.

## Review history

- **2026-08-22 — returned to `blocked` by architect review, contract amended at refine.** Two
  blockers: a cross-story contradiction (silence parking here vs. killing-and-retrying in 69/02)
  and a protocol defect (the capacity-releasing fact published before PTY exit, over a channel
  that does not apply it). Both are resolved in the contract above rather than left to the build;
  the 65cb617 implementation is measured against the amended contract, not the original.
