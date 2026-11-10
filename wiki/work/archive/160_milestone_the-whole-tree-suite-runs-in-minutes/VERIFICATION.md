---
doc: verification
---
# 160 · Verification

## Fitness functions

Each control suite was run unmutated through `scripts/test-shard.mjs` (all green), then once per probe with one
source edit applied, then reverted with `git checkout` (the checkout read clean after each). Run 2026-10-15 on
`ba23c7d9`, `AOF_GLOBAL_HOME` isolated. Round 2 (FF-16008 – FF-16013): every control suite, every round-2 story
suite and every round-1 control re-run together through `scripts/test-shard.mjs` on 2026-10-15 (25 files, 525 of
525 cases green, `AOF_GLOBAL_HOME` isolated); the probes were run at build, except FF-16010's, run at verify.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-16001 | `test/arch/loop/acd-loop-git-reads-once-per-step.test.mjs` | 12/12 green (26 s) | `memoGitReads` returns its `exec` unwrapped (`packages/execution/src/worktrees.mjs`): 4 cases red — "the counting exec saw rev-parse HEAD once — 3 !== 1", the 10-row outline, the tick port, and the lane-cycle ceiling. |
| FF-16002 | `test/arch/testing/acd-git-fake-parity.test.mjs` | 12/12 green (8 s) | the model answers `rev-parse --git-common-dir` in the primary as `.git/` (`test/support/loop/git-fake.mjs`): red — "step 7 rev-parse --git-common-dir: both answer the same status and the same stdout". |
| FF-16003 | `test/testing/test-command-contract.test.mjs` | 17/17 green (42 s) | a selection falls back to `args` (`packages/work/src/testing/toolchain.mjs`): red — "this repository's selection launches the shard entry, never the registry runner". |
| FF-16004 | `test/arch/command/acd-cli-entry-executes.test.mjs` | 10/10 green (9 s) | the bin imports `cli.mjs` statically (`packages/core/bin/aof.mjs`): red — "the CLI module is not a static import — a static one is hoisted above the call". |
| FF-16005 | `test/arch/grade/acd-gate-result-is-evidence.test.mjs` | 9/9 green (3 s) | the launch takes the gate's own env (`const launchEnv = env;`): leg (1) red — "the launch environment is the clean copy of the gate's own". |
| FF-16006 | `test/arch/grade/acd-gate-result-is-evidence.test.mjs` | 9/9 green (3 s) | the report prints a killed unit as `not ok - <unit>` (`scripts/test-sharded-report.mjs`): leg (1) red — "the report prints it as # not finished, never not ok — true !== false". |
| FF-16007 | `test/arch/command/acd-cited-path-resolves.test.mjs` | 14/14 green (12 s) | `readRenameMap` loads history eagerly (`packages/work/src/commands/doctor.mjs`): 2 red — the structural leg "readRenameMap builds a loader that reads history once, on its first load()", and the all-resolve outline, which failed on `EBUSY … rmdir aof-lazy-history-*` (the eager read's git still held its fixture). |
| FF-16008 | `test/testing/build-sea-recipe-guards.test.mjs` | 18/18 green (31 s) | the version string changed in a built bundle: the parity set fails on `aof --version` alone, showing both answers; and `sourceEnv`'s strip disabled: FF-16004's child starts load a poisoned bundle (4 cases red) and both loading rows go red. Run at build (Story 07 evidence). |
| FF-16009 | `test/arch/testing/acd-git-fake-parity.test.mjs` | 21/21 green (15 s) | the three-way merge takes ours where only theirs changed (`test/support/loop/git-fake.mjs`): the merge-home outline and the dirty-refusal row red; a template built without its first `config` pair: "indistinguishable from an init-built one" and "built once per process" red. Run at build (Story 08 evidence). |
| FF-16010 | `test/testing/test-sharded-report.test.mjs` | 21/21 green (3 s) | run at verify, in `packUnits` (`scripts/test-harness.mjs`): (a) `estimate < packSeconds` → `<=`: the outline red — "15 s: its own unit"; (b) a packed unit's `files` drops its first entry: 4 red — "every file is in a unit … 37 !== 40", "the two short files packed", the plan-count case and the outline. Restored; 21/21 green. |
| FF-16011 | `test/arch/audit/acd-comment-stripper-order.test.mjs` | 5/5 green (13 s) | the look-back no longer skips whitespace (`test/support/source-slice.mjs`): the whole-tree leg red, naming dozens of files. A first probe (dropping `yield` from the keyword set) stayed green — recorded in Story 10's evidence. |
| FF-16012 | `test/arch/planning/acd-tune-corpus-declares-its-reads.test.mjs` | 9/9 green (2 s) | the corpus reads each snapshot by ref again (`packages/work/src/tune/corpus.mjs`): red — "a stream of 1 items was listed 2 times". Run at build (Story 10 evidence). At verify (F-05), the ingest row with `episodic-indexing.mjs` as at HEAD: red — "a stream of 1 item was listed 3 times and a stream of 12 items 14 times". 9/9 green with the fix. |
| FF-16013 | `test/arch/testing/acd-test-suite-registration.test.mjs` | 7/7 green (2 s) | `core-workspace`'s spawn put back on `scripts/test.mjs --only`: red, naming `test/bundle/core-workspace.test.mjs:258`, and the shard-entry outline red with it. Run at build (Story 11 evidence). |
| FF-16014 | `test/testing/test-sharded-report.test.mjs` | 3/3 green | written before the code and run red first: with no change made, the trust writer given no home wrote into the real home ("no home option: written in the test folder" red), the harness set no `AOF_TEST_CLAUDE_HOME` ("…a folder that exists while the process runs (got "")"), and the unit spawn did not name it. Green after 160/12. |
| FF-16015 | `test/arch/store/acd-shared-store-concurrency.test.mjs` | 1/1 green (both stores, 3 versions each) | run red first: before 160/12 the projection store's re-open executed writes — "projection store, the current version: executes no write statement" red. Green after. |
| FF-16016 | `test/testing/test-sharded-report.test.mjs` | 5/5 green | run at build, in `shardPlan` (`scripts/test-harness.mjs`): units into the heaviest bin instead of the lightest — "7 units into 3: loads 300,0,0 differ by at most the heaviest unit". Restored. |
| FF-16017 | `test/testing/test-sharded-report.test.mjs` | 3/3 green | run at build, in `scripts/test-ci-summary.mjs`: (a) the budget check removed — "every shard is green and the slowest took 11 minutes: fails" red; (b) drift pushed into the problems — "Drift is reported and never fails the run" red ("drift: test/a.test.mjs; drift: test/b.test.mjs"). Restored. |

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

**Round 2** (stories 07–11, clean detached worktree at `bf783248`, `AOF_GLOBAL_HOME` isolated, nothing else running):

- **The gate at the real budget** (`aof work regression-gate 160`): `not-finished`, 10.9 min — the runner's own budget
  stop, then a clean exit inside the grace (F-01's fix, exercised at the real budget for the first time). **0 failures**;
  9,846 of 12,932 cases in 174 of 339 units, summed 160.0 min; 16 units killed in flight are named, 165 never started.
  `REGRESSION.md`, second row.
- **The whole tree unbudgeted** (`node scripts/test-sharded.mjs --jobs 16 --unit-timeout-min 45`): 12,932 of 12,932
  cases in 339 units (1,273 in round 1), wall **19.7 min**, summed 258.9 min (297.9 in round 1, −13%). The pool's main
  pass ended at about 16.3 min; the last 3.4 min were alone-retries of 11 units. Ten were red in the pool and green
  alone, all other items' and mostly server- or port-bound (`work-ui-board-serves-unchanged/01`, `mesh-ui-cli-face/02`,
  `work-ui-fleet-origin/01`, `advertised-paths/00`, `154/08 task01`, `bundle-asset-manifest-complete`). One was red
  alone: `157/01 R3: one snapshot read serves every run of a milestone`, which pinned the reader's arguments that F-05
  changed — repaired (F-05), the knowledge package's 200 cases green.

Round 2 removed about 39 summed minutes, against the 92–108 the refine estimated. The heaviest files are still the
loop and lane suites under contention (`loop-command-wave` 938 s summed, 218 s alone), `site-build` 466 s,
`work-dispatch-lanes` 436 s and `work-this-tree-holds-what-is-live` 390 s. The objective is still not met (F-02).

**The worker sweep** (2026-10-16, clean detached worktree at `e9fc8342`, `AOF_GLOBAL_HOME` isolated, Docker Desktop and
both WSL distros stopped, every run planned from the same baseline timings, back to back):

| workers | wall | summed | failures | red in the pool, green alone |
|---|---|---|---|---|
| 8 | 23.6 min | 173.2 min | 0 | 2 |
| 10 | 18.5 min | 175.7 min | 0 | 3 |
| 12 | **17.3 min** | 205.8 min | 0 | 0 |
| 16 | 18.7 min | 288.8 min | 0 | 3 |

Every count ran all 12,935 cases green. The worker count is not the lever: from 10 to 16 workers the wall moves
between 17.3 and 18.7 min, and the best is still 7 min over the budget. The same 8-worker run took 15.3 min
(121 summed) the day before, so run-to-run variance on this machine is of the order of the budget itself; whole-machine
load averaged 62% at 8 workers and 90–99% at 10 to 16, which includes the tests' own load.

**Round 3 — the budget moves to the pull request suite** (operator decision 2026-10-17, 160/ADR-014). The whole tree
runs on every PR in `.github/workflows/test.yml`: 8 shards × 4 workers on `ubuntu-latest`, then the summary job. PR #12
(`milestone/160-161`, which also carries 161 and 162):

| run | head | suite wall | result | what it found |
|---|---|---|---|---|
| 1 | `4c38d733` | 1.9 min | red, 23 cases | the tree's first Linux run: Windows assumptions in tests, a shallow checkout, the desktop shell's missing Tauri libraries, one wrapped step in 160/13's own contract, three of 162's (F-08) |
| 2 | `c7563087` | 20.1 min | red | a launcher test's `stop()` waited for `close` with no bound and hung its unit to the 20-minute limit (F-08) |
| 3 | `74ed463c` | 1.7 min | red, 3 cases | only 162's: FF-16004 (707 modules), silent catches, FF-16008's outline |
| 4 | `b66312ab` | 1.8 min | red | my fix for FF-16004 broke 162's synchronous ticker (F-10) |
| 5 | `7cffeee6` | 1.7 min | **green**, 12,988 of 12,988 | CodeQL then raised two high alerts in 160's code (F-09) |
| 6 | `c407c1a4` | **1.8 min** | **green**, 12,988 of 12,988, summed 29.4 min | every PR check green; CodeQL: no new alerts |
| gate | `21cfaaf4` | 11.5 min | **green** | `aof work regression-gate 160`, unchanged, on a runner (`gate.yml`, run 39139730420); the first runner gate at `feffa4a2` was red on one case, a wiring regex that item-24 read as a comment stripper (fixed) |

On the PR runner the suite signs off in under 2 minutes against its 10-minute budget, so F-02 is resolved by the
re-aim: its cause was the control node's own load and process-start cost, which the runner does not share.

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

### Story 07 · the child start and the heaviest child-spawning suites (@manual)

Measured 2026-10-15 in the main checkout (`cb89cb70` + the uncommitted 160/07 build), `AOF_GLOBAL_HOME` isolated,
one run at a time on an otherwise idle control node. The bundle was built by `buildTestCliBundle` (276 ms). Child
`aof` starts were counted by a `NODE_OPTIONS` preload that records, at exit, the lifetime of every node process whose
entry is the bin. Each suite ran alone through `node scripts/test-shard.mjs`, with and without
`AOF_TEST_CLI_BUNDLE`.

`aof work find 160 --json`, five starts each: source 1,076 / 1,032 / 999 / 975 / 976 ms, **median 999 ms**; bundle
394 / 280 / 264 / 260 / 275 ms, **median 275 ms**.

| suite | child `aof` starts | source · wall / child time | bundle · wall / child time | cases |
|---|---|---|---|---|
| `cli-face-contract` | 143 | 62.9 s / 204.0 s | 15.2 s / 36.0 s | 31/31 pass both |
| `work-archive-is-a-move` | 64 | 87.1 s / 71.5 s | 30.4 s / 15.4 s | 61/61 pass both |
| `acd-work-command-cli-bijection` | 62 | 64.9 s / 60.9 s | 19.0 s / 15.2 s | 4/4 pass both |

The counts are the refine census's (143, 64, 62). An uncounted first pass gave the same shape (58.8 → 15.1 s,
91.0 → 32.1 s, 77.4 → 19.9 s). FF-16008's red probes: the version string changed in a built bundle fails the parity
set on `aof --version` alone, showing both answers; and with `sourceEnv`'s strip disabled, FF-16004's own child
starts load a poisoned bundle (4 of its cases red) and both of FF-16008's loading rows go red. Both reverted. Result:
pass. verifies → `stories/07_story_a-tests-child-aof-runs-from-one-bundle/tasks/01_the-bundle-answers-as-the-source-does.feature` · "The child start and the heaviest child-spawning suites on the control node"

