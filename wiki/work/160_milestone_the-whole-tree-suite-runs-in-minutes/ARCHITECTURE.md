---
doc: architecture
---
# 160 · The whole-tree suite signs off in minutes

Decide closed on 2026-10-14, before any contract was authored. Seven ADRs: one per lever the SPEC
names, plus the doctor history read the refine profile found, each with its measured cost beside
it. Nothing is implemented here.

**The budget arithmetic.** The recorded timings (`.tmp/test-timings.json`, 2026-10-14 12:54, taken
after `ae1495a6` and `79b926b7`) sum to **40,743 s over 1,193 units**. To fit 10 minutes on 16
workers the summed time must fall to about **9,000 s**, a cut of roughly 78%. `test/loop` is
11,967 s of it (`loop-command-wave` alone 5,134 s), `test/arch` 7,821 s, `test/work` 5,194 s and the
integration features 1,646 s. Three cases of `loop-command-wave`, run alone at refine, took 20 s
wall, and git took 13.8 s of that (137 calls). Run alone, the whole file took 1,230 s wall, with
8,003 git calls summing 1,067 s; `rev-parse HEAD` alone was 1,734 of those calls. The same file sums
to 5,134 s in the pool. So its time is mostly process spawns, which contention then multiplies, not
test logic. That is why ADRs 001, 002, 004 and 007 cut process spawns.
Whether the budget is met is measured at the milestone's gate. It is not promised here: see STATE.

## ADR-001: A loop step reads each git fact once

**Status:** Accepted
**Date:** 2026-10-14

**Context.** The loop reaches git through one injected port, `exec(args, { cwd })`, resolved by
`resolveExec` in `packages/execution/src/worktrees.mjs` and threaded as `ctx.exec` through
`packages/work-loop/src/wave.mjs`, `dispatch.mjs` and `commands/loop.mjs`. Profiled at refine
(three wave cases, real git): `rev-parse HEAD` ×28, `worktree list` ×6, `merge-base` ×10 and
`symbolic-ref` ×4 within one lane cycle. Most of these are repeats of a read whose answer cannot have
changed in between. `advanceBranchToBase` makes four calls on a lane that is already at the base.

**Decision.**
1. **A step-scoped read memo on the port.** `worktrees.mjs` gains `memoGitReads(exec)`, which
   returns an `exec` of the same shape. A step is one wave tick, and the tick wraps `ctx.exec` once
   at its start and drops the wrapper at its end. Nothing is cached across steps, because the
   agent's session writes the tree between them.
2. **What is memoised.** The memo holds only argv-identical calls, in the same `cwd`, of the
   ref/topology reads: `rev-parse`, `symbolic-ref`, `merge-base`, `show-ref`, `rev-list` and
   `worktree list`. **Never** `status`, `diff`, `log`, `check-ignore` or anything else that reads
   the working tree or content. Only a status-0 answer is kept, so a failed read is asked again.
3. **Any other verb clears the whole memo before it runs**, in every `cwd`. The verb is the first
   argument that is not an option, so `-c user.name=… commit` is a `commit`. That covers `add`,
   `commit`, `merge`, `reset`, `worktree add/remove`, `branch`, `clean`, `rm` and every verb the
   rule does not name. An unknown verb clears the memo: it fails safe, never stale.
4. **Two targeted cuts.** `advanceBranchToBase` returns `already-current` after one tip comparison
   when the lane's tip is the base. The loop's own commit path (`commitOwnWrites`) makes one
   `add`, one `commit` and reads its tip from the commit, not from a second `rev-parse`.
5. Doctor's and validate's history reads are not on this port. ADR-007 decides them.

**Consequences.** The real loop gets faster, not only its tests. A lane cycle's call count becomes
a measured ceiling that FF-16001 pins. The memo is invisible to every caller: same port, same
answers.

