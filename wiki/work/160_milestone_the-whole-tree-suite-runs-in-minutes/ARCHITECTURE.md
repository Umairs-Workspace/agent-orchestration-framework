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

## Fitness functions

| id | invariant | enforced by | source |
|---|---|---|---|
| FF-16001 | Within one memoised step, no ref/topology read repeats between two writes, any write clears the memo, and a failed read is never kept; one lane cycle stays under its pinned call ceiling | `test/arch/loop/acd-loop-git-reads-once-per-step.test.mjs` — pending | ADR-001 |
| FF-16002 | The git model answers and writes exactly as real git for every verb it models, and refuses any verb it does not model | `test/arch/testing/acd-git-fake-parity.test.mjs` — pending | ADR-002 |
| FF-16003 | A declared selection launches `selectProgramArgs`, and a focused run of one suite evaluates no directory index and no unnamed suite | `test/testing/test-command-contract.test.mjs` — pending | ADR-003 |
| FF-16004 | The compile cache is enabled before the application graph loads, and a child `aof` loads no more modules than its pinned, shrink-only ceiling | `test/arch/command/acd-cli-entry-executes.test.mjs` — pending | ADR-004 |
| FF-16005 | The gate's launch environment carries no denied variable, and a runner whose stdin ends leaves no unit running | `test/arch/grade/acd-gate-result-is-evidence.test.mjs` — pending | ADR-005 |
| FF-16006 | A killed unit is never a `not ok` line, a run with a not-finished unit is never green, and `not-finished` is spelled only in `GATE_RESULTS` | `test/arch/grade/acd-gate-result-is-evidence.test.mjs` — pending | ADR-006 |
| FF-16007 | Doctor and validate over a stream whose citations all resolve on disk spawn no git for citation history, and a miss loads history once | `test/arch/command/acd-cited-path-resolves.test.mjs` — pending | ADR-007 |

Each control lands with its subject, in a suite its directory's index registers. Required red
probes, recorded in `VERIFICATION.md`: make `memoGitReads` keep a `status` answer; give the fake a
default answer for an unknown verb; let a selection fall back to `args`; import `cli.mjs` statically
again; pass the gate's environment through unfiltered; print a killed unit as `not ok`; load
history eagerly again.

## Recall decisions

Architect query: "test runner time budget, unit timeout not-finished, git spawn reduction, exec
fake", area architecture, observation `ac5014f3-d12f-4d07-bd5b-19141f5a0b75`. Results: m04 R3
(lesson, near-miss), honoured in ADR-003. m22 ADR-004 (adr), honoured in ADR-001. m72 ADR-001 (adr),
honoured: `aof test` still only selects and spawns, and the new key is a declaration. m54 ADR-003
(adr), irrelevant. m11 ADR-006 (adr), irrelevant. PO query: "whole-tree suite speed sharded gate
budget timeout loop git spawns clean environment", item 160, observation
`f3325510-a783-462c-bc95-844926d685b9`, returned empty.