### Story 08 · the loop suites' git calls, and the real-git suites' setup (@manual)

Measured 2026-10-15 in the main checkout, `AOF_GLOBAL_HOME` isolated, one suite at a time through
`node scripts/test-shard.mjs`, on an otherwise idle control node. Before = HEAD's six test-support files restored
over the uncommitted tree (only the git model, the template and the fixtures differ); after = the 160/08 build. Git
processes were counted by a `--import` preload that wraps `ChildProcess.prototype.spawn` and the synchronous spawn
binding, so `spawn`, `execFile` and `spawnSync` alike are counted, by verb.

| suite | before · wall / git calls | after · wall / git calls | cases |
|---|---|---|---|
| `loop-command-wave` | 336.6 s / 4,023 | 234.7 s / 2,219 | 51/51 pass both |
| `loop-command-reconcile` | 156.1 s / 1,518 | 112.0 s / 1,160 | 18/18 pass both |
| `loop-command-stops` | 141.0 s / 611 | 128.8 s / 575 | 78/78 pass both |

| suite | before · wall · init / config / add / commit | after · wall · init / config / add / commit | cases |
|---|---|---|---|
| `work-dispatch-lanes` | 108.2 s · 88 / 176 / 219 / 216 | 89.9 s · 1 / 2 / 219 / 216 | 100/100 pass both |
| `gate-propagation-refusals-leave-branch` | 45.2 s · 37 / 82 / 108 / 101 | 39.0 s · 30 / 61 / 108 / 101 | 37/37 pass both |
| `blocked-run-parking` | 43.8 s · 52 / 156 / 52 / 52 | 31.1 s · 1 / 3 / 52 / 52 | 42/42 pass both |

