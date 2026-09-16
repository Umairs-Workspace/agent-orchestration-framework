# 126/05 · The warning has one home — Outcome

## Delivered

### One import home for the SQLite runtime
`src/sqlite-runtime.mjs` is the only module in `src/**` that spells `import("node:sqlite")`;
`src/effects/journal.mjs` and `src/global-work-store.mjs` both reach the runtime through its
`importSqliteRuntime` export, and neither holds a resolve body of its own.

### A targeted, self-restoring warning filter
`importSqliteRuntime` wraps `process.emitWarning` for the duration of one import and restores the
original in a `finally`, so the filter is never in force outside that call; it swallows only a
warning whose type is `ExperimentalWarning` and whose message names SQLite, across all three
`emitWarning` shapes (message + type string, `Error` whose `.name` is the type, and the options
form), and forwards every other warning unchanged with its `code` and `ctor` intact.

### The callers' refusals are unmoved
`global-work-store` still throws `sqlite-unavailable` (501) and still honours `options.sqlite ===
false`; `journal` still degrades in its own words; each still performs its own `DatabaseSync` check.
A throw from the import propagates unchanged to the caller, so the original error object and its
`code` still reach the refusal that raises on it.

### No blanket suppression in the shipped tree
`src/**`, `bin/**`, `scripts/**`, `src/bundle/**` and `package.json` carry no `--no-warnings`, no
`--disable-warning`, no `NODE_NO_WARNINGS` and no `NODE_OPTIONS` warning flag; the deprecation
warnings this repository wants to see still print.

## Assumptions

- **Node raises the SQLite `ExperimentalWarning` once per process, at import** — a second import in
  the same process emits nothing, so a filter scoped to the import call reaches every occurrence
  there is (measured on node v22.22.2).
- **The message names SQLite** — the predicate is a `/SQLite/` test on the warning text, so a future
  Node that renamed the warning would print it rather than swallow it, which is the safe direction.
- **`test/` is outside the sweep** — a harness may suppress its own child's warnings, and 63 files
  under `test/` do.

## Gaps

### Every CLI integration test is blind to this warning by construction
- **Status:** open
- **Discharge condition:** an item audits the 60 `NODE_NO_WARNINGS` and three `--no-warnings` uses
  under `test/` and retires the ones no longer needed, so a CLI child's warning output is
  observable by default.
Reverting the leaf reds none of the repository's CLI integration suites, because each spawns its
child with warnings already suppressed; only the two legs that BUILD their child's environment
witness the delivered behaviour.
