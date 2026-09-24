# 129/05 · The account and the register — Outcome

## Delivered

### The four controls land under `test/arch/loop/`, registered once, non-vacuous
`acd-loop-concurrency-single-home` (FF-12901), `acd-loop-family-boundary` (FF-12902, FF-12906), `acd-lane-records-and-the-declaration` (FF-12903, FF-12907) and `acd-lane-grade-is-lane-scoped` (FF-12905) each export `archTests` (`{ name, run }`, every name `arch/129/05 FF-129…`), each one import and one spread in `test/arch/loop/index.mjs` under a 129/05 block, nothing named in `scripts/test.mjs`; every sweeping leg asserts what it FOUND before what it claims (the engine's `"refine_first"` branch, the one `dispatch.concurrency` read, the seam's `runBounded(` call, the wave's `work:next` asks, the lane mint's `resolveRefInWorktree(` binding, the `brief.loop` pass-through into the lane mint, the ladder's `work:grade` call, the `gradeBaselines` map keyed by `baseCommit`), and an emptied sweep is a red naming the file. The three fixture legs (FF-12903, FF-12907, FF-12905) drive a real two-member wave through `runLoopBody` over `test/support/loop/lane-fixture.mjs` with the injected `spawnLaneDrive` and git seams — two child calls, zero processes, the found-count guarded before the claim. Every `src` module is imported lazily inside `run()`. The `test/arch/loop` budget row is 59 (55 → 59, its `why` naming 129 and the four files).

### Every declared control of 129 resolves and has been observed red
All seven `FF-129xx` rows of `ARCHITECTURE.md`'s register resolve to a file on disk, carry no `pending` marker, and each has been made red on exactly the leg its row names, with the message recorded — the register in `VERIFICATION.md` `## Fitness functions` is the record; `aof work doctor 129` reports no `control-unresolved` at either severity.

### The sweeps read structure, not windows
`classifySites(source, { siteRe, guardRe, declarationRe })` and `topLevelArguments(body)` live in `test/support/source-slice.mjs` — the enclosing-function rule as ONE generic (FF-12906's wave-read leg passes a nested-aware declaration pattern, since `wave.mjs` declares `tick` / `runLane` two spaces in) and a depth-aware argument splitter; `acd-number-null-safe`'s `classifyNumberSites` is a five-line call onto it. Direct imports are read through `importSpecifiers`, comments stripped through the one scanner, no positional slice (FF-11902 / F-47-04-ARCH-2 green on the four).

### FF-12904 is an extension of the never-discards control, never a twin
`BRANCH_PATH_MODULES` is the six (posix, repo-relative: the mesh's three plus `src/work/dispatch.mjs`, `src/loop/wave.mjs`, `src/loop/cycle.mjs`); the sweeps are pure over an injected loader (`forbiddenFormOffenders`, `armedMergeProblems`, `dirtyPolicyLiteralSet`) so every plant is driven in-process with no checkout touched, and the default loader is `readFile`, so an absent member is ENOENT naming its path. The ARMED leg judges each module by its own argvs; the `dirtyPolicy` literal set is exactly `strict, touched-paths` and an empty set is NOT FOUND. The four shipped cases keep their names; four FF-12904 cases join them.

### The autonomous prompt names the key beside its home
One paragraph in `<config>` of `src/bundle/commands/autonomous.md` names `work.loop.concurrency`, `sequential`, `refine_first` (refine → lanes → verify, in that order), `.aof/aof.config.json` and "flag" — no numeral, no `aof work` / `aof:` token; FF-7101 leg (a) binds it (`LOOP_BOUND_VALUE_RESOLVERS["work.loop.concurrency"]` is `resolveLoopConcurrency` by identity). The three renders (`.claude`, `.codex`, `.opencode`), `src/bundle/manifest.json` and `.aof/aof.lock.json` agree with the source (`aof work update --dry-run` → 0 updates); `autonomous-shell-out-prompt`'s `survivors` config-key set is four.

### The lane suites share one fixture spelling
`writeRel`, `mergeHeadAbsent` and `conflictMarkers` are exported from `test/support/dispatch-lane-fixture.mjs`; `gate-propagation-refusals-leave-branch`, `mesh-worker-commit-diff` and `work-dispatch-lanes` import them and spell none of their own.

## Assumptions

- **The family is `src/commands/loop.mjs` plus `src/loop/*.mjs`, read by DIRECT import** — a closure walk would reach the driver through the registry and red the shipped tree for a reason that is not the invariant's (`F-17`).
- **`brief.wave` is not a wave read** — FF-12906's site pattern excludes `brief.wave` (the record's declaration of what was dispatched) and a spread's third dot; the partition read is `.wave` / `.heldSet` off a `work:next` answer.
- **The sequential call site is `settleStoryCycle`'s `worktreePath` default**, allow-listed by its exact text; `ctx.workspace.projectRoot` elsewhere in the ladder is a finding.
- **A control's plants are its own self-check; the register's probes are performed by hand** — each control exposes its sweep as a pure function over injected source so the task 00 / task 02 plant rows run in-process, and the probes over the shipped bytes are re-observed at accept by a scratchpad runner (`F-53`), never by the suite.

## Gaps

### The number sweep's private copy
- **Status:** discharged
- **Discharge condition:** `acd-number-null-safe.test.mjs` calls `classifySites` and spells no enclosing-function rule of its own.
Discharged at the `129/05` accept (`F-51`): the 42-line private copy is a five-line call onto the generic.

### A story-scoped run that is selectable from the suite
- **Status:** open
- **Discharge condition:** `aof test --scope impacted --story 129/05` runs a set narrower than the whole tree when a story's `files:` hold new paths (`F-47`'s `aof test` item).
`aof test --scope impacted --story 129/05` widens on the four new paths into every suite, which this machine cannot host (`global-work-propagation` binds `:4182`); the story's lane is the focused `--only` set recorded in `VERIFICATION.md` (the seven story suites, the standing controls its `reads:` names, the suites its folds touch), not a selection the tool made.