The before counts are the refine census's (4,018, 1,507, 918, 517, 1,836, within a handful). What `init` and
`config` remain in `gate-propagation-refusals-leave-branch` are its bare `origin` and the scratch clones it pushes
from, which are not the fixture's repository. The re-sort ran every real-git case of the three loop suites on the
model (a temporary switch, removed): wave 43/51 and reconcile 12/18 passed there, stops' five real-git repair
cases did not. Sixteen moved (12 wave, 4 reconcile); the rest stayed by ADR-002 §3 (a merge-home or branch
assertion, a reused lane, a dirty or cleanup refusal). FF-16002's `MOVED` list carries them. Result: pass.
verifies → `stories/08_story_tests-spend-git-only-on-what-they-assert/tasks/00_the-git-model-merges-a-lane-home.feature` · "The loop suites' git calls on the control node";
`stories/08_story_tests-spend-git-only-on-what-they-assert/tasks/01_a-real-git-fixture-starts-from-a-template.feature` · "The real-git suites' setup cost on the control node"

FF-16009's red probes: the three-way merge taking ours where only theirs changed, and the merge's first stdout
line naming another strategy — each turns the merge-home outline and the dirty-refusal row red; and a template
built without its first `config` pair turns "indistinguishable from an init-built one" and "built once per
process" red. All reverted. The 44 other suites that import the changed fixtures or the model were each run alone
afterwards: 44/44 green.

