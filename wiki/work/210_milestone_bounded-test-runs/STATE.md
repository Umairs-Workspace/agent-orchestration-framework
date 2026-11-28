---
doc: state
updated: 2026-11-28
---
# 210 · Bounded test runs — State

## Progress

- 2026-11-26 — Framed from a design discussion with the operator, after an Opus session looped on
  the whole suite while fixing reds. Promoted, not started. To be broken down by `aof:refine`.
- 2026-11-27 — **Verified (`aof:verify 210`).** 210/01, 210/02 and 210/03 accepted. 210/00, 210/04
  and 210/05 returned to `in-progress` with `@bug` scenarios: F-09 (00), F-10 and F-12 (04), and
  F-07, F-08 and F-11 (05). The milestone is not accepted. The verify sweep (584 suites, every
  story's named suites plus all of `test/arch`) found 210's own control reds, which no story's
  bounded choice had reached. The gate also waits on a clean commit, since 210's work is uncommitted
  and shares generated files with 198's. See VERIFICATION.md.
- 2026-11-27 — **Fix round (`aof:continue 210`, solo, milestone run 20261127T220722069Z-0002).**
  All six `@bug` scenarios green; 210/00, 210/04 and 210/05 back to `in-review`. The walk answers
  `done`. The stream-wide validate, red on 190/01's `reads:`, is fixed by two forward records in
  the rename ledger (Feedback below), and passes. Next: `aof:verify 210`.
- 2026-11-28 — **Verified, round 2 (`aof:verify 210`).** 210/00, 210/04 and 210/05 accepted, and
  all six stories are done. The 586-suite sweep and the native files show F-07 to F-12 closed. F-11
  works on this repo: red cases are now labelled pre-existing against HEAD. The milestone is not
  accepted. Next: commit 210's work apart from 198's, then run `aof work regression-gate 210` from
  a clean checkout. F-14 (198's census pin) will make that gate red until 198 fixes it.

## Notes & decisions in flight

- 2026-11-26 — **The measurement.** `aof test --scope impacted --commit HEAD~N --plan --json` for
  N = 0…7 at `eb2c25c4`: every one is `scope: "all"`, 1,314 suites.

  | Commit | Changed files | Widened |
  |---|---|---|
  | HEAD~0 | 4 | 3 `not-in-graph` |
  | HEAD~1 | 1 | 1 `not-in-graph` |
  | HEAD~2 | 7 | 5 `not-in-graph` |
  | HEAD~3 | 102 | 54 `not-in-graph`, 2 `no-registered-dependent` |
  | HEAD~4 | 91 | 59 `not-in-graph`, 4 `no-registered-dependent` |
  | HEAD~5 | 2 | 2 `not-in-graph` |
  | HEAD~6 | 5 | 5 `not-in-graph` |
  | HEAD~7 | 138 | 36 `not-in-graph`, 13 `no-registered-dependent` |

  HEAD~1, HEAD~5 and HEAD~6 changed only `wiki/work` records, and all three widened.
- 2026-11-26 — **Operator decisions.**
  - The testing approach is rewritten, and nothing is kept for backwards compatibility.
  - The loop to prevent is the fix loop: a whole-tree run, fixes, another whole-tree run "in case
    the fixes regressed something", and round again.
  - The fix-regression worry is answered by covering what the fix changed (`--failed` = the failures
    plus the importers of the fix's changes), with the whole tree at the gate.
- 2026-11-26 — **Open for refine.** None of these is decided yet:
  - Should `--all`'s refusal inside story work have an operator override?
  - How does the tool know it is inside story work rather than the gate?
  - What is "pre-existing" measured against? A clean-HEAD run of just the failing cases is the
    proposal; the last gate record is the cheaper alternative.
  - Is `--suggest` worth keeping alongside the instructions file? The proposal is yes.
  - Should anything besides the gate challenge a named run's reason, such as a review lane?
  - Is about three rounds the right no-progress threshold?
- 2026-11-26 — **Refined (`aof:refine 210 --all`).** Eight ADRs and six stories. The architecture
  answered each open item above; the default decisions taken are these:
  - **Story work** is `AOF_RUN_ID` naming a story or task run, else any running story or task run
    in this checkout (ADR-007; 210/04 Q2).
  - **Pre-existing** is measured on the work's base: the commit that added the working item's
    STORY.md or SPEC.md. It runs in its own prepared worktree, not on HEAD, because HEAD already
    holds the change once it is committed, and is the gated commit after a gate (ADR-006; 210/05 Q4).
  - **`--suggest` is kept.** The SPEC scopes it in (ADR-003).
  - **The no-progress bound is the build terminator's own**, `work.loop.buildNoProgressRounds`,
    default 2, so the third run stops a chain that has not shrunk. That is "about three", and it
    adds no second bound (ADR-005; 210/05 Q2).
  - **A fix round reruns suites, not cases** (ADR-004; 210/05 Q3).
  - **The scan follows test helpers and path mentions, never source-to-source imports** (ADR-003,
    honouring m191/R4 and m72/R7).
  - **`test-layout-suites` and `test-layout-resume` stay**, and the other four layout checks go
    (ADR-008; 210/00 Q3).
  - **A removed config key is a refusal that names it**, not a silent ignore (ADR-008).

  Asked of the operator at the review stop and answered (2026-11-26):
  - **210/00 Q1.** Yes: the structural review lane checks the agent's choice of suites.
  - **210/03 Q1.** The gate refuses a third launch, but a flag can override it, and the flag's
    use must be confirmed. That is read as the operator's harness-recorded answer to a
    `<ref> G<n>` question (ADR-007).
  - **210/04 Q1.** No override for `--all` inside story work.
  - **210/05 Q1.** A named run starts a fresh chain, and a stopped chain is never re-opened.
- 2026-11-26 — diagram not drawn: diagram-generator-missing (ADR-005's brief is kept).

## Verification

## Feedback (for retro)

- 2026-11-27 — 210/00 contract mismatch: task 01 names `node scripts/golden.mjs --lane
  work-stream`, but the registered lanes are `work-stream-fixture`, `work-stream-life`,
  `work-stream-place` and `work-stream-read`. The delivered feature was not edited; verification
  uses those concrete lanes, with the UAT template delta generated through `work-stream-place`.
- 2026-11-27 — 210/00 bounded-test migration: the existing impacted plan selects all 1,323 suites
  (`no-registered-dependent` and `not-in-graph`). ADR-001's bounded policy is applied with the
  existing `--scope file` form until 210/04 supplies named runs and `--reason`. Eight suites cover
  instructions compilation/doctor, work update, command prose, the prior declared-test contract,
  manual/loop prompt parity, teach, the toolchain one-reader control and bundle hashes.
  The live-port `test/store/global-work-propagation.test.mjs` and unrelated recall-replay are
  deliberately excluded. No whole-tree verdict is claimed.
- 2026-11-27 — 210/00 read/write declaration repair: the existing
  `test/work/lifecycle/work-test-declared.test.mjs` asserts the superseded testing prose, so it
  joins the write set. The normal renderer also writes `.aof/aof.lock.json`,
  `.aof/aof.apply-journal.json` and additional repair/all-practices golden outputs; these are
  declared. Required implementation-owner/test reads beyond the original reads list were used.

- 2026-11-27 — 210/00 existing red: `autonomous-shell-out/door: identity, namespace,
  invocation and complete pre-existing command-member set are unchanged; no rival loop or drive
  door exists` expects a command inventory without `design-system`. The unmodified HEAD test case
  reproduces the same mismatch against unchanged bundle-composition code and the existing
  design-system bundle fragment. This is a local HEAD baseline probe, not the future CLI's
  pre-existing classifier. Left unchanged. Round 1: 5 failing cases; round 2: 1 existing red,
  with all 134 other cases passing, including the story's new and updated contract assertions.
- 2026-11-27 — 210/00 pending contract clarification: task 00 says `aof work doctor`, whereas
  ADR-001, the declared implementation owners and the existing test-layout family use
  `aof project doctor`. Asked the operator whether to correct the scenario command names or wire
  the work doctor. No answer assumed; task 00 is not claimed complete pending that answer.
- 2026-11-27 — 210/01 build: `scanImporters({ projectRoot, changed, roots, suffixes, exclude,
  exportMap })` is a fresh leaf returning `selected`, per-suite `reachedBy` (`file`, `how`),
  `unreached`, `unresolved` and `unresolvedCount`. The caller supplies the census's workspace
  export map. No caller or CLI form is added before 210/04. Thirty contract/budget cases passed;
  workspace boundary audit has zero findings. The impacted plan widened to all 1,324 suites, so
  verification uses the existing file-selection CLI under the same migration decision as 210/00.
  No dependency versions or installs changed. The runtime audit drops the graph-freshness child
  process removed by 210/00 and refreshes the two surviving config-inspect stamps.

- 2026-11-27 — 210/01 review round 1, **inline self-review**, 0 Blockers. Structural: pass —
  one leaf, existing suite predicate, caller-supplied export map, no source-to-source traversal,
  no graph or persistent cache, explicit export and test registration. Behavioural: pass — all
  30 importer/budget cases green again in the review run; examples include cycles, fresh reads,
  whole-path matching, multiple reasons, unresolved specifiers and excluded suites. Craft: pass —
  syntax/whitespace and workspace boundary audit (0 findings). No UI, so design is not applicable.
  `work validate 210/01` returned no findings; `work doctor 210/01` returned 0 errors and 0 admitted
  findings (three advisory warnings: numbering-gap, rubric-join-unchecked, depends-edges-unchecked).
  No surviving review finding was routed and no work item was created. Both tasks are green.

- 2026-11-27 — 210/00 final available checks: 134 passing cases and the same one proven
  pre-existing inventory red after the Codex summary correction; no new failure. Work-init and
  all four work-stream lanes match their generated baselines. Syntax, whitespace, manifest
  hashes and workspace boundary controls pass. The obsolete short-summary instruction was fixed
  at its Codex bundle source and regenerated. No review verdict or task completion is claimed
  while the locked doctor/golden command scenarios await operator correction. A second question
  asks to name the four real golden lanes. Both answers remain pending. The owned run is closed
  cancelled at this handback, preserving the implementation and in-progress story status; no
  other story or milestone is accepted or moved.

- 2026-11-27 — 210/02–03 continued in solo mode, with exact span 210/02-03. No agents or
  milestone run were created. Existing 210/00–01 work was preserved. Both new runs are attempt 1.
  Essential owner, fixture, harness and composition reads extended the initial reads declarations;
  the corresponding implementation, architecture-pin, inventory and generated-output write paths
  were declared before editing. No locked scenario was changed.
- 2026-11-27 — 210/02 runner correction approved by the operator: “Yes, fix runner and capture.”
  The original marker ran inside the final case's `finally`, before the harness printed its result,
  and stdout/stderr concatenation lost ordering. The shared harness now accepts an optional reporter
  and after-case callback. The light entry emits all TAP through stdout and prints the marker after
  the result/diagnostic; import failures emit a zero-case marker. Default runner reporting and
  per-case isolation are unchanged. The frozen loop and residue pins were remeasured for that
  specific callback; the isolation and integration pins are unchanged. A real child-process test
  proves attribution across passing, failing, last-case and import-failure output.
- 2026-11-27 — 210/02 records retain reason, mode, absolute git-dir worktree, parent and round;
  old records read unknown values as null. Newest-red lookup is scoped to worktree and environment
  across content keys. A covering attributed red projects its failures and exit for the requested
  subset without changing stored evidence. Exit-only, unattributed and contradictory reds remain
  conservative. Build checks: 138 focused cases green after correcting three runner-output/pin
  assertions; 113 additional compatibility cases green after updating the failure-field pin and
  generated inventory/runtime snapshots. No whole-tree run or dependency install was performed.
- 2026-11-27 — 210/03 counts original launches from REGRESSION.md, excludes override/resume rows,
  and records explicit nonlaunch refusals so they consume no launch. A third/further launch needs
  `--again` plus the latest affirmative answer to its own G token, read through the existing one
  answer reader over the milestone's runs. Both interactive transcript and driven ask channels are
  exercised. Gate records preserve sharded failure units; serial failures remain unknown. The
  existing ten-row environment test now isolates each row's milestone. All 161 initial focused
  cases and four native gate checks passed; the added nonlaunch regression is checked separately.
- 2026-11-27 — Compatibility drift refreshed from current sources: the application inventory
  changed only `work:regression-gate`, `design-system:use` and `design-system:mocks-import`;
  the latter two were existing source changes. The normal bundle generator refreshed the stale
  design-system manifest hash, and `aof work update` refreshed refine, verify and design-system
  runtime output. Their source commands were not edited by this span. Workspace boundary audit
  has zero findings; source-digest stamps were refreshed only for the unchanged runtime capabilities
  in the edited gate and harness modules. Syntax and whitespace checks pass.
- 2026-11-27 — Recall decisions: retained each actual near-miss block once. 210/02 honoured
  149/R4, 167/R2, 178/R1, 07/R3 and 178/03/R2 through bounded suites, explicit failure accounting
  and temporary/in-memory adversarial fixtures. 210/03 honoured 192/R5, 190/R2, 150/R4, 203/R2
  and 178/03/R2 through local bounded fixture runs, measured launch counts and checking every red.
  No gate-machine question was reopened. The picker was unavailable for 210/03; its lexical block
  was kept unchanged. Neither story has a retry/episodic recall edge.
- 2026-11-27 — Suite selection reason: record/TAP tests cover attribution, old records,
  worktree lookup and covering answers; runner/registration/isolation tests cover the approved
  ordered-output correction. Gate, map grammar and one-reader/accept controls cover launch bounds,
  confirmations, resume and record attribution. Grade envelope/evidence and application-assembly
  tests cover downstream compatibility. The fresh importer leaf was used directly because 210/04
  has not supplied `--suggest`, named forms or `--reason` yet; execution used `--scope file`.
  Native status-gate checks ran through node:test with an isolated AOF_GLOBAL_HOME.
  Scanner candidates deliberately excluded (outside these changed behaviours; application
  composition/helper reach also points into unrelated domains):
  `test/arch/audit/acd-controls-never-execute.test.mjs`;
  `test/arch/command/acd-integration-registry-one-home.test.mjs`;
  `test/arch/graph/acd-codebase-grounding-via-commands.test.mjs`;
  `test/arch/loop/acd-loop-probe-contract.test.mjs`;
  `test/arch/loop/acd-loop-record-never-gates.test.mjs`;
  `test/arch/practices/acd-off-renders-no-practice-prose.test.mjs`;
  `test/bundle/core-workspace.test.mjs`;
  `test/bundle/site-build.test.mjs`;
  `test/discord/discord-bot.test.mjs`;
  `test/examples/continue-door-examples.test.mjs`;
  `test/examples/doctor-examples-lane.test.mjs`;
  `test/examples/refine-discovery-beat.test.mjs`;
  `test/loop/loop-driven-row-carries-the-grade.test.mjs`;
  `test/loop/loop-only-fail-redrives.test.mjs`;
  `test/notify/notify-channels.test.mjs`;
  `test/planning/provenance-at-write-time.test.mjs`;
  `test/run/run-dedup-atomic-persist.test.mjs`;
  `test/run/run-resilience-record-keys.test.mjs`;
  `test/run/run-store-record.test.mjs`;
  `test/work/architecture-slice.test.mjs`;
  `test/work/doctor-loop-record-lane.test.mjs`;
  `test/work/lifecycle/work-test-select.test.mjs`;
  `test/work/work-toolchain-declaration.test.mjs`;
  the live-port global-work-propagation and slow recall-replay suites were also excluded.
  Golden lanes for unchanged source templates belong to their owning work; no whole-tree verdict
  is claimed by these bounded runs. The scan reported 85 unresolved imports; it is advisory, not
  a claim of complete coverage.

- 2026-11-27 — 210/00 contract amended, ratified by the operator ("I'll take your lead"): task
  00's doctor scenarios now run `aof project doctor --json` (the project doctor ADR-001 and the
  declared owners name, and the one that carries the family), and task 01's golden scenario names
  `work-init` plus the four real lanes `work-stream-fixture`, `-life`, `-place` and `-read`. E4 in
  EXAMPLES.md and PLAN.md's verification step follow. No implementation changed for either.
- 2026-11-27 — 210/00 build closed (solo, run 20261127T184214436Z-0002). Suites, chosen from
  wiki/TESTING.md's area table: test-layout-check, work-update-test-layout, work-test-declared,
  map-tests-command, autonomous-shell-out-prompt, teach-frame, declared-program-single-speller,
  bundle-manifest-hashes and config-inspect (added: it pins config-inspect's audited child
  processes, which 210/00 changed). Live-port global-work-propagation and slow recall-replay are
  deliberately left out. One red was this story's: config-inspect's 199/04 case still counted
  three audited calls; 210/00 removed the graph-freshness `git log` probe (ADR-008), so the pin is
  now two, with the reason in the test. The design-system inventory red in
  autonomous-shell-out-prompt is the pre-existing one recorded above. All five golden lanes match
  their baselines; boundary audit 0 findings; validate clean; doctor 0 errors, 0 admitted.
- 2026-11-27 — 210/00 review round 1, **inline self-review**, 0 Blockers. Structural: pass — the
  key is compiled in toolchain.mjs (FF-7201's one reader), the family stays one pure function
  behind both faces, the four obsolete checks and the graph probe are gone. Behavioural: pass —
  every scenario maps to a named case (E1–E11, update warning, family presence, goldens).
  Craft: one finding **fixed** at the close — `testLayoutChecks` tested a `field` property no
  refusal carries (refusals use `key`); the dead alternative was removed. **Recorded** (Nit):
  `resolveTestToolchain` checks the instructions file with `defaultIsFile` directly, not through
  an injectable `isFile` as `resolveProgram` does; harmless today, worth folding in when 210/04
  touches the compiler. The suite-choice check ran against wiki/TESTING.md, since `--suggest` is
  210/04's. Nothing handed back as a story shape; no item created.
- 2026-11-27 — 210/02 attempt 2 (run 20261127T185746204Z-0001, retryOf 20261127T181807585Z-0000).
  Prior attempt acknowledged: that run failed `runtime_offline` — the Codex session building
  210/02–03 hit its usage limit at 18:35 during its final review, after the build and checks noted
  above. The delivery recall returned that run and no findings. The attempt re-verified the build
  on disk rather than rebuilding it: the eight focused suites (test-run-record,
  test-command-contract, grade-record-envelope, loop-suite-registration, grade-report-normalisers,
  test-record-one-writer, test-sharded-report, gate-result-is-evidence) are green; every scenario
  maps to a named case; validate clean; doctor 0 errors, 0 admitted.
- 2026-11-27 — 210/02 review round 1, **inline self-review**, 0 Blockers. Structural: pass — the
  record stays one writer, old records read nulls, the covering-red projection leaves stored
  evidence unchanged, the runner marker moved after the harness's own result via an `afterCase`
  seam without touching per-case isolation. Behavioural: pass — E1–E8 plus the outline rows, the
  real light-entry child process and legacy round trip. Craft: clean. **Recorded** (Nit):
  `findNewestRed` has no caller until 210/05; `normaliseTap` takes any `# file <path> <s> <n>`
  line as a marker, so a diagnostic printing that exact shape could misattribute — unlikely,
  noted for 210/05. Nothing routed to a story; no item created.
- 2026-11-27 — **Feedback (process):** `aof work run-start` resolved `sessionSource: live-store`
  to the wrong session twice — 210/02–03's original runs and 210/02's attempt 2 name Claude
  session 916fbe69 (working on 198 in the same checkout), not the Codex session or this one.
  With two live sessions in one checkout the live-store rung guesses; observe's cost join for
  those runs is wrong.
- 2026-11-27 — 210/03 attempt 2 (run 20261127T190255555Z-0001, retryOf 20261127T182106247Z-0000).
  Prior attempt acknowledged: failed `runtime_offline`, the same Codex usage-limit stop; the
  delivery recall returned that run and no findings. Re-verified on disk: regression-gate,
  example-map-parse, example-answer-one-reader, application-assembly, gate-result-is-evidence,
  loop-record-never-gates and the two work-command route controls are green, and
  `packages/work/test/status-gate.test.mjs` passes under node:test with an isolated
  AOF_GLOBAL_HOME. Validate clean; doctor 0 errors, 0 admitted.
- 2026-11-27 — 210/03 review round 1, **inline self-review**, 0 Blockers. Structural: pass —
  launches are counted from REGRESSION.md by one predicate (`regressionLaunchRows`), the
  confirmation is read through the one answer reader, the token grammar is extended in the one
  pair that spells it, resume and not-launched rows consume no launch. Behavioural: pass — every
  scenario of tasks 00–02 maps to a named case. **Recorded** (Nit): the question's ordinal says
  "21th"/"22th" past the twentieth launch; unreachable in practice. Nothing routed to a story; no
  item created.
- 2026-11-27 — 210/04 built (solo, run 20261127T190655599Z-0000, attempt 1). `aof test` has four
  forms: named (`<suite>… --reason`, recorded `mode: "named"` with the reason), `--suggest` (the
  working tree's changed set through the one importer scan, composed in the core test binding),
  `--failed` (refused `test-failed-unavailable` until 210/05 replaces the branch) and `--all`
  (refused `test-all-in-story-work` while a story or task run is running; `storyWorkOf` in the
  command reads the stream's items through the run store's `readRuns`/`isRunning`, so the rows are
  driven without a workspace). `select.mjs`, `declared.mjs`, the `test-select` binding, `--scope`,
  `--story`, `--since`, `--commit` and `--plan` are gone; the predicate moved to `suites.mjs`;
  `changed.mjs` reads only the working tree (`--untracked-files=all`) and an empty set is an answer.
  `work.test.couplings` is refused `test-config-key-removed`, and the project doctor reports it as
  a `test-config-key-removed` error; this repo's three couplings were removed and their knowledge
  moved into wiki/TESTING.md's area table. The gate drives `runTest({ all: true })` with no story
  check, as the whole tree's other door.
- 2026-11-27 — 210/04 contract amendment (same operator delegation as 210/00): E10's
  `aof work doctor --json` now reads `aof project doctor --json`, the doctor that carries the
  test-layout family.
- 2026-11-27 — 210/04 controls: FF-21001 (new file, registered in place of the retired FF-19003
  widens-never-narrows file), FF-21002 (acd-one-selector-one-changed-set rewritten) and FF-21003
  (a leg in reports-not-decides) are green, and each red probe was planted on the real tree,
  failed, and was restored (VERIFICATION.md). Retired with their subject: FF-7203's two
  registration-report legs; FF-17904's red probe moved from select.mjs to importers.mjs. FF-19006
  was kept, re-pointed at suites.mjs: it states ADR-008's own clause that layout.mjs keeps
  isSuiteFile as its only membership test. Budgets lowered by one in four rows
  (work/src/testing 7→6, bindings/work 16→15, test/testing 12→11, test/work/lifecycle 12→11).
- 2026-11-27 — 210/04 read/write declaration repair: the gate (`regression-gate.mjs` drives the
  all form), `regression-record.mjs` and `assemble.mjs` (comments and composition),
  wiki/TESTING.md, test-run-record, test-layout-check, regression-gate.test and
  gate-result-is-evidence also named the old forms; they were added to `files:`. The runtime
  audit's stamp for the gate's unchanged `execFile` was refreshed (source digest only). The
  package import allowlist in yarn-installation dropped select/declared and gained suites.mjs and
  importers.mjs — the latter was 210/01's, unlisted since it landed.
- 2026-11-27 — 210/04 suites (chosen from wiki/TESTING.md and the importer scan over the 16 files
  this story changed): test-command-contract, test-run-record, test-layout-check,
  test-importer-scan, the six arch/testing controls, declared-program-single-speller,
  code-graph-one-reader, derivation-proposes-never-writes, contract-set-has-one-home,
  work-test-declared, story-context-contract, application-assembly, regression-gate.test,
  gate-result-is-evidence, gate-door-lives-in-the-command-layer, loop-record-never-gates,
  notify-channels, cited-path-resolves, cli-face-contract, config-inspect, work-dispatch-lanes,
  map-tests-command, work-update-test-layout, teach-frame, yarn-installation, core-workspace, the
  two work-command route controls and bundle-manifest-hashes — all green — plus the native
  `packages/work/test/testing.test.mjs` under node:test. Left out: global-work-propagation (binds
  :4182) and ~60 suites the scan reached only because they name a temp `.aof/aof.config.json` or an
  unrelated `dispatch.mjs`. No whole tree was run.
- 2026-11-27 — **Feedback (flake, pre-existing):** `190/00 [outline] the key follows the content and
  nothing else (6 rows)` in test-run-record failed once on "the same change staged with git add
  keys the same as unstaged", then passed on two `--fresh` reruns with no change. It touches no
  code 210/04 changed; it looks like git's racy-index timing in the temp repo.
- 2026-11-27 — **Feedback (process):** 210/01's `importers.mjs` shipped without its entry in
  yarn-installation's package import allowlist, a red 210/01's suite choice did not reach.
- 2026-11-27 — 210/04 integration: `node test/integration/cli.mjs lifecycle` green, 61 scenarios,
  including 154/11's live fixture, whose step now asks `test --all --json`.
- 2026-11-27 — 210/04 review round 1, **inline self-review**, 0 Blockers. Structural: pass —
  FF-21001/2/3 green with real red probes; one scan, composed once; the predicate has one home;
  the whole tree has two doors; no graph route in the testing family; the suite choice above
  matches the scan's reach with stated exclusions. Behavioural: pass — every scenario of tasks
  00–02 maps to a named case (E1, the 7-row refusal outline, E4, the subset answer, the summary,
  E5, the empty suggestion; E6, the 6-row story-work outline, E11, no override over every flag and
  every AOF_* name in the sources, E8; E9's 6 rows, E10, the repo config, help, no graph, the
  predicate). Craft: one finding **fixed** at the close — `--suggest` walked the whole suite tree
  only to fill a total it never prints; it now skips the walk. **Recorded** (Nits): the result
  carries `scope` beside `form` only because the gate's row and the record file still read it;
  FF-7204's header still says "unwidened whole-suite run". Nothing handed back as a story shape; no
  item created.
- 2026-11-27 — 210/05 built (solo, run 20261127T194457244Z-0000, attempt 1). `aof test --failed`
  roots on this worktree's newest red (named, failed, all or gate), refuses `test-failed-no-red`,
  `test-failed-unattributed` and a latched chain's `test-fix-stopped`, and reruns the root's
  failing suites plus the scan's reach for `changedBetween(root key, current key)`; its record has
  `parent` and `round`. Every red summary ends `aof test --failed`. `chainStop` applies the two
  rules over the chain's non-pre-existing sets, with the bound injected by the core binding from
  `buildNoProgressRoundsFromConfig` (its one home), and a firing latches `stopped` on that round's
  own record. `baseline.mjs` resolves the work's base (the running story's record doc, a gate
  red's milestone SPEC.md through the gate record's new `item`, else HEAD when dirty, else
  unmeasured), keeps a detached, prepared tree per base under `<common dir>/aof/baselines` (newest
  two kept) and reruns the failing suites there through the same `runTest`, so the base's result
  is an ordinary, reusable record. Labels are `true`, `false` or `"unmeasured"`, shown apart, kept
  out of the chain's set, and the run stays red.
- 2026-11-27 — 210/05 deviation from PLAN wording: the base tree is prepared with the toolchain's
  own `resolveWorktreePrepare` + `launchStep` — the compiled step and launcher the mesh worktree
  seam calls — because mesh's `prepareWorktree` is internal to `createMeshWorktrees`. The step,
  environment and failure handling are the same; the mesh module was not widened for it.
- 2026-11-27 — 210/05 decision (flag for verify): a red run whose round LATCHES ends with the
  hand-over rather than `aof test --failed`, because that command would be refused. ADR-004 says
  "every red summary" ends with the fix round; E4's scenarios cover the unlatched rounds only.
- 2026-11-27 — **Fixed, pre-existing (190/00):** the content key copied the git index with a fresh
  mtime, which defeats git's racy-clean check, so an edit made in the same second as the last
  index write, at the same size, kept the old key and was answered as a match. This was the
  "staged keys the same as unstaged" flake above and an intermittent E6 red (1 in 4). The copy
  now keeps the index's own timestamps; test-fix-rounds + test-run-record then ran 5 of 5 clean
  (47 cases each time).
- 2026-11-27 — 210/05 incident: a smoke `aof test --failed` on this checkout rooted on an
  hour-old red, so the reach of every file changed since covered ~100 suites, likely including
  global-work-propagation (binds :4182, the live daemon's). It was stopped after two minutes; the
  daemon still held :4182 and no baseline tree had been made. The real-CLI proof was then run in a
  scratch project instead: a named red ending `aof test --failed`, a fix, and round 1 rerunning
  only the failing suite and the fix's reach, green, with the base tree made at HEAD. The repo's
  own prepare step is `yarn install --immutable`, so no baseline tree was built here.
- 2026-11-27 — 210/05 suites: test-fix-rounds (19 cases, new), test-run-record,
  test-command-contract, regression-gate.test, test-record-one-writer, gate-result-is-evidence,
  suite-registration-single-decider, declared-program-single-speller, the three 210 controls,
  source-directory-budget, yarn-installation, core-workspace, application-assembly,
  loop-record-never-gates and gate-door-lives-in-the-command-layer — all green; the importer scan
  over the seven changed modules reached no other suite. Boundary audit 0 findings after
  re-stamping the gate's unchanged `execFile`. Validate clean; doctor 0 errors, 0 admitted.
- 2026-11-27 — 210/05 review round 1, **inline self-review**, 0 Blockers. Structural: pass — the
  record leaf stays the one writer of labels and latch (FF-19001 green), the bound is read from its
  one home, the scan is reached through the one binding (FF-21002 green), the whole tree's doors
  are unchanged (FF-21003 green). Behavioural: pass — every scenario of tasks 00–02 maps to a named
  case. Routed: **story (operator)** — "a fix round honours the project's declared machine-hazard
  exclusions": `--failed`'s reach can select a suite the instructions say must not run here
  (global-work-propagation, :4182), and nothing lets a project state that to the tool; it needs
  new acceptance criteria. **Recorded:** a root red long behind the working tree widens a round's
  reach to everything changed since (ADR-004 as designed; the incident above). Nothing created.
- 2026-11-27 — **210/00 F-09 fixed** (run 20261127T220729015Z-0003). Both codebase-grounding
  allow-lists drop `config-inspect.mjs`, which imports no graph normalizer since 210/00. Suites:
  the two codebase-grounding controls, 7 cases green. Review round 1, inline, 0 Blockers.
- 2026-11-27 — **210/04 F-10 and F-12 fixed** (run 20261127T220903045Z-0001). F-10: 72/FF-7202 and
  190/FF-19003 are marked retired, superseded by 210/ADR-008, with each enforced-by cell pointing
  at 210/FF-21001's control. A cell naming no path is refused by FF-6607b ("no control path"), and
  no earlier milestone had retired a control in an accepted register, so this sets the convention:
  the row stays, says it is retired and by what, and cites the control of the rule that replaced
  it. FF-19006 stands, since its leg still enforces. F-12: `status-gate.test.mjs` expects
  `{ all: true }`; its `scope` fields are the runner's result and the row shape, which still carry
  it. Suites: FF-6607b + FF-21001 (9 cases), and the native file under `node --test` (4/4). Review
  round 1, inline, 0 Blockers.
- 2026-11-27 — **210/05 F-07, F-08 and F-11 fixed** (run 20261127T221322033Z-0001). F-07:
  `baseline.mjs` takes an injected `addTree`. The core test binding composes it from
  `@aof/execution/worktrees`' `runWorktreeAdd`, with the toolchain's prepare step on that add's
  own choke point, so the base tree is added and prepared as a lane is. F-08: the record doc comes
  from `RECORD_DOC_BY_TYPE`. F-11: the base reruns with the working declaration less
  `work.test.instructions` (`baseDeclaration` in `commands/test.mjs`). The file is the agent's
  guidance and the runner never reads it. Three new cases in test-fix-rounds, and F-11's was
  red-probed (red without `baseDeclaration`). Suites: test-fix-rounds, arch/38, FF-16801,
  FF-21001/2/3, test-record-one-writer, source-directory-budget, test-run-record,
  test-command-contract and yarn-installation (136 cases), plus core-workspace and
  application-assembly (19), all green. Left out: global-work-propagation (`:4182`). Boundary audit
  0 findings. Review round 1, inline, 0 Blockers.
- 2026-11-27 — **Process:** the near-miss recall ran for 210/05 only. 210/00's and 210/04's
  one-line fixes were built before it was run, and it was not run after the fact.
- 2026-11-28 — **Fixed (210/04): the stream-wide `aof work validate` was red on 190/01.**
  190/01's `reads:` names `packages/work/src/testing/declared.mjs` and
  `packages/core/src/application/bindings/work/test-select.mjs`, both deleted by 210/04. Validate
  on 210 and on each 210 story passed, which is why no scoped gate saw it. 119/ADR-004 keeps a
  delivered record unedited, and its resolver already reads forward records (`F`) from
  `.aof/rename-ledger.tsv`. So 210/04 appends one forward per retired module, to the code that
  replaced it under 210/ADR-008: `packages/work/src/commands/test.mjs` and
  `packages/core/src/application/bindings/commands/test.mjs`. Stream validate passes; the
  resolver's controls (`cited-path-resolve`, `acd-wiki-citation-resolver`,
  `acd-cited-path-resolves`, `citation-history`) are green. Lesson: a story that deletes a module
  runs the stream-wide validate, not only its own scope.
- 2026-11-27 — **Recorded (Nit):** the core test binding sequences the toolchain's prepare compile
  and `launchStep` itself, beside mesh's internal `prepareWorktree`. Each piece still has its one
  home, and mesh's is internal to `createMeshWorktrees` and also prepares runtime assets.
- 2026-11-27 — **Recorded (Nit):** the base tree's add is now bounded by the execution package's
  30 s git timeout, as every mesh lane's add is, rather than baseline.mjs's former 120 s.
