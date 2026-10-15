---
doc: verification
---
# 160 · Verification

## Fitness functions

Each control suite was run unmutated through `scripts/test-shard.mjs` (all green), then once per probe with one
source edit applied, then reverted with `git checkout` (the checkout read clean after each). Run 2026-10-15 on
`ba23c7d9`, `AOF_GLOBAL_HOME` isolated.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-16001 | `test/arch/loop/acd-loop-git-reads-once-per-step.test.mjs` | 12/12 green (26 s) | `memoGitReads` returns its `exec` unwrapped (`packages/execution/src/worktrees.mjs`): 4 cases red — "the counting exec saw rev-parse HEAD once — 3 !== 1", the 10-row outline, the tick port, and the lane-cycle ceiling. |
| FF-16002 | `test/arch/testing/acd-git-fake-parity.test.mjs` | 12/12 green (8 s) | the model answers `rev-parse --git-common-dir` in the primary as `.git/` (`test/support/loop/git-fake.mjs`): red — "step 7 rev-parse --git-common-dir: both answer the same status and the same stdout". |
| FF-16003 | `test/testing/test-command-contract.test.mjs` | 17/17 green (42 s) | a selection falls back to `args` (`packages/work/src/testing/toolchain.mjs`): red — "this repository's selection launches the shard entry, never the registry runner". |
| FF-16004 | `test/arch/command/acd-cli-entry-executes.test.mjs` | 10/10 green (9 s) | the bin imports `cli.mjs` statically (`packages/core/bin/aof.mjs`): red — "the CLI module is not a static import — a static one is hoisted above the call". |
| FF-16005 | `test/arch/grade/acd-gate-result-is-evidence.test.mjs` | 9/9 green (3 s) | the launch takes the gate's own env (`const launchEnv = env;`): leg (1) red — "the launch environment is the clean copy of the gate's own". |
| FF-16006 | `test/arch/grade/acd-gate-result-is-evidence.test.mjs` | 9/9 green (3 s) | the report prints a killed unit as `not ok - <unit>` (`scripts/test-sharded-report.mjs`): leg (1) red — "the report prints it as # not finished, never not ok — true !== false". |
| FF-16007 | `test/arch/command/acd-cited-path-resolves.test.mjs` | 14/14 green (12 s) | `readRenameMap` loads history eagerly (`packages/work/src/commands/doctor.mjs`): 2 red — the structural leg "readRenameMap builds a loader that reads history once, on its first load()", and the all-resolve outline, which failed on `EBUSY … rmdir aof-lazy-history-*` (the eager read's git still held its fixture). |

## Whole-tree runs

- **The gate at the real budget** (`aof work regression-gate 160`, clean detached worktree at `ba23c7d9`):
  `not-finished`, 12.0 min — "the gate's own 12-minute deadline expired". `REGRESSION.md`, first row. The
  runner's own budget stop came at 10 min; the row names no unit because of F-01.
- **The whole tree unbudgeted** (`node scripts/test-sharded.mjs --jobs 16 --unit-timeout-min 45`, same worktree):
  **green** — 12,887 of 12,887 registered cases in 1,273 units, 0 failures, wall **19.2 min**, summed 297.9 min
  (17,874 s, against the 40,743 s refine measured — −56%). Three units were red in the pool and green alone, all
  other items' (`fleet-boards-branch-deleted/01` scenario 6, `69/02 task00` heartbeat silence,
  `mesh-launcher-lock/00` concurrent reclaim). The slowest files: `loop-command-wave` 1,121 s summed (299 s alone —
  pool contention), `loop-command-reconcile` 486 s, `work-dispatch-lanes` 419 s, `work-this-tree-holds-what-is-live`
  338 s, `acd-control-derives-its-census` 336 s, `loop-command-stops` 283 s, `site-build` 254 s.

The code is green; the milestone's objective — a sign-off inside 10 minutes — is not met (F-02).

## Verification evidence