### Story 09 · the unit count and the summed time (@manual)

Measured 2026-10-15 in the main checkout, `AOF_GLOBAL_HOME` isolated, over the timings of the last whole-tree run
(`.tmp/test-timings.json`). `node scripts/test-sharded.mjs --plan` before: **1,235 units**; after: **339 units, 68
packed, holding 964 files**. The ten heaviest units are the same ten, in the same order, at the same estimates.

Twenty short arch suites (recorded 1–10 s each, 90 cases), through the shard entry: as twenty units one after
another **29.0 s**; as one packed unit (`--file <path> <positions>` each) **14.0 s**. 90 cases ran each way, none
failed.

Every packed unit of the real plan was then run through the real pool (8 workers, alone-retry included): 964 files,
8,765 cases in **3.6 min**, 0 not isolated, 0 not finished, and per-file timings written for all 964 files. Two
cases were red in the pool and again alone — FF-9603's "every PLAN.md is admitted" in
`acd-plan-restates-no-declared-path` and its twin in `story-plan-document` — because round 2's refine wrote
160/07's and 160/11's `PLAN.md` restating declared paths. Both plans were reworded; both suites are green. Result:
pass. verifies → `stories/09_story_small-suite-files-share-a-unit/tasks/01_a-packed-unit-accounts-per-file.feature` · "The unit count and the summed time on the control node"

