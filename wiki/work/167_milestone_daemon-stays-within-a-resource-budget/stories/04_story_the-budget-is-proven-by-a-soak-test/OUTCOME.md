# 04 · The budget is proven by a soak test — Outcome

## Delivered

### The real daemons are soaked against the budget
`test/mesh/budget/daemon-budget-soak.test.mjs` runs the real `mesh serve --serve` and `mesh ui` over a generated 1,800-doc project, under their own temp global home and on free ports, with the motivating faults planted: an empty cache, an `event-id-conflict` and five gone registrations. After a 15 s warm-up it measures a 30 s idle phase and a 30 s phase with a viewer polling. Each daemon's CPU-seconds per phase, read off its own snapshots, is judged with the meter's `judge` against `DAEMON_BUDGET`. A failure names the daemon, the phase, its share and its top cause.

- **`mesh serve` is held to the idle budget in both phases** — it serves no fleet or board route (ADR-002), so only `mesh ui` reads viewer-open.

### The planted faults are named, and each is said once
`aof mesh status --json` names each planted fault with its workspace in the daemons' `cost` faults, and the serve log holds one line per sync fault, not one per tick.

### The soak is one unit of the regression gate
It is registered through `scripts/test.mjs`, so the whole-tree gate runs it. It binds neither :4181 nor :4182, and leaves the global home it was handed and the process table as it found them.

## Gaps

### The soak on the Windows host
- **Status:** discharged
- **Discharge condition:** the milestone regression gate runs the whole tree on this machine, and the soak is green there.
It is green on the Windows host as well since ADR-009's arm-before-walk amendment (m167/F-10).
