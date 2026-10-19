
# 160/03 · A child process compiles once and loads only its verb — Outcome

## Delivered

### The compile cache is on in every aof and test process
`packages/core/bin/aof.mjs` and `scripts/test-harness.mjs` enable Node's compile cache before the application graph loads, and the bin reaches `cli.mjs` only by a dynamic import. On the control node the cache engages and hits, and it does not lower start-up (F-03).

### `aof --version` loads 16 modules
The session hooks and an unused workspace binding left `cli.mjs`'s static imports, so a version check loads 16 file modules instead of 41.

### A child's module count is pinned, shrink-only
FF-16004 pins each measured route's module count by equality: `--version` at 16, `work find` at 706. A story that adds a module to a route's closure must move its row.

## Gaps

### Start-up time is unchanged
- **Status:** open
- **Discharge condition:** a change lowers the warm medians of `aof --version` and of the application import on the control node, measured as 160/03's `@manual` measures them.
The cost of a child process is module resolution and evaluation. The compile cache does not reach them, and `work find` still loads the 706-module registry.