### Story 10 · the scanner's readers and the corpus over this repository (@manual)

Measured 2026-10-15 in the main checkout, `AOF_GLOBAL_HOME` isolated, one run at a time. Before = the scanner and
the corpus as at HEAD; after = the 160/10 build.

| what | before | after |
|---|---|---|
| strip every `.mjs` under `test/` (1,155 files, CRLF normalised) | 1,199 ms | 644 ms |
| blank the same files (strip included) | 10,116 ms | 977 ms |
| `acd-control-derives-its-census` alone (12 cases, all pass) | 157 s | 29 s |
| `acd-source-directory-budget` alone (9 cases, all pass) | 2 s | 3 s |
| `assembleCorpus` over this repository, in-process (554 items) | 12.6 s | 0.7 s |
| `acd-candidate-formation-is-lossless` alone (7 cases, all pass) | 24 s | 8 s |
| `acd-tune-is-non-vacuous-over-this-repo` alone (1 case, passes) | 16 s | 7 s |

Every stripped and blanked output under `test/` is byte-identical to the previous scanner's (FF-16011's
whole-tree leg; the one file that differs before/after is `source-slice.mjs` itself, which this story edits), and
so is every one of the 904 `.mjs` files under `packages/` and `scripts/` when compared with the oracle. The two
corpora are byte-identical (6,569,582 bytes of JSON). FF-16011's red probe: the look-back no longer skipping
whitespace — the whole-tree leg names dozens of files. (A first probe, dropping `yield` from the keyword set,
stayed green: no test file has `yield /`, and the outline's rows survive a regex misread as division unless it
holds `//` or a quote.) FF-16012's red probe: the corpus reading snapshots by ref again — "a stream of 1 items was
listed 2 times". Both reverted. Result: pass.
verifies → `stories/10_story_the-audits-over-this-repository-read-once/tasks/00_the-source-scanner-is-linear.feature` · "The scanner's readers on the control node";
`stories/10_story_the-audits-over-this-repository-read-once/tasks/01_the-tune-corpus-lists-the-stream-once.feature` · "The corpus over this repository on the control node"

### Story 11 · the three suites, and a fourth (@manual)

Measured 2026-10-15 in the main checkout, `AOF_GLOBAL_HOME` isolated, each suite alone through the shard entry, one
at a time:

| suite | before | after | cases |
|---|---|---|---|
| `site-build` | 109 s | 108 s | 20 → 22 (the two 160/11 cases), all pass |
| `core-workspace` | 56 s | 45 s | 11/11 pass both |
| `notify-channels` | 24 s | 14 s | 33/33 pass both |
| `discord-bot` (undeclared, below) | 10 s | 3 s | 5/5 pass both |