**Recall.** Architect recall `ac5014f3-d12f-4d07-bd5b-19141f5a0b75` returned m22 ADR-004 (git stays
the system of record), which is honoured: this memo is a read cache inside one step, never a second
store of record.

## ADR-002: Tests that are not about git run on a git model behind the same port

**Status:** Accepted
**Date:** 2026-10-14

**Context.** `test/support/loop/lane-fixture.mjs` builds a real repository per case (about 8
spawns) and hands the loop real git through `laneCtx`'s `exec` default (`realExec`). Most of the
loop suites assert loop behaviour (stops, asks, narration, records, refusals), not git's.

**Decision.**
1. **`test/support/loop/git-fake.mjs`** models a repository in memory: commits as file-map
   snapshots, refs, HEAD per worktree, and the registered worktree set. It performs the filesystem
   effects the loop depends on, so `worktree add` writes the commit's files into the lane directory
   and `worktree remove` deletes it. It answers through the same `exec(args, { cwd })` port and
   envelope (`{ stdout, stderr, status }`).
2. **An unmodelled verb or option is a thrown error naming the argv**, never a default answer. A
   test misclassified onto the fake fails loudly; it never passes vacuously.
3. **The classification rule.** A test stays on real git when its assertion is about git's
   behaviour: merge-home, worktree reuse, dirty refusal, residue refusal, branch cleanup, the
   commit graph. It also stays on real git when it reaches git through any seam other than this
   port, for example a real `work:doctor` over a stream with a missing citation, which reads
   history (ADR-007). Every other loop and lane test runs on the fake. `withLaneRepo({ git: "fake" })`
   writes the stream to disk and seeds the model without spawning a process. `laneCtx` takes the
   fake's `exec`.
4. **Parity is a control.** FF-16002 runs one scenario list against real git and against the
   fake, verb by verb, and fails on the first difference in answer or filesystem effect. A verb
   joins the fake only with a parity row.

**Consequences.** Fidelity is the risk, and FF-16002 is what bounds it. The story depends on stories
00 and 06, so that the fake models the calls the loop makes after ADR-001, not before. After ADR-007,
a real doctor over a fixture stream spawns no git, so more cases qualify for the model.

## ADR-003: A selection launches a light entry, and the registry stays where its readers look

**Status:** Accepted
**Date:** 2026-10-14

**Context.** `node scripts/test.mjs --only <file>` evaluates the whole registry first, because
ESM static imports load before any code runs. Measured at refine, that import takes 14.8 s. Moving
the registry out of `scripts/test.mjs` was weighed and rejected: about twenty suites and the census
(`packages/work/src/audit/census.mjs`, `runnerImportedSuites`) read that file's import text, and
the audit probe imports it as the declared runner. `scripts/test-shard.mjs` already runs suite files
through `runCases` without the registry.

