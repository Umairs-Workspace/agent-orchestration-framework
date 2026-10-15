---
doc: state
---
# 160 · The whole-tree suite signs off in minutes — State

## Progress

- 2026-10-14: captured on the backlog, then promoted.
- 2026-10-14: refined (`aof:refine 160 --autonomous`, solo). Seven ADRs in ARCHITECTURE.md and
  seven stories, each with its contract. Two business questions on 160/05 were asked at the refine
  close and answered by the operator (stop at the budget; a serial run still signs off).

- 2026-10-15: verified (`aof:verify 160`). All seven stories accepted; every control bites its red probe and
  every `@manual` has its evidence (VERIFICATION.md). The whole tree is green at 19.2 min on 16 workers, so the
  10-minute gate records `not-finished` (F-02). F-01 (a killed unit held the pool open) was fixed in 160/05.
  The operator chose to keep 160 open and refine new stories for the next levers (F-02, F-03).
- 2026-10-15: refined round 2 (`aof:refine 160 --autonomous`, solo). Five ADRs (008–012), five stories
  (07–11) with contracts. 07's contract waited on its business question, 160/07 Q1. It was asked at
  the refine close and answered "Yes, bundle in the gate", and the contract was then authored.
- 2026-10-15: continued round 2 (`aof:continue 160`, solo). Stories 07–11 built, gated and reviewed, each moved
  to in-review; every `@manual` is measured in VERIFICATION.md. A final sweep of the 25 suites the five stories
  touched is green. The whole-tree gate under the bundle and the packed plan is still to run (`aof:verify 160`).
