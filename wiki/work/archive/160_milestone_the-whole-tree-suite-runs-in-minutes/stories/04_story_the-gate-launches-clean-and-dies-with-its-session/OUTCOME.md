
# 160/04 · The gate launches clean and dies with its session — Outcome

## Delivered

### The gate's suite starts in a clean environment
`cleanLaunchEnv` drops every `GIT_*`, `CLAUDE*` and `AOF_*` variable (case-insensitively), keeping only `AOF_GLOBAL_HOME`, before the gate launches its suite. The gate's own environment is untouched.

### A stopped driven run stops its gate
The gate's keep-alive reads its driven run's record on each beat. When that run is no longer running, the gate aborts its launch and refuses with `regression-gate-stopped`, writing no row. Measured: 58 s from the settle to no process left.

### The sharded runner stops when its stdin ends
The pool lives in `scripts/test-sharded-pool.mjs`. It watches stdin only when stdin is a pipe, and on its end or close it kills every in-flight unit and starts no more. A stopped run writes no timings.

## Assumptions

- **The gate is driven with `AOF_RUN_ITEM_DIR` and `AOF_RUN_ID`** — a gate run by hand with neither has no run to watch, and runs to its own deadline.