**Decision.**
1. **`work.test.selectProgramArgs`** is an optional argv that replaces `work.test.args` when a
   selection is launched. It is compiled in `packages/work/src/testing/toolchain.mjs` beside the
   gate declaration (144's precedent: `gate.args` replaces `args` for the gate only). When it is
   absent, the selection launches exactly as today.
2. This repository declares `selectProgramArgs: ["scripts/test-shard.mjs"]` and
   `selectArgs: ["{file}"]`. `test-shard.mjs` takes one or more files. A trailing argument matching
   `^\d+(,\d+)*$` is still the positions list the sharded runner passes, so its unit argv does not
   change. A file that does not load or exports nothing runnable is reported by path, as
   `loadSelected` does.
3. **The registry, the census and `scripts/test.mjs --only` are unchanged.** The import ring (a
   suite that imports the runner) keeps `test-shard.mjs`'s existing ring entry.
4. The isolation guard hook (`.claude/hooks/aof/guard-test-isolation.mjs`) matches
   `scripts/test-shard.mjs` as well as `scripts/test.mjs`, so a hand-typed focused run is still
   blocked without `AOF_GLOBAL_HOME`.

**Recall.** m04 R3 (near-miss): importing the runner from a meta-test created an import cycle.
**Honoured**: nothing new imports `scripts/test.mjs`, and the light entry is the shared module that
the near-miss names as the fix.

## ADR-004: A child process compiles once and loads only its verb's closure

**Status:** Accepted
**Date:** 2026-10-14

**Context.** Importing `aof/default-application` takes 1.8–2.9 s per process here (measured at
refine), and `aof --version` took 4.7 s under load. Every shard unit pays it once, and every test
that spawns `aof` pays it per spawn. `packages/core/src/cli.mjs` already defers `command-core`.

**Decision.**
1. **Node's module compile cache is enabled** (`module.enableCompileCache?.()`, Node ≥ 22.1, a
   no-op where absent) before the application graph loads. That happens in
   `packages/core/bin/aof.mjs`, which moves to a dynamic import of `cli.mjs` after the call, and in
   `scripts/test-harness.mjs` for every runner and unit process. The cache lives in Node's default
   directory under the OS temp directory. Content-keyed entries are safe across payloads. The SEA
   launcher (`scripts/sea-entry.mjs`) is out of scope, because changing it costs a SEA rebuild.
2. **The verb's closure is cut where a profile says the cost is.** The builder profiles
   `aof work find <ref>` and `aof --version` startup and defers the imports their path does not use.
   The decision here is the measure, not a module list: FF-16004 counts the modules a child loads
   and pins the count after the cut, shrink-only.

## ADR-005: The gate launches clean and dies with its session

**Status:** Accepted
**Date:** 2026-10-14

**Context.** 159's gate went red from an inherited `GIT_ASKPASS` (m159/F-2), and the gate hands its
whole environment to the suite. A stopped loop leaves its gate running. `runBounded`
(`packages/execution/src/bounded-process.mjs`) kills its direct child only, so on Windows the
sharded runner's workers survive it. When the session is killed, the gate process can survive as
well.

**Decision.**
1. **A denied-prefix environment.** `regression-gate.mjs` launches the program with
   `cleanLaunchEnv(process.env)`, which drops every `GIT_*`, every `CLAUDE*` and every `AOF_*`
   except `AOF_GLOBAL_HOME`. Names are compared case-insensitively, because Windows environment
   names are case-insensitive. The function is defined once, in `regression-gate.mjs`. The gate's
   keep-alive still reads the gate's own environment.
2. **The runner owns its pool's lifetime.** `scripts/test-sharded.mjs` stops its pool when its
   stdin ends: it kills every in-flight unit, starts no more, prints its report and exits. That
   happens both when the parent ends stdin and when the parent dies, because the pipe closes either
   way.
3. **The gate stops when its run stops.** In a driven session (`AOF_RUN_ID` and
   `AOF_RUN_ITEM_DIR`), the keep-alive beat also reads that run's record through the run store the
   core binding injects. If the run is no longer running, the gate aborts the launch with
   `runBounded`'s `signal`, launched with `stdin: "pipe"`. That ends the runner's stdin, which is
   decision 2. A run stops being "running" when a cancel-level loop stop kills its session and the
   driver settles it, or when it is reclaimed. A drain lets the session, and so the gate, finish.
   The gate reads no stop request itself: the run record is the one fact. A stopped gate writes
   **no row**, because a stop is not a test result. It returns the coded refusal
   `regression-gate-stopped`. A gate with no driven run watches nothing.

## ADR-006: The runner enforces the budget, and a timeout is not-finished

**Status:** Accepted. The operator answered 160/05 Q1 and Q2 at the refine close on 2026-10-14,
taking the recommended answer to each.
**Date:** 2026-10-14

**Supersedes** 144's "an overrun is logged and never turns the row red". 144's delivered `.feature`
is not edited. The tests that pin the old behaviour change with this item.

