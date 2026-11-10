# 160/13 · The whole tree runs on every pull request — Outcome

## Delivered

### The whole tree runs on every pull request, inside its budget
`.github/workflows/test.yml` runs every registered case on each pull request to `main` and each push to `main`, as 8 shards of 4 workers on `ubuntu-latest`; the summary job fails the run for a red shard, a case no shard ran or two shards both ran, an unfinished unit, a missing report, or a suite wall over 10 minutes. On PR #12 the suite signs off in 1.8 minutes.

### The runner takes one shard of the plan
`scripts/test-sharded.mjs --shard <i>/<n>` runs one balanced bin of the whole plan, counts only its own cases, and `--report-json` writes its verdict for the summary.

### Each file's drift against main is reported
`scripts/test-ci-summary.mjs` compares every file's time with the timings `main` last saved to the Actions cache and lists the files past the threshold in the job summary; drift alone never fails a run.

### The control-node gate keeps no budget
`.aof/aof.config.json` declares no `work.test.gate.budgetMinutes`, so `aof work regression-gate` on the control node is a correctness gate under its own deadline.

### The whole tree runs on Linux
Every registered case is green on `ubuntu-latest`; `install.ps1`'s extraction, file-lock and registry rows are Windows-only and skip elsewhere, flagged.

## Assumptions

- **A green push to main saves the timings** — until the first one lands, shards plan from case counts and the drift table is empty.

## Gaps

### The drift baseline does not exist yet
- **Status:** open
- **Discharge condition:** the first green push to `main` with this workflow saves `test-timings-<run>` to the Actions cache.
No pull request can show drift against `main` until `main` has run the suite once.
