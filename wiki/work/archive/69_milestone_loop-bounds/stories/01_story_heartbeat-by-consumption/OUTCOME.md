# 01 · Heartbeat by consumption — Outcome

## Delivered

### A driven run stamps its own liveness from the tool results it produces
A bundled `PostToolUse` hook (`src/bundle/hooks/run-heartbeat-enqueue.mjs` +
`claude-run-heartbeat.json`) enqueues a liveness record for the run named in its environment, and
`src/run-heartbeat-consumption.mjs` drains that queue into `run-store.heartbeat()` — which had zero
callers in `src/` before this story. `heartbeatAt` now moves while a run works, rather than staying
`null` from mint to terminal.

### The hook derives nothing and cannot break the session it rides in
The hook body imports nothing from `src/`, opens no store, derives no workspace identity from cwd,
and exits 0 on every path — the clause set already proven for the artifact-sync hook, now enforced
over every bundled hook body as a class.

### The run's identity is handed in, never derived
The run id reaches the hook through the spawn environment (`OTEL_RESOURCE_ATTRIBUTES`), which is
per-process and untracked, so the absolute-path-in-a-tracked-file failure that a `git worktree`
inherits cannot recur through this route.

### The periodic scan reaps on the absence of liveness
The reclaim tick consumes the queue and reclaims a run whose liveness has gone stale against the one
declared threshold, through the reclaim edge that already existed rather than a third copy of it.

### One staleness constant answers for every consumer
The reclaim threshold, the loop shell's default and the session driver's undeclared-completion idle
window all resolve through `DEFAULT_HEARTBEAT_MS` in `src/loop-bounds.mjs`; `src/` holds exactly one
15-minute literal, and declaring `work.loop.heartbeatMs` moves all three together.

### The dual-staleness gate has a real second signal
`dualStalenessDecision` reads the linked run's `heartbeatAt` before falling back to `updatedAt`, so
the AND of node presence and run liveness runs on two signals for the first time; a fresh node with a
silent run stays hands-off, and an absent presence record is unknown liveness rather than staleness.

## Assumptions

- **Liveness is consumed, never pinged** — nothing in `src/` schedules a periodic self-stamp, so the
  signal proves the session is producing tool results rather than proving a pinger is alive.
- **A hook that cannot run leaves the run looking silent** — the reaper's deadline is the
  consequence, and a run whose hook never fires is reclaimed rather than trusted.

## Gaps

### The eight-day zombie class is detected, not the grinding class
- **Status:** discharged
- **Discharge condition:** a progress signal independent of liveness.

A run that has stopped producing tool results is now caught in minutes; a run that is busy and
getting nowhere heartbeats faithfully. That second class is [[69/03]]'s progress ledger, delivered in
the same milestone.
