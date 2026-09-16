# 126/00 · The loop says what it is doing and counts what it did — Outcome

## Delivered

### The attempt-series clock
`scheduleToClose` is measured as accumulated ATTEMPT milliseconds summed over the `retryOf` lineage:
a settled attempt ends at `updatedAt`, a reclaimed one at `heartbeatAt ?? updatedAt` (never at the
reclaim stamp), a stale `running` one at that same last liveness, and only a demonstrably-alive
`running` attempt ends at `now`.

### The millisecond decider
`decideScheduleToClose` takes `{elapsedMs, ceilingMs}` and refuses anything that is not two numbers —
the `{startedAt, now}` form is gone rather than surviving on a branch — and both shell call sites
obtain `elapsedMs` from the summer, so downtime between attempts is charged to nobody.

### One `retryOf` walk, in the engine
`retryLineage`, `attemptElapsedMs` and `lineageElapsedMs` live in `src/work/loop.mjs`;
`src/commands/loop.mjs` holds no `retryOf` traversal of its own, and `retryLineageStartedAt` points
at the engine rather than duplicating beside it.

### One staleness threshold per invocation
`heartbeatFromConfig` is resolved once per loop invocation and shared by the reclaim sweep and both
deadline sites, so the sweep and the clock cannot disagree about whether a run is alive; the engine
holds no staleness definition of its own and takes `stalenessMs` and `isStale` as data.

### In-flight narration through the one printer
`src/commands/loop.mjs` announces `Driving <ref> — <phase>, cycle N of C, <level>` before every
`drivePhase` call, and says `Resumed`, `Retrying` and `Reclaimed` once each at the sites that
produce them; the four in-flight lines that already existed reach the same seam. The module still
holds exactly one `console.log` — the injected launcher printer — and `PRINTERS` gains no row.

### `--quiet`
`work:loop` accepts `quiet` in its closed input schema, its CLI spec and its argv shaper; under it
zero in-flight lines are printed and the terminal account is byte-identical to the loud run,
including a halt's stop, ref, producer and resume command. The default is loud, and `--json` still
never launches.

### Nothing new on disk
The run record's sixteen keys and the loop declaration's eight are unchanged — every instant the
clock reads was already recorded.

## Assumptions

- **A run's liveness is recorded** — the clock ends a `running` attempt at `heartbeatAt` only when
  one was stamped; a run minted outside the loop shell carries none and is charged to `now`.
- **The staleness threshold is the store's** — the engine's answer is only as good as the
  `stalenessMs` and `isStale` predicate handed to it from `src/loop-bounds.mjs`.
- **`narrate` is derived from the injected `report`** — a caller that injects one collector receives
  both classes of line; nothing supplies a second printer.

## Gaps

### A per-heartbeat "stage within the drive" line
- **Status:** open
- **Discharge condition:** an ADR that rules how far the loop shell may reach into the session
  driver, and a story that spends that ceiling.
The loop announces a drive when it begins and reports when it ends; between those two lines a
multi-hour drive still emits nothing, and the seam that would carry a progress line is named in
ADR-002 §7 with no producer behind it.