**Decision.**
1. **The budget reaches the program.** The gate declaration gains `budgetArgs`, an argv template
   in which `{minutes}` expands once, as `jobsArgs` does. This repository declares
   `["--budget-min", "{minutes}"]` and `budgetMinutes: 10`. The gate's own launch deadline becomes
   the budget plus a 2-minute grace for the runner's report. A program that declares no
   `budgetArgs` is bounded by that deadline alone.
2. **At the budget the runner stops** (160/05 Q1, answered). It starts no new unit, kills the
   in-flight ones, prints `# not finished - <unit>` for each and `# not started: <n> units`, and
   exits non-zero.
3. **A unit killed at its own `--unit-timeout-min` is `# not finished - <unit>`**, never
   `not ok - …`, and gets no alone-retry. The retry exists to confirm a load flake, and a timeout is
   not a result to confirm.
4. **The row's third result word, `not-finished`.** It is spelled once in `GATE_RESULTS`
   (`packages/work/src/regression-record.mjs`). Precedence: any `not ok` line makes the row `red`.
   Otherwise any not-finished unit, a budget stop or the gate's own deadline expiry makes it
   `not-finished`. Otherwise it is `green`. The detail names the not-finished units apart from the
   failures. `satisfiesDoor` stays green-only, and the door refuses a `not-finished` row with its
   own code, `regression-gate-not-finished`, whose repair is "re-run, or speed the run up", never
   "fix the code".
5. **Serial runs** (160/05 Q2, answered). The budget binds the sharded gate only: a `--serial`
   launch carries no `budgetArgs`, its deadline stays `work.test.deadlineMs`, and a green serial
   row satisfies the door.

## ADR-007: Citation history is read only when a citation misses on disk

**Status:** Accepted
**Date:** 2026-10-14

**Context.** Profiled at refine, the whole `loop-command-wave` file run alone made 8,003 git calls
in 1,230 s. Of those, 422 each were `log --diff-filter=R -M`, `log --diff-filter=D -p` and
`diff --unified=10000`, about 160 s in all, plus a `rev-parse HEAD` per call for the memo key.
`79b926b7`'s per-HEAD memo cannot help there, because each case is a new repository and every
loop commit is a new HEAD. `readRenameMap` (`packages/work/src/commands/doctor.mjs`) is called
eagerly by doctor, validate and tune, and only `resolveCitedPath` consumes the map. That consumer
needs it only for a cited path that does not exist on disk.

**Decision.**
1. **History becomes a lazy source.** `readRenameMap` returns a loader that reads history at most
   once, on its first `load()`, and makes no git call before that. The per-HEAD memo stays, behind
   the loader.
2. **Resolve on disk first.** Doctor's snapshot (`buildSnapshot`), validate's citation pass and
   tune resolve every citation against the tree first. Only if at least one misses do they load
   history once and re-resolve the misses through it. A miss that history cannot resolve reports
   exactly what it reports today.
3. **The degradation is unchanged.** A repository that is not a checkout, or a git that fails, is
   still an empty map. It is reached only when a citation misses.

**Consequences.** A doctor over a stream whose citations all resolve spawns no git for citations at
all. That is every fixture stream, and on this repository every run with no stale citation.
FF-16007 pins it.

## Round 2 — the levers left after verify (F-02, F-03)

Decide reopened on 2026-10-15 and closed the same day, before any round-2 contract was authored.
Verify measured the whole tree green at **19.2 min, 17,877 s summed over 1,273 units** on 16 workers
(`.tmp/test-timings.json`, written by that run). The wall is sum-bound: 17,877 / 16 is 18.6 min. To
sign off inside 10 minutes the summed time must fall to about **8,600 s, a cut of about 52%**.

**What the time is spent on, measured at refine.** A `--import` preload that wraps `child_process`
recorded every spawn of the 49 heaviest suites (about half the summed time), each run alone through
the shard entry, four at a time:

| spawned | count | time | heaviest holders |
|---|---|---|---|
| a child `aof` (`packages/core/bin/aof.mjs`) | 799 | 1,620 s | `cli-face-contract` 143, `work-archive-is-a-move` 64, bijection 62 |
| `git` | 10,867 | 1,237 s | `loop-command-wave` 4,018, `work-dispatch-lanes` 1,836, `loop-command-reconcile` 1,507 |
| the registry runner (`node scripts/test.mjs`) | 10 | 194 s | `site-build` 3 (115 s), `test-command-contract` 3, `core-workspace` 2, `notify-channels` 2 |

Two suites spawn nothing and are CPU-bound. A profile of `acd-control-derives-its-census` (140 s
alone) put **110 s in one regex, `/\s+$/u`**, inside `startsRegex` in
`test/support/source-slice.mjs`. It is handed the whole stripped-so-far prefix at every `/`, so the
scan is quadratic in file size. Over the whole test tree, `blankStringLiterals` took 7,424 ms and
`stripComments` 953 ms; with a bounded look-back they took 764 ms and 407 ms, with byte-identical
output. 190 suites import that module. Separately, `assembleCorpus` over this repository took
**24.7 s with no spawns**, and its profile was 18 s of idle `readdir`. `corpus.mjs` calls
`readLatestSnapshot` once per item, and each call reaches `resolveMilestoneFolder`, which lists the
whole stream again (`packages/work/src/observe.mjs:1338`), so the corpus lists the stream once per
item.

Process start-up is the rest. 616 units ran under 5 s each and summed to 1,229 s, and 975 units
under 15 s summed to 4,102 s. Twenty small arch suites ran in 20.7 s as twenty processes and in
11.1 s as one.

The levers below are expected to cut about 5,500–6,500 s from the summed 17,877 s. That is not
guaranteed to reach 8,600 s; see STATE. Less load also means less contention, which shortens every
unit, and none of these estimates counts that.

## ADR-008: A test's child `aof` runs from one bundle built at the start of the run

**Status:** Accepted
**Date:** 2026-10-15

**Context.** A child `aof work find 160` takes about 2.0 s from source on this node (706 modules)
and 0.56 s from an esbuild bundle of `packages/core/src/cli.mjs`, measured side by side at refine
with byte-identical output. ADR-004's compile cache did not move it (F-03): the cost is resolving
and evaluating 706 files, not compiling them. The release already ships a bundle
(`scripts/build-sea.mjs` step 1), so the bundle is a shape the product already runs.

**Decision.**
1. **One recipe.** The bundle's esbuild options are exported from `scripts/build-sea.mjs` and the
   test bundle is built from them, never from a copy. Whatever the release bundle handles
   (externalised `node-pty`, the asset-base seam) the test bundle handles the same way.
2. **Built once per run.** The sharded runner builds the bundle before its pool starts, under
   `.tmp/`, and passes its path to every unit as `AOF_TEST_CLI_BUNDLE`. A build failure does not
   stop the run: the units run the source, and the runner prints
   `# cli bundle unavailable: <reason>`, so a slower run is visible rather than silent.
3. **The bin honours the variable.** `packages/core/bin/aof.mjs` imports the bundle named by
   `AOF_TEST_CLI_BUNDLE` when that file exists, and `../src/cli.mjs` otherwise. This follows the
   existing `AOF_TEST_*` hooks. Production never sets it, the gate's clean environment drops every
   `AOF_*` (ADR-005), and the runner sets it after that.
4. **Where the subject is the source, the source runs.** A test whose subject is how the bin loads
   (FF-16004's module counts, FF-7205's closure) strips the variable. A focused run sets nothing,
   so it runs the source.
5. **Parity is a control.** FF-16008 runs a fixed set of commands from the source and from the
   bundle and requires the same stdout, stderr and exit code from each. The set covers a command
   that reads package assets and a refused command.

