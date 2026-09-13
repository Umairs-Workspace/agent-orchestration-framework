---
type: story
number: 04
slug: slots-before-work
title: "A slot acquired before work is accepted — the dead worker pool resurrected, the mesh bounded"
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
# 04 · A slot acquired before work is accepted — the dead worker pool resurrected, the mesh bounded

## User story

As an operator whose machine has a concurrency limit that is currently a sentence in a prompt,
I want a slot **acquired before work is accepted**, on both the machine and the mesh,
so that "at most N at once" is a property of the system rather than a request to a language model.

`dispatchReadySet` is the only bounded worker pool in this repo. It has `peak`/`ranAtOnce`
instrumentation, a documented reason for its default, and a comment that opens *"THE BOUND IS
ENFORCED, NOT ADVERTISED"* — and it has **no production caller**. `aof work dispatch` computes
`bound` and hands it to an agent to respect. On the mesh side there is no bound at all: the control
tick dispatches every connected `assigned` row, every 15 seconds.

Nobody credible hands a number to the worker and asks nicely. Temporal has slot suppliers, DBOS has
`Queue(concurrency=, worker_concurrency=)` — a global/local split backed by a database, which is
precisely aof's shape — Inngest has `concurrency: {limit, key, scope}`.

## Tasks

- [x] `tasks/00_the-pool-gets-its-caller.feature` — the ready set runs through the bounded pool that already exists, at most `bound` at once, with the remainder dispatched as lanes free
- [x] `tasks/01_the-mesh-tick-is-bounded.feature` — the control tick consults the counted set before dispatching, and a row over the bound stays assigned for a later tick
- [x] `tasks/02_the-lane-is-the-slot.feature` — the local slot is the LANE, counted before one is materialised: reuse is free, each open counts against the next member, over the bound is a per-member refusal carrying a code
- [x] `tasks/03_admission-survives-restart-and-resume.feature` — occupancy is proved by the row's own state so it outlives the scheduler, and a parked run's answer re-acquires a slot or is refused

## Notes

- **Resurrect, do not delete.** STATE is explicit that "deleting the dead function and keeping the
  prose is *not* an option the evidence supports; the reverse is". The pool is real code with real
  instrumentation and a worker-pool (not barrier) design that already avoids the serialisation cost
  this milestone is about.
- **The mesh half extends a branch that already exists.** The dispatch loop already contains
  `if (!connected) continue;` — *leave the row assigned, dispatch on a later tick, never a silent
  drop and never a loud error.* "Over the bound" is that same branch with a different predicate.
  That branch also already carries a hard-won lesson: the dispatch RESULT gates the once-guard,
  because a send that silently did not go out was never retried and a real assignment sat stuck for
  24h+.
- **No lease table, no claim file, no new column.** `src/mesh-lease.mjs` does not exist — the m26
  leasing machinery was deleted in m34's "global mesh only" correction and its tests are parked,
  unrunnable, under `35_milestone_mesh-work-assignment/reference/`. A slot is a count over
  `global_assignments` rows, not a persisted object with its own lifecycle to get wrong.
- **The counted set excludes parked rows from day one** — the `needs-input` code is *already*
  written by the worker, so this story is correct before 69/05 lands. 69/05 makes the park real;
  this story makes it count. That contract is what lets the two run in parallel.
- **The bound keeps its existing single home.** `work.dispatch.concurrency` has exactly one reader,
  pinned by `acd-dispatch-bound-single-home`. This story does not move it into 69/00's leaf, which
  is why it depends on nothing and starts immediately.
- **Named overlap with 69/01:** both edit `src/mesh-assignment-reclaim.mjs` — this story the
  dispatch loop, 69/01 the reclaim half. Two separate function bodies that do not call each other.
- **What this story does NOT do:** rewrite the prose bound in `continue.md`. That is a prompt-layer
  edit and belongs to 71. This story makes the prose unnecessary.

## Re-refined 2026-08-22 — the two review blockers, and what tasks 02/03 add

The first wave built 00 and 01 and then failed independent review on two counts. Both were contract
gaps rather than build defects, so they are closed by contract: **tasks 00 and 01 are delivered and
immutable, and neither was edited.** ADR-006 carries a dated amendment; tasks 02 and 03 encode it.

- **Blocker 1 — a production caller is not an admission authority.** `dispatchReadySet` got its
  caller, but the pool's lane frees the instant the *worktree* exists, before any agent starts, and
  the developer process is spawned later by the orchestrator. So the peak measured was
  worktree-creation concurrency. **The lane is now the local slot** — git's own durable record,
  spanning the real worker lifetime, no lease store. Task 02.
- **Blocker 2 — admission was not reserved across ticks or resume.** Occupancy rested partly on a
  reservation living in the scheduler's memory, which a restart erases, leaving an `accepted` row
  counted by nobody; and nothing re-checked the bound when a parked run's answer arrived.
  **Occupancy is now proved by the row's own state, and resume re-acquires.** Task 03.

**Known at authoring, so the build does not rediscover them:**

- **Three shipped tests in `test/slots-before-work.test.mjs` must change when 02 is built** — the
  multi-ref wiring test (3 refs at bound 2), the production-door bound outline (4 refs, 4 of 5 rows),
  and the injected-`runDispatchLane` test whose third member is now refused before the opener sees
  it. Tests are code and may change; the delivered `.feature` files are not, and do not need to.
  00's pool scenarios stay true — they are stated over the pool and driven directly against it.
- **The refusal's shape is a fork the builder must close.** Today the command's exit is non-zero if
  any member reports not-ok, which would make a refusal fail the whole request — and task 02 requires
  the request to succeed. Refusal must be distinguishable from fault.
- **The door belongs in the command, not in `resolveDispatchLane`.** Putting it in the resolver breaks
  16 shipped lane scenarios, and FF-6907 already pins the pool call ahead of the lane open.
- **The counted set must not open the projection store**, or it lands a store open directly under
  task 02's "deciding whether there is room writes nothing". A holder's ref is recoverable from the
  branch git already reports.
- **A ref is not "fresh" merely because it holds no dispatch lane** — it may already be at work in a
  mesh assignment's own tree, which the lane count does not see. Refusing it at the bound would break
  re-runnability. Task 02 has a scenario for it.
- **Task 03 is largely green already** — most of it traces the `0c41562` and `60a9fbb` fixes into
  acceptance rather than driving new code. That is deliberate; the new code it does demand is the
  restart-durable membership.
- **One residue is named rather than asserted.** Between a directive being sent and a worker writing
  down that it took it, occupancy rests on an in-scan reservation another process cannot see, so a
  resume arriving in that window can double-book. Closing it durably means recording the send as
  occupancy, which would let an unacknowledged send hold an invisible slot forever — refused by
  FF-6908. Routing the resume door through the control daemon would close it in-process; that is a
  story-sized change and is **not** this one's.
