# 190/01 · `impacted` narrows on what it knows — Outcome

## Delivered

### Package-owned suites are suites, and only runnable ones are selected
`work.test.roots` and `suiteSuffixes` admit the package and app `test/` directories, and the selector takes a suite only when it is also a member of the whole suite the runner runs. Every registered suite is selectable (FF-19005).

### Dependents are followed to the end
A changed module selects every suite that reaches it transitively through the code graph, not only its direct importers.

### A new file narrows only when its place is known
A new suite selects itself (`suite-itself`), a new module imported by a changed file inherits its importer's suites (`imported-by-changed`), and a declared path not yet written contributes nothing (`not-yet-written`). Any other file the graph does not know widens the run to every suite.

### Documents narrow only through a declared coupling
A changed document or data file narrows only through `work.test.couplings`. This repo declares none, so every changed document still widens.

### The narrowing reasons are a closed set
Every selected suite carries one of the five frozen reasons of ADR-003 §5, and a widened result carries none (FF-19003). A narrowed selection of nothing launches nothing.

## Assumptions

- **The code graph is read, never rebuilt** — a change is placed against the graph as last built by `aof graph build`, so a stale graph widens more, never narrows wrongly.
- **The selector reads no file** — what it knows about files arrives through the `sources` seam composed in the test command's binding, and with no seam supplied everything absent widens as before.

## Gaps

### A narrowed run of a source change is near-total
- **Status:** open
- **Discharge condition:** a source module's narrowed selection stops at the composition root (`packages/core/src/application/default.mjs`), for example through an import smoke test, or ADR-004 §3's cost-based split lands. The operator decides which (VERIFICATION F-08).
Through the composition root, a source module's transitive dependents are 1,119 of 1,273 suites. 12 of the 76 replayed stories narrow, with a median selection of 1,119. Only leaf changes narrow to a handful (167/04: 13 suites, 3 min 28 s).

### Asset and render documents have no coupling
- **Status:** open-by-decision
- **Discharge condition:** a reader census that follows walks, the CLI and manifest reads, not only literal path mentions, backs a coupling for `packages/core/assets/**` and the generated renders.
A literal census misses the suites that read the bundle through `aof work update`, so declaring one would be confidently wrong.