`site-build` does not move, and the reason is measured: timed case by case, copying the runnable tree is 82 s of
its 108, and the three gate runs are about 8 s each. The copy cannot shrink to what the shard entry loads, because
the gate's own control (`acd-loop-document-current`) imports the registry in one case and walks `packages/` in
another, so it still needs the whole tree; the copy is kept, as the plan allows, and the two cases that run the
gate now share one copy instead of paying for it twice. The refine's 115 s for those spawns was measured under
four-at-a-time load, where each registry import cost about 19 s. FF-16013's red probe: `core-workspace`'s spawn
put back on `scripts/test.mjs --only` — it fails naming `test/bundle/core-workspace.test.mjs:258`, and the
shard-entry outline goes red with it. Reverted. The Pages gate step was read by eye: it runs
`node scripts/test-shard.mjs test/arch/loop/acd-loop-document-current.test.mjs` under a fresh `AOF_GLOBAL_HOME`,
and the deploy job still needs it. Result: pass.
verifies → `stories/11_story_a-test-that-needs-a-suite-run-starts-the-shard-entry/tasks/00_a-suite-run-starts-the-shard-entry.feature` · "The three suites on the control node"

### F-01 · the drain fix (@bug)

`scripts/test-sharded-pool.mjs`: once a unit has exited, its output gets `drainMs` (10 s) to close, then the pool
destroys its ends. The new case in `test/testing/test-sharded-report.test.mjs` spawns a real unit that starts a
detached process holding the unit's output, and stops it at a 1.5 s budget. Before the fix: red — "the pool
resolved 60.1 s after it started", exactly the descendant's lifetime. After: green, the suite 13/13 in 3 s;
`acd-gate-result-is-evidence` 9/9 and `test/run/regression-gate.test.mjs` 59/59 green. The fix is not yet
exercised at the real budget: the next gate run is its evidence.
verifies → `stories/05_story_the-runner-enforces-the-budget-and-a-timeout-is-not-finished/tasks/01_the-sharded-gate-is-held-to-its-budget.feature` · "F-01 · a killed unit whose descendant holds its output open still leaves the pool within the drain"

### Story 12 · the operator's claude config and the heaviest suites (@manual)

**A whole-tree run leaves the operator's claude config alone.** `~/.claude.json` held 108,151 project entries on
2026-10-17, 106,899 of them test temp folders carrying only `hasTrustDialogAccepted` (12 MB). With the operator's
word it was backed up (`~/.claude.json.backup-2026-10-17-before-temp-cleanup`) and those entries removed (12 MB →
317 KB; every kept entry and every other key byte-identical to the backup, apart from Claude Code's own
`cachedGrowthBookFeaturesAt` and `skillUsage`). The whole tree at 12 workers on `905038d6` then ran with 41 temp-folder
entries before and 41 after — Claude's own, each with more than the trust field. Result: pass.
verifies → `stories/12_story_tests-keep-their-state-their-own/tasks/00_a-test-run-trusts-folders-in-its-own-claude-home.feature` · "A whole-tree run leaves the operator's claude config alone"