**Consequences.** About 800 child spawns in the heaviest suites alone drop from about 2.0 s to about
0.6 s each. A defect that shows only when Node loads the separate source files (for example an
import cycle that the bundle orders differently) is not caught by a child-process test in the gate.
In-process tests and focused runs still load the source. That trade is the operator's to accept
(160/07 Q1).

**Recall.** `f22a188f-65aa-473a-99f7-5b031f7bab41`: m08 ADR-001 (one command core, not a
per-request subprocess) is honoured. The bundle is the same command core, and tests still drive
the CLI contract. m160 ADR-004 is completed rather than replaced: the compile cache stays.

## ADR-009: Tests spend git only on what they assert

**Status:** Accepted
**Date:** 2026-10-15

**Context.** After 160/01, `loop-command-wave` still makes 4,018 git calls alone. Its moved cases
stop at a merge home, because the model refuses `merge --no-ff`, so 30 of its 51 cases stay on real
git. Every real-git fixture builds its repository with `init`, two `config` calls, `add` and
`commit`. Measured: `config` 176 and `init`/`config` 52/156 in `blocked-run-parking`, and 219 `add`
and 130 `commit` in `work-dispatch-lanes`.

**Decision.**
1. **The model merges a lane home.** `test/support/loop/git-fake.mjs` gains `merge --no-ff`: a
   merge commit with two parents, and a three-way merge of file maps in which every path changed on
   at most one side. A merge in which both sides changed one path is **not modelled**. It throws,
   naming the argv and the path (ADR-002 §2), so that case stays on real git. Git would merge such
   a path line by line or report a conflict. The loop's lanes are write-disjoint by construction,
   so its merge homes never need either. As ADR-002 §4 requires, each new verb or option joins with
   parity rows in FF-16002.
2. **The ADR-002 rule is re-applied, empirically.** Every real-git case of the loop suites is run
   on the model. A case moves when it passes there and its subject is not merge, worktree or
   cleanup behaviour (ADR-002 §3). The moved list stays pinned in FF-16002.
3. **A real-git fixture starts from a template.** One repository per process is initialised, with
   `main` and the fixture identity configured. Each fixture copies its `.git` directory and then
   writes its own files, `add`s and `commit`s. The helper lives in `test/support/cli-spawn.mjs`,
   beside `bundleFixtureRoot`, which is the per-process fixture-cache precedent. FF-16009 holds a
   template-built repository to an `init`-built one: the same local config, symbolic HEAD, status
   and first-commit tree.

**Consequences.** Suites whose subject is git keep real git and lose only the setup spawns.
`work-dispatch-lanes`' header ("a scripted exec double would be asserting the fixture's opinion of
git") stays true: it moves nothing onto the model.

## ADR-010: Small suite files share a unit

**Status:** Accepted
**Date:** 2026-10-15

**Context.** Every unit is a process, which pays node start, the harness and the application import
before its first case. 975 units have estimates under 15 s. The shard entry already runs several
files in one process (160/02), and the serial runner runs every file in one process, so sharing a
process is the registry's normal mode, not a new risk.

**Decision.**
1. **Packing.** The runner packs files whose recorded estimate is under `--pack-seconds` (default 15)
   and that are not chunked, largest first, into units of about `--pack-target-seconds` (default 60).
   A file is never split across units. A file at or over the threshold stays its own unit, as today.
2. **The unit names its files.** A packed unit's argv names each file with its positions. The shard
   entry keeps both forms it has today, the selection form and `<file> <positions>`.
3. **Per-file accounting survives.** The shard entry prints `# file <path> <seconds> <executed>` for
   each file. Timings stay per file, so the next schedule packs from file estimates. A lost case is
   detected per file. A failed packed unit is retried alone as a unit, and the report names the
   failing case as it does today. A not-finished packed unit names every file it held.

**Consequences.** About 1,000 process start-ups fewer. A suite that leaks process state into its
neighbours is exposed here, as it already is in a serial run.