Before = `2bb15e80` (no 160 code), after = `ba23c7d9` (all seven stories), each a detached worktree prepared by
`scripts/prepare-worktree.mjs`, `AOF_GLOBAL_HOME` isolated, measured one at a time on an otherwise idle control
node. Git calls were counted by a `--import` preload that wraps `child_process` and syncs the ESM exports; it
rides `NODE_OPTIONS`, so every node process in the tree is counted. A story-by-story before is not available:
the 160 stories were built in one uncommitted checkout, so every "before" here is pre-milestone.

### Story 00 · the measured cut (@manual)

Three `loop-command-wave` cases, positions 14, 22 and 33 (the lane commit-and-merge, the one-baseline wave, the
write-disjoint pair), through the shard entry:

| | wall | git calls | by verb (top) |
|---|---|---|---|
| before | 22.6 s | 471 | rev-parse 130, log 57, diff 52, status 39, worktree 36, merge-base 36, symbolic-ref 21 |
| after | 18.2 s | 295 | rev-parse 73, status 39, merge-base 29, diff 24, worktree 22, symbolic-ref 7, log 1 |

All three cases pass in both runs. Result: pass (−37% git calls; `log` is 160/06's share).
verifies → `stories/00_story_the-loop-reads-each-git-fact-once-per-step/tasks/01_a-lane-cycle-stays-under-its-call-ceiling.feature` · "The measured cut on the control node"

### Story 01 · the moved suites alone (@manual)

The three suites holding `git: "fake"` cases, each run whole and alone through the shard entry:

| suite | before wall · git | after wall · git |
|---|---|---|
| `test/loop/loop-command-wave.test.mjs` (51 cases) | 431.6 s · 8,003 | 298.8 s · 4,018 |
| `test/loop/loop-command-reconcile.test.mjs` (18) | 180.0 s · 2,864 | 130.1 s · 1,507 |
| `test/loop/loop-command-stops.test.mjs` (78) | 153.7 s · 1,079 | 126.6 s · 611 |

Every case passes in all six runs. The after column carries 160/00's and 160/06's cuts too (see above).
Result: pass. verifies → `stories/01_story_tests-not-about-git-run-on-a-git-model/tasks/01_loop-suites-move-onto-the-model-by-rule.feature` · "The moved suites' alone wall time on the control node"

### Story 02 · the focused run's start-up (@manual)

| | before | after |
|---|---|---|
| `aof test --scope file test/arch/grade/acd-gate-result-is-evidence.test.mjs`, three runs | 7.3 / 7.4 / 7.1 s | 3.4 / 3.4 / 3.3 s |
| importing `scripts/test.mjs` alone (idle node) | 5.2 s | 5.4 s (no longer on the focused path) |
| hand-typed `node scripts/test.mjs --only <that suite>` | 6.2 s | 7.1 s |
| hand-typed `node scripts/test-shard.mjs <that suite>` | 1.7 s | 2.5 s |

The after focused run carries no registry import. On an idle node that import costs 5.2 s, not the 15 s the SPEC
measured under load. The scenario's literal `aof test --story 160/02` is not a runnable form (`--story` needs
`--scope impacted`, which widens to the whole tree here — STATE, twice); the story's three runnable suites under
`--scope file` took 34.8 s before and 38.0 s after, dominated by `test-command-contract`'s own 42 s of spawns.
Result: pass. verifies → `stories/02_story_a-focused-run-loads-only-what-it-names/tasks/01_the-shard-entry-runs-a-named-selection.feature` · "The focused run's start-up on the control node"

### Story 03 · the start-up medians (@manual)

Five runs each; cold = an empty compile-cache directory (a fresh `TMP`), warm = the same directory after one
unmeasured run. The application import is timed in-process after `scripts/test-harness.mjs` has loaded, which is
where 160/03 turns the cache on for test children.

| | cold median | warm median |
|---|---|---|
| before · `aof --version` | 261 ms | 247 ms |
| after · `aof --version` | 248 ms | 246 ms |
| before · default-application import | 826 ms | 853 ms |
| after · default-application import | 957 ms | 893 ms |

