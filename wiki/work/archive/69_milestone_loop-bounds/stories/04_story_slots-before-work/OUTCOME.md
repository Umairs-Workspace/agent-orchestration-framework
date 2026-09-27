# 04 · Slots before work — Outcome

## Delivered

### The bounded worker pool has a production caller
`dispatchReadySet` — the only bounded worker pool in this repo, and one with no production caller
before this story — is reached from `src/commands/dispatch.mjs:104`, so at most `bound` lanes are
materialised at once and the remainder dispatch as lanes free.

### The local slot is the git lane, counted before one is materialised
The dispatch door derives its counted set from the lanes git itself reports under the dispatch root
(`inspectDispatchLanes`, `prunable` excluded) and reads it before any lane is opened — before both
the pool call and `resolveDispatchLane`. Reusing an existing lane is free; each new open counts
against the next member; a member over the bound is refused with a code in the reported result
rather than opened, thrown or dropped.

### No occupancy fact is persisted outside git's own worktree list
There is no lease table, no claim file, no per-slot persisted object and no new run-record column —
a slot is a count over rows and lanes that already exist, not an object with its own lifecycle.
`src/run-store.mjs` is byte-unchanged from milestone 68.

### The mesh control tick is bounded
The tick derives its counted set from assignment rows and tests it before the send; a row over the
bound stays `assigned` for a later tick — the same leave-it-assigned branch the not-connected case
already used, so a send that did not go out is retried rather than silently dropped.

### Occupancy has one home and every door that opens work reads it
`assignmentOccupiesDispatchSlot` is the single definition of the `accepted`/`running`/`needs-input`
predicate; no other module re-spells it, and no path treats the unpersisted once-guard set as
occupancy. Both doors that can put a target back to work — the tick's directive send and the
parked-answer resume — read `countDispatchSlotsByTarget` against the bound before sending, and the
whole-`src` closure enumerates those doors, so a new one fails the gate rather than bypassing it.

### Admission survives a scheduler restart
Occupancy is proved by the row's own state rather than by in-process bookkeeping, so accepted and
running rows still count after the scheduler restarts, and a parked run's answer re-acquires a slot
through the same count or is refused.

## Assumptions

- **The counted set excludes parked rows from day one** — the `needs-input` code was already written
  by the worker before [[69/05]] landed, which is what let the two stories run in parallel.
- **`work.dispatch.concurrency` keeps its existing single reader** — the bound was not moved into
  [[69/00]]'s leaf, which is why this story depends on nothing.

## Gaps

### Occupancy is only as durable as the row
- **Status:** open
- **Discharge condition:** none planned — this is the chosen design, recorded so it is not
  rediscovered as an omission.

A slot is a count over `global_assignments` rows and git's worktree list, deliberately rather than a
persisted lease: the m26 leasing machinery was deleted in m34's global-mesh-only correction. A row
that is wrong makes the count wrong, and there is no second record to reconcile against.