## ADR-011: The audits over this repository do their reading once

**Status:** Accepted
**Date:** 2026-10-15

**Decision.**
1. **The source scanner is linear.** `startsRegex` in `test/support/source-slice.mjs` takes the
   output and an index, and looks back over trailing whitespace and one trailing identifier only.
   It never copies or regex-scans the prefix. `stripComments` and `blankStringLiterals` keep their
   output contract byte for byte. 190 readers depend on it, and FF-16011 checks that output over the
   whole test tree.
2. **The tune corpus lists the stream once.** `assembleCorpus` lists items once
   (`corpus.mjs` already holds `allItems`) and hands each item's folder to the snapshot read, so
   nothing inside the per-item loop lists the stream again. `readLatestSnapshot` takes an
   already-resolved folder as well as a ref, and the ref form keeps today's answer. FF-16012 counts
   the listings per corpus. This is production code: `aof work tune` gets faster too.

**Consequences.** `acd-control-derives-its-census` loses most of its 110 s of regex time, and
every reader of the scanner gets faster in proportion to its file sizes. The corpus suites
(`acd-candidate-formation-is-lossless` assembles it twice, `acd-tune-is-non-vacuous-over-this-repo`
once) lose most of their 24.7 s per assembly.

## ADR-012: A test that needs a suite run starts the shard entry

**Status:** Accepted
**Date:** 2026-10-15

**Context.** Each child `node scripts/test.mjs --only <file>` pays the registry import first,
measured at about 19 s per spawn under the census load. `site-build` spawns it three times, because
the Pages workflow (`.github/workflows/pages.yml:72`) spells its gate that way.
`notify-channels` and `core-workspace` spawn it to prove that one suite runs.

**Decision.**
1. **The rule.** A test spawns `scripts/test.mjs` only when the registry runner itself is its
   subject: its `--only` flag, its registration, its import ring. A test that only needs a suite to
   run starts `scripts/test-shard.mjs`, the declared selection program since ADR-003.
2. **The Pages gate follows the rule.** `pages.yml`'s gate step runs the shard entry over the same
   control, and `site-build`'s copy of the runnable tree shrinks to what the shard entry loads.
3. **FF-16013** finds every spawn of `scripts/test.mjs` under `test/` and requires each one to be
   on an allowlist that names its subject. `test-command-contract`'s rows, priced and ruled on in
   72/ADR-004 §6, are such subjects.

## Fitness functions