The cache is engaged: a warm directory holds 704 entries, and `NODE_DEBUG_NATIVE=COMPILE_CACHE` reports each
module skipped "because cache was the same". The warm after medians are not lower than before. Result: **fail** —
F-03. verifies → `stories/03_story_a-child-process-compiles-once-and-loads-its-verb/tasks/00_every-process-uses-the-compile-cache.feature` · "The start-up medians on the control node"

### Story 03 · the profile that chose the cut (@manual)

Resolve and load hooks (`module.registerHooks`) timed every `file:` module, before and after:

- `aof --version` — 41 modules before, 16 after. The ten slowest before: `work/src/digest.mjs` 5.1 ms (deferred),
  `foundation/src/fs.mjs` 3.5 (kept), `mesh/src/node-identity.mjs` 3.0 (deferred), `foundation/src/log.mjs` 2.3
  (kept), `work/src/records.mjs` 2.0 (deferred), `core/src/asset-base.mjs` 1.6 (kept),
  `core/src/application/bindings/work.mjs` 1.5 (deferred), `bindings/mesh/store.mjs` 1.4 (deferred),
  `contracts/src/freshness.mjs` 1.4 (deferred), `work/src/identity.mjs` 1.3 (deferred).
- `aof work find 160` — 706 modules before and after, as STATE recorded (the registry is its route table). The
  ten slowest: `contracts/src/error.mjs` 32.7 ms, `foundation/src/fs.mjs` 18.8, `contracts/src/loop-bounds.mjs`
  15.1, `mesh/src/workspace-identity.mjs` 14.1, `mesh/src/node-identity.mjs` 7.0, `mesh/src/commands/gate.mjs`
  5.4, `execution/src/runtime-selection.mjs` 4.7, two `@inquirer/core` files 4.3 each,
  `mesh/src/assignment-record.mjs` 4.1 — none deferred.

Result: pass (the record is the deliverable). verifies → `stories/03_story_a-child-process-compiles-once-and-loads-its-verb/tasks/01_a-child-aof-loads-a-pinned-closure.feature` · "The profile that chose the cut"

### Story 04 · a stopped gate leaves no process (@manual)

`aof work regression-gate 160` in the clean after worktree, from a shell with `GIT_ASKPASS=/bin/false`, with
`AOF_RUN_ITEM_DIR`/`AOF_RUN_ID` naming a temp run record in state `running`. At 60 s, 13 runner and unit
processes were listed (shard units and `test/integration/cli.mjs lifecycle`). The record was rewritten `done` at
65 s. The gate exited 1 at 123 s, 58 s after the settle, printing "The regression gate for 160 stopped: the
driven run m04-probe is no longer running, so its suite was stopped and no row was written. Run the gate again."
Three seconds later: 0 runner or unit processes. `REGRESSION.md` still held its one row. Result: pass.
verifies → `stories/04_story_the-gate-launches-clean-and-dies-with-its-session/tasks/01_the-suite-dies-with-its-session.feature` · "A stopped gate leaves no process on the control node"

### Story 05 · the budget stop (@manual)

A throwaway detached commit `e15b0058` on `ba23c7d9` changed only `budgetMinutes` to 1. The gate there ran 1.9
min and wrote a `not-finished` row naming 16 in-flight units (`site-build`, `integration lifecycle`,
`loop-command-stops`, …) and "1257 units not started"; no unit process remained afterwards. The runner's own
summary printed `# not finished - <unit>` per unit and `# not started: 1257 units`.

The run at the real budget (10 min) on `ba23c7d9` is `REGRESSION.md`'s first row: `not-finished`, 12.0 min — but
it reads "the gate's own 12-minute deadline expired", naming no unit. The runner was still alive two minutes
after its own budget stop, so the gate's deadline killed it before it printed: one unit (plan index 97) never
wrote its log, because it never closed. Result: pass for the budget-1 stop; the real-budget row is F-01, fixed in
this verify. verifies → `stories/05_story_the-runner-enforces-the-budget-and-a-timeout-is-not-finished/tasks/01_the-sharded-gate-is-held-to-its-budget.feature` · "The budget stop on the control node"

### Story 06 · the spawn counts (@manual)

The before and after binaries run over the same tree (the after worktree), so only the code differs:

| | before bin · git calls | after bin · git calls | `--json` |
|---|---|---|---|
| `aof work doctor 160` | 4 (log 2, rev-parse 1, diff 1) | 4 (log 2, rev-parse 1, diff 1) | identical |
| `aof work validate 160` | 4 (log 2, rev-parse 1, diff 1) | 0 | identical |
| `loop-command-wave` case 14 alone | 132 (log 17) | 82 (log 1) | — |

Doctor still loads history once because one of 160's citations misses on disk — the lazy source answering a
miss, as ADR-007 says. Result: pass. verifies → `stories/06_story_citation-history-is-read-only-when-a-citation-misses/tasks/00_history-is-a-lazy-source.feature` · "The spawn counts on the control node"

### F-01 · the drain fix (@bug)

`scripts/test-sharded-pool.mjs`: once a unit has exited, its output gets `drainMs` (10 s) to close, then the pool
destroys its ends. The new case in `test/testing/test-sharded-report.test.mjs` spawns a real unit that starts a
detached process holding the unit's output, and stops it at a 1.5 s budget. Before the fix: red — "the pool
resolved 60.1 s after it started", exactly the descendant's lifetime. After: green, the suite 13/13 in 3 s;
`acd-gate-result-is-evidence` 9/9 and `test/run/regression-gate.test.mjs` 59/59 green. The fix is not yet
exercised at the real budget: the next gate run is its evidence.
verifies → `stories/05_story_the-runner-enforces-the-budget-and-a-timeout-is-not-finished/tasks/01_the-sharded-gate-is-held-to-its-budget.feature` · "F-01 · a killed unit whose descendant holds its output open still leaves the pool within the drain"

## Findings

Recalled at triage (`aof work memory recall … --kind finding --block`, four queries, recorded on 160).

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | At the real budget the runner did not exit within the gate's 2-minute grace after its own budget stop: a killed unit whose descendant held its output open never emitted `close`, so the gate's deadline killed the runner and the row named no unit. | defect (160/05) | blocker | `@bug @finding-F-01` scenario + fix; a distinct incident (m96/F-96-G is a killed run recorded as complete, a different cause) | 160/05 | fixed — red/green above |
| F-02 | The whole tree is green but takes 19.2 min on 16 workers, about twice the 10-minute budget, so the gate can only record `not-finished`. | gap (milestone objective) | blocker for the milestone | prior occurrence m144/F-03 (same cause: the tree outruns its budget); the operator chose (2026-10-15) to keep 160 open and add stories for the next levers | 160 — new stories | open |
| F-03 | 160/03's `@manual` "the warm after medians are lower than before" is falsified: the compile cache is engaged and hit, but the application import is 853 → 893 ms warm and `aof --version` 247 → 246 ms. The cost is resolution and evaluation, not compilation. | measured non-result | non-blocker | the operator chose (2026-10-15) to keep the code and record the miss; the scenario's Then stands falsified here, unedited | the next start-up lever, 160's new stories | open |
| F-04 | Contract wording that does not match the delivered face, flagged at build and at verify: 02/01's `@manual` names `aof test --story 160/02`, which needs `--scope impacted` and widens to the whole tree here (m72/F-72-AN's class); 01/00's "fails loudly … naming git" against ADR-007's empty map; 03/01's per-verb help that exits 0; 05's E5 "40 units still queued". | contract wording | non-blocker | each case asserts the real behaviour; recorded, not edited | — | open |

## Accept decision

2026-10-15, `aof:verify 160`. All seven stories are accepted: every `@executable` scenario is green in the
whole-tree run, every `@manual` scenario has its evidence above (03/00's as a recorded miss, F-03), F-01 is fixed,
and every control's red probe bites. **The milestone stays `in-progress`:** its objective is the 10-minute sign-off,
the gate's newest row is `not-finished`, and F-02 is open. The operator's decision is to refine new 160 stories for
the next levers — pool contention on the loop suites, `work-dispatch-lanes`, the heavy arch audits, process
start-up's resolution cost — and to re-run `aof work regression-gate 160` when they land.