- 2026-10-15: verified round 2 (`aof:verify 160`). Stories 07–11 accepted; FF-16008 – FF-16013 recorded with red
  probes (FF-16010's run at verify). F-05 (memory ingest listed the stream per milestone) fixed in 160/10. The gate
  at `bf783248` is `not-finished` again — 0 failures, 76% of cases inside 10.9 min; unbudgeted, the whole tree is
  19.7 min (main pass about 16.3 min). F-02 stays open; the milestone stays `in-progress` pending the operator.

## Round 2 refine — notes

- **Measured at refine** (ARCHITECTURE, "Round 2"). The 19.2-min run's timings sum to 17,877 s; the
  budget needs about 8,600 s. A spawn census of the 49 heaviest suites, each run alone through the
  shard entry with a `child_process` preload: 799 child `aof` (1,620 s), 10,867 git (1,237 s), 10
  registry-runner children (194 s). The census preload itself reddened two suites
  (`loop-cap-exhaustion-carries-the-record` 1, `warm-fix-loop` 5). The first re-ran green without
  it. The census measures counts, not correctness.
- **Profiles found two quadratic costs.** `startsRegex` re-scans the whole prefix (110 of 140 s in
  the census audit). `assembleCorpus` lists the stream per item (24.7 s). Both are 160/10.
- **The budget may still be missed.** The five levers are estimated at −5,500 to −6,500 s of
  17,877 s, not counting less contention. If the gate is still over, the next levers are an
  in-process CLI for tests (child `aof` cost to near zero), and a Defender real-time-scan exclusion
  for the test temp directories. Defender is on here, and the exclusions are unreadable without
  admin. That is a machine setting, the operator's call, and not a story.
- **Default decisions (technical, in the ADRs):** a failed bundle build runs the source and says so
  (ADR-008 §2); the bundle reaches children through `AOF_TEST_CLI_BUNDLE` (§3). The model refuses a
  merge in which both sides changed one path, rather than merging lines (ADR-009 §1, ratified while
  08's contract was authored). Pack threshold 15 s, target 60 s (ADR-010). `startsRegex` has no
  look-back cap (ADR-011).
- **Red-probe rows.** `aof work doctor 160` reports `verification-missing-red-probe` for FF-16008 to
  FF-16013, because VERIFICATION.md's register exists from round 1. Each row is the builder's to
  write, with the probe it ran, when the control lands. A row written before then would be invented
  evidence.
- **The codebase graph was unavailable again.** `aof graph build .` returned `graphify-timeout`
  after 120 s. Boundaries were drawn from importer greps; no stale artifact was read.
- **Diagrams:** none. Each round-2 ADR's flow is linear.
- **Directories are at their ceilings** (`test/arch/testing` 11, `test/arch/command` 27,
  `test/testing` 8), so every round-2 control extends an existing suite.

## Notes & decisions in flight

- **Re-measured at refine, as this file asked**, from `main` at `219729b8`, which carries
  `ae1495a6` and `79b926b7`. The recorded timings sum to 40,743 s over 1,193 units. Importing
  `scripts/test.mjs` took 14.8 s, and importing the application 1.8–2.9 s. One `loop-command-wave`
  file run alone took 1,230 s wall with 8,003 git calls (1,067 s), and doctor's history reads were
  422 × 3 of them. Profiler: a `--require` preload wrapping `child_process`, then
  `syncBuiltinESMExports`.
- **Risk: the 10-minute budget may still be missed.** The budget needs about 9,000 s summed on 16
  workers, roughly −78%. The stories attack `test/loop` (12.0k s), the lane suites, process start-up
  and doctor's history reads. `test/arch` (7.8k s) has no story of its own. If the gate is still
  over budget after 00–06, the next lever is the heaviest arch suites
  (`acd-candidate-formation-is-lossless`, `acd-control-derives-its-census`,
  `acd-register-declaration-form`, `acd-work-command-cli-bijection`). The SPEC's out-of-scope
  in-process git engine is reconsidered only after that.
- **Default decisions taken (technical, documented in the ADRs):**
  - The read memo is per wave tick, never across ticks (ADR-001).
  - A selection launches `scripts/test-shard.mjs` through a new `selectProgramArgs` key. The
    registry stays in `scripts/test.mjs`, because about twenty suites and the census read its
    import text (ADR-003).
  - The compile cache is enabled in the bin and in the test harness. The SEA launcher is untouched
    (ADR-004).
  - The gate removes `GIT_*`, `CLAUDE*` and `AOF_*` except `AOF_GLOBAL_HOME`. A stopped gate writes
    no row, and the gate learns of a stop from its own run record (ADR-005; 160/04 Q1–Q3).
  - The budget reaches the program through a `budgetArgs` template, and the third row result is
    `not-finished` (ADR-006; 160/05 Q3–Q4).
  - Doctor's citation history is lazy. This lever was found at refine and was not in the SPEC
    (ADR-007, story 06).
- **The codebase graph was unavailable at refine.** `aof graph build .` returned
  `graphify-timeout` after 120 s. Boundaries were drawn from source reading and importer greps. No
  stale artifact was read.
- **Diagrams:** none drawn. Each ADR's flow is linear and is stated in its numbered decisions.
- **Lane-commit trap:** stories 02 and 05 change `.aof/aof.config.json`. A lane's reconcile
  resets `.aof/`, so commit those changes by hand on the lane branch.
- **160/06 built (2026-10-14, solo).** `readRenameMap` returns a loader. Doctor's snapshot, its
  wiki probe, validate's reads check and tune all resolve on disk first, and load history only on
  a miss. FF-16007 is in `acd-cited-path-resolves.test.mjs`. Its red probe (an eager `load()` at
  the doctor edge) was run: the outline case went red and listed the spawned walks. The `@manual`
  spawn-count profile is left for `aof:verify`.
- **160/02 built (2026-10-15, solo).** `selectProgramArgs` compiles beside `args` and replaces it
  only when a launch selects files; the gate's toolchain drops it. `loadSelected` moved to
  `scripts/test-harness.mjs` (the 142 `runnerShapedExports` precedent) so the runner and the shard
  entry share one loader; the shard entry takes several files, keeps its positions form by shape,
  and enters through the runner only for a selection holding a ring suite. FF-16003 is in
  `test-command-contract.test.mjs`; its red probe (a selection falling back to `args`) reds the
  composition outline. Measured under a concurrent 16-worker gate, one tiny suite:
  `scripts/test.mjs --only` 25.2 s, `scripts/test-shard.mjs` 0.31 s. The `@manual` timing is left for
  `aof:verify`.
- **160/03 built (2026-10-15, solo).** The bin enables the compile cache and imports `cli.mjs`
  dynamically; the harness enables it in its body. Profile-led cut: `aof --version` loaded the
  session hooks and an unused workspace binding (41 file modules, a command module among them); both
  left `cli.mjs`'s static imports, so it loads 16. `aof work find 160` stays at 706: the registry is
  its route table, and its profile (4.6 s under load) was ~3.3 s module loading — resolution stats
  (`internalModuleStat` 0.7 s, `lstat` 0.3 s) more than compilation — plus eager assembly
  (`assembleCommandsMeshIdentity` 350 ms, `assembleApplication` 318 ms, session-spawn-handler
  142 ms, loops-graph 121 ms). Medians of five, cache disabled → warm: `work find 160`
  1622 → 1429 ms, `--version` 474 → 427 ms, the default-application import 1789 → 1783 ms (the cache
  is engaged, status ENABLED, so compilation is not that import's cost). FF-16004 is in
  `acd-cli-entry-executes.test.mjs`; its red probe (a static `cli.mjs` import) reds the bin row.
- **160/00 built (2026-10-15, solo).** `memoGitReads` and `recordCommitTip` live in
  `packages/execution/src/worktrees.mjs`. **Decision: a "step" is narrower than one tick.** The wave
  takes a fresh memo for each in-process run of git work: the ask-and-dispatch tick, a lane's prelude,
  a lane's commit, a merge home, and the epoch re-mint after a cleanup. A lane's promise outlives the
  tick that opened it, and the lane's child session and the cleanup verb write the tree through no
  port. Carrying the tick's memo into the lane would serve a pre-drive tip. This keeps ADR-001's
  invariant (nothing cached across an out-of-port write). The PO can ratify the wording at verify.
  `ctx.memoGitReads` is the seam a suite uses to run the same wave unmemoised. `defaultGitExec` now
  gives `commit` its five-minute bound, because a memo-wrapped port is an injected runner and
  `commitWorktreeChanges` no longer applies its own default. **Measured on FF-16001's fixture** (one
  ready story, real git, counted at the port): 28 calls after the cut, and 29 with the memo off. The
  two targeted cuts removed about 5 more. The run made 47 git spawns in all (9 of them
  `rev-parse HEAD`). Refine's figure of 28 `rev-parse HEAD` counted every spawn of three multi-lane
  wave cases, not port calls; a one-lane cycle's port was already lean. The ceiling is pinned at 28.
  The `@manual` before/after measurement through the shard entry is verify's.
- **160/04 built (2026-10-15, solo).** `cleanLaunchEnv` sits in the gate. The keep-alive beat reads
  the driven run through `readRuns` (the run-store binding exposes no `readRun`) and aborts the launch
  when that run is no longer running. A stopped gate throws `regression-gate-stopped` before any row.
  The pool is `scripts/test-sharded-pool.mjs`. It watches stdin **only when stdin is a pipe**. An
  agent's shell hands node the `NUL` character device, which ends at once and would stop every hand
  run of `yarn test:sharded`. A Windows pipe reports none of FIFO, character device or file, so the
  test is "none of the other kinds". **Measured:** on Windows, libuv puts every non-detached child
  in its parent's kill-on-close job. A dying gate therefore already takes a non-detached runner down,
  and the runner's own job takes its units. The stdin watch is what stops the pool when the runner
  outlives its parent: POSIX, or a detached spawn. The parent-death case spawns the runner detached
  to exercise that path. A stopped run writes no timings, so killed units never shape the next
  schedule.

- **160/01 built (2026-10-15, solo).** `test/support/loop/git-fake.mjs` models the 16 verbs the loop
  sends through its port after 160/00. Each verb is held to real git by a 49-step parity script, with
  stdout, status and directory bytes compared after every step, and two red probes bite. The rule
  was applied **empirically**. Every case of the six suites ran alone on the model (a temporary
  fixture switch, since removed): 166 of 210 were green. Of the green cases, those that build a lane
  repository and ask git nothing about the repository test-side moved: **31 case sites**
  (`git: "fake"`), pinned in FF-16002's `MOVED` list. Cases that end in a real merge home stay on
  real git, because the contract refuses `merge --no-ff`. That covers every two-lane wave whose
  primary moved, the repair-on-conflict cases, and any case that reads `git log` or `merge-base`
  itself. `lane-is-local-slot` and `loop-command-probe` build no lane-fixture repository, so nothing
  moved there. **Decision (production change, outside `files:`):**
  `packages/work-loop/src/commands/dispatch.mjs` now threads the caller's `ctx.exec` through
  admission, list, sweep and cleanup. Without it, every case that closes a lane reaches git outside
  the port (cleanup), and almost nothing could move. Production `ctx.exec` is unset, so the CLI is
  unchanged. Measured: `loop-command-wave` alone took 287 s after the move, against 1,230 s alone at
  refine (different load; the `@manual` before/after is verify's).
- **160/00 × 160/01 — the dispatch verb joined the step.** Once 160/01 put the dispatch command's
  git on `ctx.exec`, FF-16001 counted it and caught a repeated `worktree list` (list and admission
  in one tick). The tick now hands its memo to the dispatch calls it makes, and cleanup gets a step
  of its own. The ceiling was re-measured at 34 against 37 unmemoised, with the reason in the
  constant's comment; 28 had counted no dispatch-verb calls at all.
- **160/01 — contract problem, flagged, not changed.** "A case that reaches git outside the port fails
  loudly on the model … it fails on the missing repository, naming git" contradicts 160/ADR-007 and
  119/ADR-004. Doctor reads history through its own seam, and with no checkout it loads an *empty*
  rename map: "never an error". Measured on the model with a missing wiki citation: doctor starts one
  real `git rev-parse HEAD`, which fails with "not a git repository", and doctor then reports the
  citation unresolved instead of passing. The case asserts exactly that: git was reached outside the
  port and failed naming the missing repository, and doctor did not pass. That is why the rule keeps
  such a case on real git.
- **160/01 review (solo), recorded:** the model's `worktree list --porcelain` never prints git's
  `prunable gitdir file points to non-existent location` for a lane whose directory is gone. No
  moved case depends on it (the slot-counting suite stayed on real git), and the parity script does
  not exercise it. A verb row is the remedy if a case ever moves that does.
- **160/01 — the mover's slicer missed one outline** (a name with a nested template literal), so the
  previous case's slice swallowed its `withLaneRepo` call and moved it. Three bound rows went red on
  the model. Caught by the run, reverted, and every `git: "fake"` was re-checked by line ownership.

- **160/05 built (2026-10-15, solo).** `budgetArgs` compiles beside `jobsArgs` (`{minutes}` once).
  A sharded launch carries it after the worker count, bounded at the budget plus 2 minutes (with or
  without `budgetArgs`); a serial launch carries neither. The pool takes `budgetMs`, and it marks
  every unit it killed as not finished: a stop, the budget, or the unit's own limit. Such a unit has
  no failure, no `not ok` line and no alone-retry, and a retry killed at its limit is not finished
  either. The report prints `# not finished - <unit>` and `# not started: <n> units`, and suppresses
  the lost-case `not ok` when unfinished units explain the loss. `GATE_RESULTS` gains `not-finished`
  with `gateResult`, the precedence's one home. The door refuses `regression-gate-not-finished`
  (code kept internal; exporting it touches two more bindings). This repo declares
  `budgetMinutes: 10` with `["--budget-min", "{minutes}"]`. The verify prose, its two tracked
  renders, the Codex variant, the manifest and the lock moved together (`aof work update` refused
  a hand-written `.agents` render, so it wrote that render and the lock itself; `.opencode` is not
  lock-managed and was rendered from the bundle). A serial row no longer carries "over budget", and
  144-02's serial row changed with it.
- **160/05 — the declared write set was incomplete:** `packages/core/assets/variants/codex/workflow.md`
  carries its own copy of the gate paragraph; `.aof/aof.lock.json` moves with any render; and the
  runtime audit again.
- **160/05 — E5's wording.** "40 units still queued … `# not started: 24 units`" only adds up as 40
  units in all, 16 in flight. The case runs that (40 planned, 16 workers): 16 not finished, 24 not
  started. Flagged, not changed.
- **160/05 review (solo), recorded (Nit):** `aof work regression-gate`'s render prints
  `not ok - regression gate …` for a not-finished row as for a red one; the detail and
  "does NOT satisfy the accept door" carry the difference.
- **160/05 — `unref` on the pool's timers drained the event loop** under fake children, so the suite
  stopped silently with no summary line. The original runner never unref'd its unit timer, so it
  was removed. Silent truncation, again: read the `# executed` line, not the exit code.

## Feedback (for retro)

- **160/06 — `--scope impacted --story` became the whole tree.** The graph was stale (built
  2026-10-06), so all 8 declared files widened as `no-registered-dependent`. The run went to
  `scope all` on the control node, ran about 3 hours, and was killed at its 2-hour deadline. That
  is the full suite this machine must not run (it binds `:4182`). This is a tooling finding,
  routed as recorded.
- **160/06 — the read set was incomplete.** `test/arch/command/acd-wiki-citation-resolver.test.mjs`
  (161's FF-16101), `packages/work/test/command-faces.test.mjs` and
  `packages/work/src/wiki-citations.mjs` pin or consume the history edge. None of them is in
  `reads:`. The two tests were updated for the loader shape, and the FF-16101 red probes were
  retargeted at the new edge.
- **160/06 — reds at HEAD that belong to other items** (seen in the widened run; not caused by
  this diff). From 161/01's lane commit: `test/work/wiki-citations.test.mjs` is unregistered
  (FF-5903), `test/work/` holds 47 children against a ceiling of 46 (FF-11904), and
  `doctor-command-core.test.mjs` has 822 lines against a frozen 688 (FF-5311). From 160/05's
  STORY.md: FF-7106 wants the tracked renders of `verify.md` declared. 154/08's `phases.suite`
  reds are contention only: 49/49 pass alone.
- **160/02 — `--scope impacted --story 160/02` launched the whole tree again**, serially: the
  declared `.aof/` and `.claude/` paths widened it to `scope all`. It was stopped at once and the
  story's suites were run by file. Same tooling finding as 160/06's, routed as recorded.
- **160/02 — a red probe on the toolchain breaks the launcher that runs it.** With the selection
  falling back to `args`, `aof test --scope file X` launched `node scripts/test.mjs X`, which is the
  whole tree. Probe a launcher seam through `node scripts/test-shard.mjs`, never through `aof test`.
- **160/02 — the declared write set was incomplete.** Also changed: `scripts/test.mjs` and
  `scripts/test-harness.mjs` (the loader's one home), `scripts/workspace-runtime-audit.json` (each
  reviewed site is keyed on its file's digest) and `test/arch/loop/acd-loop-suite-registration.test.mjs`
  (REG-MUT-11's residue, re-pinned with its reason).
- **160/03 — the declared write set was incomplete.** Also changed:
  `test/arch/command/acd-single-entry-command-core.test.mjs` (it pinned the bin's static import,
  which ADR-004 §1 removes), `test/arch/session/acd-session-verb-boots-no-registry.test.mjs`
  (FF-7205 pinned the session module and the workspace inside `cli.mjs`'s static closure), and the
  harness digests above again.
- **160/03 — contract error in `01_a-child-aof-loads-a-pinned-closure.feature`.** "Every verb
  still reaches its command" says each route answers its help and exits 0. The face has no per-verb
  help: `--help` is a flag, refused by each command's own parser with its usage line, exit 1 — before
  this story and after it (only `work memory`, which declares `help`, exits 0). The case asserts the
  real behaviour from each command's own spec. Flagged, not changed.
- **160/03 — the `work find` ceiling is a tax on every registry change.** FF-16004 pins it at 706
  by equality, so any story that adds a module to the registry's closure reds it and must raise or
  lower the row. That is ADR-004's shrink-only design; a story that adds a command will meet it.
- **Uncommitted 160/06 work reds `workspace-boundaries/all actual owners`**: `doctor.mjs` changed
  in this checkout and its runtime-audit entry was not re-keyed. It belongs to 160/06's commit.
  Re-keyed 2026-10-15 alongside 160/00's and 160/04's entries (expressions unchanged, digests updated).
- **160/00 and 160/04 — the declared write set was incomplete.** Both also changed
  `scripts/workspace-runtime-audit.json`: every reviewed site in an edited file is keyed on that file's
  digest. The read sets were incomplete as well. 160/00 needed
  `packages/mesh/src/worktrees.mjs` (`commitWorktreeChanges`, the runner rule) and
  `test/loop/loop-command-reconcile.test.mjs`, which pins the refine-end narration's full sha.
  160/04 needed `packages/execution/src/runs.mjs`'s run-store binding
  (`packages/core/src/application/bindings/run-store.mjs`), which exposes no `readRun`.
- **160/00 — the shell-size bound counts a trailing line.** `loop-command-wave`'s "the shell is
  measured smaller" splits on newlines, so `wc -l` 2218 reads as 2219. The commit-tip parsing moved
  to the execution module and the shell ended at HEAD's 2217.
- **160/04 — run minted late, gotcha recall late.** The build began before `aof work run-start 160/04`
  and before its near-miss recall, so the run carries no session id (`sessionSource` absent) and
  `observe` cannot price the build. The recall ran at the build's close; R11 (m59, assertions that
  report machine load) then turned E5's fixed 80 ms wait into a counted one. Process lesson: mint and
  recall before the first edit, even when a sibling's sweep is running.
- **160/04 review (solo), recorded:** the parent-death case drives the pool through a small harness
  rather than `scripts/test-sharded.mjs` itself, which imports the whole registry. FF-16005 (2) pins the
  runner's wiring structurally (its own stdin, when a pipe, is the pool's; its exit goes through
  `poolExit`). 160/00 review (solo): no findings beyond the step decision above.
- **Heredoc backslashes again.** Two splices lost `\\n`/`\\r` in regex and string literals. Fragments
  written with the Write tool and spliced by node survive.
- **160/07 — the test bundle cannot be the SEA's entry or format.** `sea-entry.mjs` chooses payload or
  embedded by `process.execPath` (node itself under a test), and a CJS bundle has no `import.meta.url`, so
  `coreRoot()` would anchor at node's install directory. The shared part is `CLI_BUNDLE_RECIPE` (platform,
  target, externals); the test bundle is `cli.mjs` as ESM, with each module's `import.meta` rewritten to its
  own source file's URL by a build plugin, so assets, the manifest and git resolve exactly as from source.
  Recorded in `scripts/build-sea.mjs`. The plugin's filter is a Go regex: the `u` flag is refused.
- **160/07 — the declared write set was incomplete:** `test/run/regression-gate.test.mjs` (the gate half of
  the clean-environment scenario, driven through the gate's own launch) and the runtime audit's new entry for
  the bin's dynamic import. `test/arch/session/acd-session-verb-boots-no-registry.test.mjs` needed no change:
  it starts no child (its loading-control row passes vacuously, and would bite if it ever spawned one).
- **160/07 review (solo), fixed:** the bundle was built at a fixed `.tmp/test-cli-bundle/`, so two sharded
  runs in one checkout would rewrite each other's bundle under their children. It is built into the run's own
  stamped directory and removed when the pool drains. A relative `outDir` is resolved absolute, since a
  unit's children resolve the path from their own working directory.
- **160/07 — not yet proven over the whole tree.** Every suite that names the bin or the bundle was run with
  the variable set; the whole-tree run under the bundle is the next gate's evidence.
- **160/08 — the declared write set was incomplete, and one outline row names the wrong fixture.** The
  `init`/`config` that `gate-propagation-refusals-leave-branch` and `blocked-run-parking` pay for is in
  `test/support/mesh-worker-exec-fixture.mjs` (undeclared, changed). `mesh-assign-fixture.mjs` builds no
  repository at all, so its row of "Each real-git fixture builds from the template" holds only its "no init,
  no config" half. Flagged, not changed.
- **160/08 — ADR-009 §1 supersedes a delivered 160/01 row.** 01/00's refusal outline lists
  `merge --no-ff aof/07-01` as unmodelled; the model now merges a lane home, so the test row became
  `merge --squash aof/07-01` (08's own refused row). The delivered `.feature` is unedited.
- **160/08 — run minted and recall taken late again.** The model's merge and the template were written
  before `run-start 160/08` and its recall, while 07's measurement held the machine. Neither recalled lesson
  changed the build (verdicts recorded). Same process lesson as 160/04.
- **160/09 — `runCases` is frozen, so the per-file account is the shard entry's.** FF-5311's REG-MUT-11
  digests the harness's suite loop and global-home handling. The first build printed `# file` lines from inside
  `runCases` and reddened it; the shipped build wraps each case's `run` in the shard entry instead, and
  `runCases` is byte-unchanged. The harness's residue was re-pinned for the new pure planners beside
  `suiteCaseChunks`, with the reason, as 142/09 and 160/03 did.
- **160/09 — the declared write set was incomplete:** `test/arch/loop/acd-loop-suite-registration.test.mjs`
  (that residue re-pin).
- **160/09 review (solo), fixed:** a file's `# file` seconds started at its first case, so a file whose cost is
  its import would be recorded short and packed too tightly next time. Its import time is now added to its line.
- **Round 2's refine wrote two `PLAN.md` files that FF-9603 refuses.** 160/07's and 160/11's plans restated
  paths their stories declare, which reds `acd-plan-restates-no-declared-path` and `story-plan-document` over
  the live stream. Found by 160/09's run of every packed unit; both plans reworded. Refine's authoring pass did
  not run those two controls.
- **160/10 — contract wording in "A ref that resolves to nothing is still refused by name".** `readLatestSnapshot`
  never refused: an unresolved ref reads null, before and after. The refusal naming the ref is `observeMilestone`'s
  (`milestone-not-found`). The case asserts both. Flagged, not changed.
- **160/10 — the outline's rows cannot tell a misread keyword apart.** A regex read as division survives
  stripping unless it holds `//`, `/*` or a quote, so removing `yield` from the keyword set leaves every row green;
  the whole-tree leg is what bites. Recorded with the red probes in VERIFICATION.
- **160/10 review (solo), recorded (Important):** memory ingest's episodic indexing
  (`packages/knowledge/src/memory/episodic-indexing.mjs`) still reads each item's snapshot by ref, so it lists the
  stream once per item exactly as the corpus did. The seam now takes the row; passing it there is the same
  one-line change. Outside this story's write set; routed as `story (operator)`: "memory ingest lists the stream
  once".
- **160/11 — the refine census missed a fourth spawn.** `test/discord/discord-bot.test.mjs` also started
  `scripts/test.mjs --only` to prove one suite runs. FF-16013's sweep found it; it now starts the shard entry
  (undeclared write). The allowlist holds one entry: `test-command-contract`'s bounded `runner()` child.
- **160/11 — ADR-012 §2 supersedes a delivered `site-build/01` assertion** that the gate runs "through … its
  `--only` selection". The case now asserts the shard entry, still "the project's own test command" (the
  selection program since ADR-003); no delivered `.feature` spells the `--only` form, so nothing else moves.
- **160/11 — `site-build` does not get faster alone.** Copying the runnable tree is 82 s of 108; the copy cannot
  shrink because the gate's control imports the registry and walks `packages/`. The two gate cases now share one
  copy. Shrinking it means changing `acd-loop-document-current` — a story shape for the operator, recorded.

## Verification

## Verification

- [x] `@executable` suite green (whole tree, unbudgeted, 2026-10-15)
- [x] Fitness functions green (FF-16001 – FF-16007, each with its red probe)
- [ ] Whole-tree gate green under the enforced budget on the control node
- [x] Round 2: stories 07–11 built and accepted, FF-16008 – FF-16013 each with its red probe