| id | invariant | enforced by | source |
|---|---|---|---|
| FF-16001 | Within one memoised step, no ref/topology read repeats between two writes, any write clears the memo, and a failed read is never kept; one lane cycle stays under its pinned call ceiling | `test/arch/loop/acd-loop-git-reads-once-per-step.test.mjs` | ADR-001 |
| FF-16002 | The git model answers and writes exactly as real git for every verb it models, and refuses any verb it does not model | `test/arch/testing/acd-git-fake-parity.test.mjs` | ADR-002 |
| FF-16003 | A declared selection launches `selectProgramArgs`, and a focused run of one suite evaluates no directory index and no unnamed suite | `test/testing/test-command-contract.test.mjs` | ADR-003 |
| FF-16004 | The compile cache is enabled before the application graph loads, and a child `aof` loads no more modules than its pinned, shrink-only ceiling | `test/arch/command/acd-cli-entry-executes.test.mjs` | ADR-004 |
| FF-16005 | The gate's launch environment carries no denied variable, and a runner whose stdin ends leaves no unit running | `test/arch/grade/acd-gate-result-is-evidence.test.mjs` | ADR-005 |
| FF-16006 | A killed unit is never a `not ok` line, a run with a not-finished unit is never green, and `not-finished` is spelled only in `GATE_RESULTS` | `test/arch/grade/acd-gate-result-is-evidence.test.mjs` | ADR-006 |
| FF-16007 | Doctor and validate over a stream whose citations all resolve on disk spawn no git for citation history, and a miss loads history once | `test/arch/command/acd-cited-path-resolves.test.mjs` | ADR-007 |
| FF-16008 | The bundle answers a fixed command set exactly as the source does, the bin loads it only when `AOF_TEST_CLI_BUNDLE` names a file, and the sharded runner builds it once for every unit | `test/testing/build-sea-recipe-guards.test.mjs` | ADR-008 |
| FF-16009 | A template-built fixture repository is indistinguishable from an `init`-built one, and the model's `merge --no-ff` answers and writes as real git | `test/arch/testing/acd-git-fake-parity.test.mjs` | ADR-009 |
| FF-16010 | Packed units run every registered case exactly once, a file at or over the pack threshold is its own unit, and timings stay per file | `test/testing/test-sharded-report.test.mjs` | ADR-010 |
| FF-16011 | `stripComments` and `blankStringLiterals` give byte-identical output over the whole test tree, and the regex test never reads the prefix it was handed | `test/arch/audit/acd-comment-stripper-order.test.mjs` | ADR-011 |
| FF-16012 | One corpus assembly lists the stream once, whatever the number of items | `test/arch/planning/acd-tune-corpus-declares-its-reads.test.mjs` | ADR-011 |
| FF-16013 | Every spawn of `scripts/test.mjs` under `test/` is on an allowlist that names its subject | `test/arch/testing/acd-test-suite-registration.test.mjs` | ADR-012 |

Each control lands with its subject, in a suite its directory's index registers. Required red
probes, recorded in `VERIFICATION.md`: make `memoGitReads` keep a `status` answer; give the fake a
default answer for an unknown verb; let a selection fall back to `args`; import `cli.mjs` statically
again; pass the gate's environment through unfiltered; print a killed unit as `not ok`; load
history eagerly again. Round 2: make the bundle answer one command differently (a changed version
string in the bundle only); give the template repository a different default branch; let a packed
unit drop its last file; hand `startsRegex` the whole prefix again and scan it with `/\s+$/u` (the
output check stays green; the structural leg reds); re-list the stream inside the corpus's per-item
loop; add an unlisted `scripts/test.mjs` spawn to a suite.

## Recall decisions

Architect query: "test runner time budget, unit timeout not-finished, git spawn reduction, exec
fake", area architecture, observation `ac5014f3-d12f-4d07-bd5b-19141f5a0b75`. Results: m04 R3
(lesson, near-miss), honoured in ADR-003. m22 ADR-004 (adr), honoured in ADR-001. m72 ADR-001 (adr),
honoured: `aof test` still only selects and spawns, and the new key is a declaration. m54 ADR-003
(adr), irrelevant. m11 ADR-006 (adr), irrelevant. PO query: "whole-tree suite speed sharded gate
budget timeout loop git spawns clean environment", item 160, observation
`f3325510-a783-462c-bc95-844926d685b9`, returned empty.

Round 2. Architect query: "test suite budget child process startup in-process CLI batching units",
area architecture, observation `f22a188f-65aa-473a-99f7-5b031f7bab41`. m160 ADR-004 and ADR-006,
honoured (ADR-008 completes the first; the budget is unchanged). m08 ADR-001, honoured in ADR-008.
m129 ADR-005 and m59 ADR-002, irrelevant. PO query: "whole-tree suite speed budget child aof spawn
startup batching heavy audits", item 160, observation `2638cfe9-2b35-402d-a9c0-254b79ed580e`.
m160 ADR-004 and F-02, honoured (these stories are F-02's route). m160/02 R2 (near-miss: a red probe
on a launcher broke the launcher that ran it), honoured: 160/07's and 160/09's probes run through
`node scripts/test-shard.mjs`, never through `aof test`. m160/05's drain gap and R1, irrelevant to
the breakdown (the next gate run is their evidence).
