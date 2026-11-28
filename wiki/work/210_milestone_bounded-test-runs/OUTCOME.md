# 210 · Bounded test runs — Outcome

## Delivered

### Three stages of testing, each with its own door
A story's tests are a named run of chosen suites (m210/04/named-runs-with-a-reason), a fix is checked by `aof test --failed` (m210/05/the-fix-round), and the whole tree runs only through `aof test --all` outside story work or through `aof work regression-gate`, at most twice per milestone (m210/03/two-gate-launches-per-milestone). No path from story work reaches the whole tree.

### Test selection no longer depends on the code graph
No testing module, and not the test command, opens a route to the code graph (FF-21001). The suites an agent considers come from the project's instructions file (m210/00/the-testing-instructions-key) and from a fresh import scan (m210/01/fresh-importer-scan). `graph impact` and seam liveness are unchanged and are no longer read by tests.

### One run record across all three stages
Named runs, fix rounds, `--all` runs and gate runs write the same attributed record: reason, worktree, the suite of each failure, and pre-existing labels (m210/02/attributed-run-records, m210/02/per-suite-failure-attribution). A fix chain roots on any of them, and the sign-off doors read them.

## Assumptions

- **Agents follow the instructions file** — nothing checks a named run's choice against `wiki/TESTING.md` except the structural review lane, which raises an importer that was left unrun with no stated reason.

## Gaps

### A suite choice that misses the controls and native files
- **Status:** open
- **Discharge condition:** a milestone's verify sweep and gate find no check that its stories' named runs should have reached. `wiki/TESTING.md`'s area table now names these checks by kind of change, and nothing yet verifies the choice against it.
Six of 210's own reds were missed by every story's bounded choice: F-07 to F-10 and the native F-12, caught by verify's sweep over all of `test/arch` plus the native files, and F-15, caught by gate 1. The importer scan does not reach checks that read source or prose through globs, or native `node:test` files.
