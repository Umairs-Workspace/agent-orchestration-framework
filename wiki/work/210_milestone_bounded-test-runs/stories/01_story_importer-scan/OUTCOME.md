# 210/01 · A change is matched to the suites that import or name it, from a fresh scan — Outcome

## Delivered

### Fresh importer scan
`scanImporters({ projectRoot, changed, roots, suffixes, exclude, exportMap })` in `packages/work/src/testing/importers.mjs` reads every registered suite on each call. For each suite it returns the changed files the suite reaches by direct import, through test helpers, or by naming a whole path, plus the specifiers it could not resolve. It uses no code graph and no cache.

## Assumptions

- **Workspace specifiers resolve through a caller-supplied export map** — the census's workspace export map is handed in; the scan does not discover packages itself.

## Gaps

### Source-to-source and assembled-path reach
- **Status:** open-by-decision
- **Discharge condition:** a project needs a suggestion that follows source-to-source imports or paths built from fragments, and a decision reverses ADR-003's scope.
The scan follows test helpers and path mentions, never source-to-source imports or the core application assembly. `wiki/TESTING.md`'s area table covers that reach in prose.
