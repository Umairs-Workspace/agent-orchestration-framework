
# 160/02 · A focused run loads only what it names — Outcome

## Delivered

### A selection launches its own program
`work.test.selectProgramArgs` compiles beside `args` and replaces it only when a launch selects files. This repository declares `["scripts/test-shard.mjs"]`, so a focused `aof test` launches the light entry and never imports the registry. The gate's toolchain drops the key.

### The shard entry runs a named selection
`node scripts/test-shard.mjs <suite>... [positions]` runs every file it is named through the runner's one loader (`loadSelected` in `scripts/test-harness.mjs`). It enters through the runner only for a selection holding a suite that imports the runner. A focused run of one small suite takes 3.4 s instead of 7.3 s.

### The isolation guard knows the light entry
`.claude/hooks/aof/guard-test-isolation.mjs` treats `scripts/test-shard.mjs` as a test invocation, so an unisolated shard run is blocked like an unisolated runner.

## Assumptions

- **The registry stays in `scripts/test.mjs`** — about twenty suites and the census read its import text, so the whole-tree run still pays its import once.