**The heaviest loop and lane suites.** Measured in the round-3 trial worktree on 2026-10-16, each suite alone through
the shard entry under the same child-process profiler, before and after the three changes 160/12 then landed
verbatim (the trust home, and both stores' migrate-only-when-old): `loop-command-wave` 313 → 192 s,
`loop-command-reconcile` 185 → 94 s, `loop-command-stops` 162 → 95 s, `work-dispatch-lanes` 128 → 115 s,
`loop-cap-exhaustion-carries-the-record` 75 → 30 s, `gate-propagation-refusals-leave-branch` 51 → 48 s — 914 → 574 s,
every case green both times. The profile that chose the cut: in `loop-command-stops`, 29 s of CPU in
`ensureWorktreeTrusted` and about 36 s opening, migrating and closing the two stores. Result: pass.
verifies → `stories/12_story_tests-keep-their-state-their-own/tasks/01_a-store-opens-without-rewriting-a-current-schema.feature` · "The heaviest loop and lane suites on the control node"

### Story 13 · a pull request's checks (@manual)

PR #12, run 6 on `c407c1a4` (`gh run view 39123366197`): every shard green, the summary "Test suite: passed — Suite
wall: 1.8 min (budget 10 min), slowest shard 7 of 8 · 12988 of 12988 registered cases executed", and its drift table
in the job summary (0 files past the threshold: no baseline is saved until a green push to `main`). Result: pass.
verifies → `stories/13_story_the-whole-tree-runs-on-every-pull-request/tasks/01_the-ci-summary-judges-the-shards.feature` · "A pull request's checks show the suite inside its budget"
### F-06 · a packed unit fits its command line (@bug)

`packUnits` (`scripts/test-harness.mjs`) closes a pack when its arguments would pass `PACK_MAX_ARG_CHARS` (24,000,
counted as Windows counts a command line), as well as at its target time. The pool (`scripts/test-sharded-pool.mjs`)
turns a unit whose spawn throws, or emits `error`, into a failed unit whose output names the error; it is retried
alone and reported, and the run goes on. Red first, with only the constant declared: 400 short files packed into
one unit of 29,200 argument characters against a 4,000 bound; the default bound let 2,000 files reach 146,000; and
the pool rejected with `spawn ENAMETOOLONG`. After the fix, `test-sharded-report` 24/24 green, and the 11 suites that
import or pin the harness and the pool 231/231 green, after two expected re-keys: FF-5311's harness residue
(re-pinned with its reason) and the runtime audit's source digest for `scripts/test-harness.mjs` (expression
unchanged).
verifies → `stories/09_story_small-suite-files-share-a-unit/tasks/02_a-packed-unit-fits-its-command-line.feature` · all three F-06 scenarios

## Findings

