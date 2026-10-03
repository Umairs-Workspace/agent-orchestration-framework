# 144 · build brief

Advisory, for the builder. The task `.feature` files are the contract; the frontmatter holds the
read and write sets.

## The mechanism

The gate already runs `runTest` at scope `all`, and `runTest` takes its program from an injected
`resolveToolchain`. That seam is where this story hangs. The gate resolves its own program and
injects it:

- `work.test.gate` is compiled by the toolchain module, beside `work.test`, with the same field
  checks. `args` replaces `work.test.args` for the gate run only. `jobsArgs` is a template with
  `{jobs}` expanding once, in the way `selectArgs` expands `{file}`. `budgetMinutes` is a positive
  number. A fault is a toolchain refusal keyed `work.test.gate.<field>`, and the gate already
  records a run refusal as a red row.
- `--serial` and `--jobs N` are two new properties on the gate's input schema. `additionalProperties:
  false` stays, and there is still no scope flag. The setting refusals are checked after the
  dirty-tree refusal and before the commit is resolved, so a refused run costs nothing.
- The gate times the run with an injected clock (`clock = Date.now`), taking a reading before and
  after `runSuite`. The detail cell is composed in one function: the failing cases, then
  `not isolated: …`, then `<mode>[ --jobs N] · <min> min[ · over budget (<B> min)]`, all joined by
  ` · ` and passed through `detailCell`. A green row now carries a detail. Check that
  `satisfiesDoor` and `parseRegressionRows` still read it; they read `result` and `scope` only.
- The not-isolated names come from the program's raw output (`outcome.runner` carries stdout), as
  `# not isolated - <case>` lines. The TAP normaliser in `grade.mjs` is not touched. A comment line
  is not a case, so it neither inflates nor fails the report.
- The sharded runner keeps its pool. Its report text and its exit decision move into a pure
  report module beside it, so task 01's lines and task 02's slowest-files
  sums can be tested without starting a pool. Today a flake prints `flake - unit …` and `was red
  under load: …`. Replace those with one `# not isolated - <case>` per case. The failure lines must
  stay at column 0 as `not ok - <case>`, because that is what the TAP reader counts.
- Once the gate prints its verdict, it echoes the program's `# slowest files` block and its
  `# logs:` path.

FF-5311 pins the serial runner and its harness, and this story writes neither (Q6).
`acd-gate-result-is-evidence` (FF-9606) has to stay green: no path may admit a claim in place of a
run.

## Verification

1. A focused run (`node scripts/test.mjs --only` over the suites in `files:`, with
   `AOF_GLOBAL_HOME` isolated) covers the stubbed seams, which are git, the runner and the clock.
2. Run the real thing from a clean detached worktree of the merge commit:
   `aof work regression-gate 144`. That is task 02's `@manual` scenario. The row has to come back
   `green | all`, with `sharded · N min`. The runner's report has to say every registered case
   executed. Copy the minutes and any `not isolated` names into `VERIFICATION.md`. A real overrun is
   expected (24 min was measured) and is logged, not fixed.

## Out of scope

- Making the slow files faster (loop-command-wave, loop-command-reconcile, work-dispatch-lanes).
  Q4 gives that to another item.
- Any change to `scripts/test.mjs`, the serial runner, or `aof test`'s own scopes.
- Fixing the 13 suites F-134-04 names. This story logs them as not isolated; it does not repair
  them.
