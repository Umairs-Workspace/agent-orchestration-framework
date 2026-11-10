# 190/04 · An existing project is told what its test declaration leaves out, and one skill declares it — Outcome

## Delivered

### `aof project doctor` names what a test declaration leaves out
A `test-layout` family checks a config's fit to its tree: `test-layout-suites`, `test-layout-couplings` and `test-layout-resume`. Each is `ok` or a `warning` naming `/aof:map-tests`, and none is ever an `error`. An empty whole suite is never `ok`.

### `aof work update` prints the same warnings
After its `Updated ACD:` line, `work:update` prints one line per `test-layout-*` warning, from the same function as the doctor, and prints nothing when the family is all `ok`.

### A commit's selection is replayed without running anything
`aof test --scope impacted --commit <rev> --plan` selects from the files that commit changed and stops. It launches nothing, writes no record and is answered from none. `--commit` without `--plan` is refused.

### One answer to "what is a suite"
A suite is a file under a declared root that ends in a declared suffix and that `work.test.exclude` (`[{ paths, why }]`) does not name. `select.mjs` decides it, and the doctor, the selector and `aof test`'s whole suite all ask it. A declared suffix list reshapes the whole suite. With none declared, the whole suite keeps its pre-190 pair.

### `/aof:map-tests` declares the layout and proves it by replay
The bundle command does the following, writing `work.test.*` and nothing else; `--dry-run` writes nothing:
- replays the last 30 non-merge commits;
- authors roots, suffixes, exclusions and couplings, each with its reason;
- authors the resume templates (`reportArgs`, `filesArgs` and, when the gate takes one, `noLanesArgs`) only for a gate program that honours the contract;
- replays again, and runs the doctor.

### This repo's declaration accounts for its native tests
`work.test.exclude` names the 64 native `node:test` files under `packages/*/test` and `apps/*/test`, with the reason, so `test-layout-suites` and `test-layout-resume` are `ok` here and the whole suite stays at 1,273.

## Assumptions

- **The doctor reads what git tracks** — an untracked test file is not counted, and a directory that is not a git checkout reports that nothing was checked.
- **A resume template is written only after reading the gate program** — the skill says resume is unavailable when the program is not shown to honour the contract.

## Gaps

### A considered "keep widening" has no `ok` spelling
- **Status:** open
- **Discharge condition:** a coupling list can state that unmapped documents widen on purpose, and the couplings check reads it as an answer (an ADR-008 amendment).
This repo deliberately declares no coupling (190/01), so its `test-layout-couplings` warns indefinitely.

### The census keeps a membership rule outside the declaration
- **Status:** open
- **Discharge condition:** this repo's `exclude` carries the convention that a workspace `test/` with an `index.mjs` contributes `.suite.mjs` alone, and `walkSuiteFiles` drops the special case.
Today the walk and the declaration agree on this repo only because the exclusion was widened to match the walk.
