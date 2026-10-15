# 160/07 · A test's child aof runs from one bundle — Outcome

## Delivered

### A sharded run's child `aof` starts from one bundle
`scripts/test-sharded.mjs` builds one ESM bundle of `cli.mjs` per run, into the run's own directory, before the pool starts, and every unit's child `aof` loads it through `AOF_TEST_CLI_BUNDLE`; `aof work find 160 --json` starts in a median 275 ms from it against 999 ms from source.

### The bundle and the release share one recipe
`CLI_BUNDLE_RECIPE` in `scripts/build-sea.mjs` holds the platform, target and externals for both; the test bundle rewrites each module's `import.meta` to its own source file's URL, so assets, the manifest and git resolve exactly as from source.

### The bundle is held to the source by a parity control
FF-16008 runs a fixed command set from the bundle and from the source and requires the same stdout, stderr and exit code; a control whose subject is the bin's own loading strips the variable, and a focused run sets none.

## Assumptions

- **The bundle builds** — a failed build runs the source and says so, so the run is slower but its verdict stands.
- **A defect visible only with separate source files is caught in-process** — a child-process test in the gate runs the bundle, so an import-order defect it would hide reaches only in-process tests and focused runs (160/07 Q1, accepted by the operator).
