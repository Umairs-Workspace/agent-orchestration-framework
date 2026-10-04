# 144 · The whole-tree test run signs off in minutes — Outcome

## Delivered

### The regression gate runs a declared whole-tree program
`aof work regression-gate <ref>` runs `work.test.gate.args` when it is declared, at scope `all`. This repo declares `scripts/test-sharded.mjs`. `--jobs N` expands `work.test.gate.jobsArgs`, and `--serial` runs the plain `work.test` program. Conflicting or invalid settings are refused before anything runs, and a malformed declaration is a red row naming `work.test.gate.<key>`.

### A gate row says what was lost, what is not isolated, and how the run ran
The row's detail is the failing cases, then `not isolated: …`, then `<mode>[ --jobs N] · <min> min[ · over budget (<B> min)]`. A green row carries a detail too, and still satisfies the door. After its verdict the gate prints the program's `# slowest files` block and its `Logs:` path.

### The sharded runner reports through one pure module
`scripts/test-sharded-report.mjs` owns the report and the exit decision. A case red twice, or a unit that ran fewer cases than it was assigned, is a column-0 `not ok`. A case red in the pool and green alone is `# not isolated - <case>` and does not fail the run unless `--strict`. The slowest-files block sums each file across its chunks into `.tmp/test-timings.json`.

## Assumptions

- **The runner's comment lines reach the gate verbatim** — not-isolated names are read from the program's raw stdout, not from the TAP normaliser.

## Gaps

### The 15-minute budget
- **Status:** open
- **Discharge condition:** a whole-tree gate on the operator's machine records no `over budget` entry.
The budget is declared and every row measures against it; measured runs take 26.6–31.0 min on 16 workers, led by `test/loop/loop-command-wave.test.mjs`.

### A green whole-tree row
- **Status:** open
- **Discharge condition:** m134/F-134-03's eight inherited reds are repaired and 134 is archived.
The gate records a red row over this repository on every run, for cases red before 144.