Recalled at triage (`aof work memory recall … --kind finding --block`, four queries, recorded on 160).

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | At the real budget the runner did not exit within the gate's 2-minute grace after its own budget stop: a killed unit whose descendant held its output open never emitted `close`, so the gate's deadline killed the runner and the row named no unit. | defect (160/05) | blocker | `@bug @finding-F-01` scenario + fix; a distinct incident (m96/F-96-G is a killed run recorded as complete, a different cause) | 160/05 | fixed — red/green above |
| F-02 | The whole tree is green but takes 19.2 min on 16 workers, about twice the 10-minute budget, so the gate can only record `not-finished`. | gap (milestone objective) | blocker for the milestone | prior occurrence m144/F-03 (same cause: the tree outruns its budget); the operator chose (2026-10-15) to keep 160 open and add stories for the next levers | 160 — new stories | resolved 2026-10-18 by the operator's re-aim (160/ADR-014): on the PR runner the whole tree signs off in 1.8 min against its 10-minute budget (Whole-tree runs, round 3); the control-node gate keeps no budget |
| F-03 | 160/03's `@manual` "the warm after medians are lower than before" is falsified: the compile cache is engaged and hit, but the application import is 853 → 893 ms warm and `aof --version` 247 → 246 ms. The cost is resolution and evaluation, not compilation. | measured non-result | non-blocker | the operator chose (2026-10-15) to keep the code and record the miss; the scenario's Then stands falsified here, unedited | the next start-up lever, 160's new stories | open |
| F-04 | Contract wording that does not match the delivered face, flagged at build and at verify: 02/01's `@manual` names `aof test --story 160/02`, which needs `--scope impacted` and widens to the whole tree here (m72/F-72-AN's class); 01/00's "fails loudly … naming git" against ADR-007's empty map; 03/01's per-verb help that exits 0; 05's E5 "40 units still queued". | contract wording | non-blocker | each case asserts the real behaviour; recorded, not edited | — | open |
| F-05 | 160/10's review finding, routed at continue as a story for the operator: memory ingest's episodic indexing (`packages/knowledge/src/memory/episodic-indexing.mjs`) still read each milestone's snapshot by ref, listing the stream once per milestone — the cost 160/10 removed from the tune corpus. | defect (160/10) | non-blocker | fixed in the item, not deferred: the ingest's build carries the walk's rows and a snapshot read hands the milestone's row; a distinct incident (recall recorded on 160; m157/F-01 is a census red in the same module, another cause) | 160/10 | fixed — FF-16012's ingest row red at HEAD (3 vs 14 listings), green after; 67 memory-index suites, 541 cases green; the unbudgeted whole-tree run then caught one pin the sweep missed, `packages/knowledge/test/episodic-records.suite.mjs` (157/01 R3 asserted the reader's exact arguments), re-pinned to the row form, 200 cases green |
| F-06 | A whole-tree run at `--jobs 12`, planned from a quieter run's timings, packed 109 files into one unit; its command line passed Windows' limit and `spawn ENAMETOOLONG`, thrown inside the pool, ended the runner with no report and no timings. Any quiet run grows the next run's packs, so a gate could end this way with no row. | defect (160/09) | blocker | `@bug @finding-F-06` scenarios in a new 160/09 task (`02_a-packed-unit-fits-its-command-line.feature`; the delivered ones unedited) + fix; a distinct incident (recall recorded on 160; F-01 is a unit that would not close) | 160/09 | fixed — red/green below |
| F-07 | The test suite read and rewrote the operator's real `~/.claude.json` on every lane it drove: the trust writer resolved `os.homedir()`, and `AOF_GLOBAL_HOME` isolates `~/.aof` only. 106,899 temp-folder entries had accumulated (12 MB), parallel units raced one real file, and the read-and-rewrite was 29 s of CPU in one suite. | defect (test isolation) | blocker | fixed in 160/12 (a per-run claude home; FF-16014); the operator's file cleaned with a backup at their word. Prior occurrence of the writer's home choice: m138/F-06 (the production writer ignores `CLAUDE_CONFIG_DIR`) — a distinct fault, still open for its owner | 160/12 | fixed |
| F-08 | The whole tree had never run on Linux: on the PR runner it was red on Windows-relative homes (`path.join("C:", …)`), a drive-path locator, a drive-letter spelling, a non-executable desktop fixture, `install.ps1`'s Windows-only rows, a shallow checkout (the rename map is derived from history), the desktop shell's Tauri libraries, and a launcher test whose `stop()` waited for `close` with no bound. | platform gap | blocker for the PR | fixed on the branch, each in its own test or the workflow; the Windows-only rows use the existing flagged-not-faked gate. Prior occurrence of untested breadth: m27/F-2701 (a single-OS soak) | 160/13 | fixed — run 3 |
| F-09 | CodeQL raised two high alerts in this PR's code: the exported git spawn passed a caller's argv straight to git (second-order command injection via `--upload-pack`), and FF-16013's sweep escaped only `$` when splicing a name into a RegExp. | security | blocker for the PR | fixed: the spawn refuses `--upload-pack`/`--receive-pack`/`--exec` and pins `protocol.ext.allow=never` ahead of every argv; the RegExp escape is complete. A distinct incident | 160 (00, 11) | fixed — CodeQL: no new alerts |
| F-10 | My fix for 162's FF-16004 red loaded `drive-status.mjs` on the first lane drive, which broke 162/ADR-004's contract that the status ticker arms synchronously when a drive starts (E9–E11 and the packed unit after them). Missed locally because I read the tail of a long sweep, not its `not ok` lines. | defect (introduced at verify) | blocker for the PR | reverted; FF-16004's work-find row raised to 707 naming 162 and the reason, the path STATE records for a story that adds a module. Prior occurrence: m130/F-16 (a session driver's static reach raised with its reason) | 162 | fixed — run 5 |

## Accept decision

**2026-10-18, `aof:verify 160` — accepted.** All fourteen stories are done, each with its `@executable` scenarios green
in the whole tree and its `@manual` evidence above. Every declared control, FF-16001 to FF-16017, bites its red
probe. The objective as re-aimed on 2026-10-17 is met: the pull request suite signs off on all 12,988 registered cases
in 1.8 minutes against its 10-minute budget (PR #12, run 6), and the regression gate is green at `21cfaaf4` — `aof work
regression-gate 160`, unchanged, on a GitHub-hosted runner (`gate.yml`), 11.5 minutes (REGRESSION.md, newest row).
No blocker finding is open: F-01, F-05 to F-10 are fixed, F-02 is resolved by the re-aim, and F-03 and F-04 stay open
as non-blockers.

*Round 2's held decision, 2026-10-15, superseded:* all seven round-1 stories were accepted and the milestone stayed
`in-progress` because the gate's newest row was `not-finished` (F-02); the operator chose to refine further stories.
