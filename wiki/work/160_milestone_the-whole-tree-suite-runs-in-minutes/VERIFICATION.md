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

## Findings

Recalled at triage (`aof work memory recall … --kind finding --block`, four queries, recorded on 160).

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | At the real budget the runner did not exit within the gate's 2-minute grace after its own budget stop: a killed unit whose descendant held its output open never emitted `close`, so the gate's deadline killed the runner and the row named no unit. | defect (160/05) | blocker | `@bug @finding-F-01` scenario + fix; a distinct incident (m96/F-96-G is a killed run recorded as complete, a different cause) | 160/05 | fixed — red/green above |
| F-02 | The whole tree is green but takes 19.2 min on 16 workers, about twice the 10-minute budget, so the gate can only record `not-finished`. | gap (milestone objective) | blocker for the milestone | prior occurrence m144/F-03 (same cause: the tree outruns its budget); the operator chose (2026-10-15) to keep 160 open and add stories for the next levers | 160 — new stories | open — round 2 (07–11) landed and the gate is still `not-finished`: the main pass needs about 16 min on 16 workers (Whole-tree runs, round 2) |
| F-03 | 160/03's `@manual` "the warm after medians are lower than before" is falsified: the compile cache is engaged and hit, but the application import is 853 → 893 ms warm and `aof --version` 247 → 246 ms. The cost is resolution and evaluation, not compilation. | measured non-result | non-blocker | the operator chose (2026-10-15) to keep the code and record the miss; the scenario's Then stands falsified here, unedited | the next start-up lever, 160's new stories | open |
| F-04 | Contract wording that does not match the delivered face, flagged at build and at verify: 02/01's `@manual` names `aof test --story 160/02`, which needs `--scope impacted` and widens to the whole tree here (m72/F-72-AN's class); 01/00's "fails loudly … naming git" against ADR-007's empty map; 03/01's per-verb help that exits 0; 05's E5 "40 units still queued". | contract wording | non-blocker | each case asserts the real behaviour; recorded, not edited | — | open |
| F-05 | 160/10's review finding, routed at continue as a story for the operator: memory ingest's episodic indexing (`packages/knowledge/src/memory/episodic-indexing.mjs`) still read each milestone's snapshot by ref, listing the stream once per milestone — the cost 160/10 removed from the tune corpus. | defect (160/10) | non-blocker | fixed in the item, not deferred: the ingest's build carries the walk's rows and a snapshot read hands the milestone's row; a distinct incident (recall recorded on 160; m157/F-01 is a census red in the same module, another cause) | 160/10 | fixed — FF-16012's ingest row red at HEAD (3 vs 14 listings), green after; 67 memory-index suites, 541 cases green; the unbudgeted whole-tree run then caught one pin the sweep missed, `packages/knowledge/test/episodic-records.suite.mjs` (157/01 R3 asserted the reader's exact arguments), re-pinned to the row form, 200 cases green |

## Accept decision

2026-10-15, `aof:verify 160`. All seven stories are accepted: every `@executable` scenario is green in the
whole-tree run, every `@manual` scenario has its evidence above (03/00's as a recorded miss, F-03), F-01 is fixed,
and every control's red probe bites. **The milestone stays `in-progress`:** its objective is the 10-minute sign-off,
the gate's newest row is `not-finished`, and F-02 is open. The operator's decision is to refine new 160 stories for
the next levers — pool contention on the loop suites, `work-dispatch-lanes`, the heavy arch audits, process
start-up's resolution cost — and to re-run `aof work regression-gate 160` when they land.
