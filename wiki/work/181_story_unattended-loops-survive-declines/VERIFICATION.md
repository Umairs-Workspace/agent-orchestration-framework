---
doc: verification
---
# 181 · Verification

## Reproduction and decisions

The reported sources were inspected in this repository. External project-sijil files and running loops were not modified.

User-supplied production evidence:
- project-sijil commit 48f93cf (verify's recorded decline).
- wiki/work/07_milestone_erasure-retention-recovery/stories/00_story_erasure-plan/runs/node-7297/20261030T113712816Z-0003.json.
- ~/.aof/mesh/logs/loop-diag.07.2026-10-30T11-37-03-638Z.log and loop-diag.07.2026-10-30T00-53-25-020Z.log.

ADRs in ARCHITECTURE.md record execution-versus-acceptance semantics, status-based handback, and shared rubric command validation. The loop engine, wave failure classification, retry policy and grade verdict vocabulary remain unchanged.

## Red regressions before fixes

Ran node scripts/test-shard.mjs over codex-app-server.suite.mjs, work-loop-phase-map.test.mjs and loop-command-refusals.test.mjs before production changes: 275 cases, exactly 3 failures, one for each defect. Log: .tmp/175-before.log (local, ignored).

- 181/00: both runtime completion instructions lacked the execution-versus-acceptance contract. The regression pins the injected contract for refine, continue and verify, exercises Codex complete and a Claude PTY decline ending cleanly, and retains real Codex phase_failed as failed.
- 181/01: the shipped verify procedure did not instruct the status handback. The strengthened regression checks BOTH rendered outputs: .claude/commands/aof/verify.md and .agents/skills/aof-verify/procedure.md. It also failed against the old Codex-native variant after the Claude source alone was fixed (.tmp/175-runtime-procedure-before.log).
- 181/02: doctor did not report the unusable rubric command. The regression covers missing/null/empty/string commands, an empty executable and non-string arguments; checks doctor scope, launch, dry-run, resume and L3; asserts zero session launches and unchanged runner-spawn-failed grading. Absent rubrics and argv accepted by the existing usableCommand rule remain accepted.

An additional same-process loop regression passed before the fix once its fixture explicitly returned the story to in-progress: this established that the production fix belongs in both verify procedures, with no engine-routing change. It asserts verify → continue → verify. Existing and new pure-engine cases retain the restart rule for genuinely in-review stories and the existing attempt cap.

## Validation

- Expanded node scripts/test-shard.mjs run: 1,046 cases; 1,043 passed, with three structural-check failures. The shell ceiling and both copies of the regex spawn detector were corrected and passed focused reruns. Log: .tmp/175-final-tests.log.
- All four 175 regressions passed after the final production changes (node .tmp/175-regressions.mjs). The script selects the cases from their existing registered suites; it adds no separate test registration.
- Shell-size check: 1/1 passed after the documented four-line allowance (node .tmp/175-review-checks.mjs).
- Bundle manifest hashes, advisory-lane invariants and rubric doctor purity: 17/17 passed after final asset generation and registry placement (.tmp/175-final-recheck.log).
- Grade liveness and single-spawn architecture checks: 14/14 passed after the shared syntax-aware detector correction; final namespace/alias coverage was rerun in the same two suites (.tmp/175-spawn-final.log).
- node scripts/generate-bundle-manifest.mjs regenerated the 179-entry shipped manifest; only the two verify procedure hashes changed.
- node packages/core/bin/aof.mjs work validate 175 --json: [] (zero findings), including after work status 175 in-review.
- git diff --check: passed after removing an extra EOF blank line.

The expanded selection comprised the Codex App Server and runtime-session suites; bundle-runtime-variants, codex-native-assets and work-update; loop phase-map, refusals, gate, resume and wave; the grade and arch/grade indexes; and the bundle-hash, advisory-lane, controls-never-execute, worker-driver, runtime-boundary and loop-route fitness checks. No failed behavioral case remains from these runs.

The first expanded run caught a missing composition binding for usableCommand; fixed and covered by the application-level launch regression. A later run caught the loop shell's line ceiling; the four-line preflight allowance is recorded in ADR-003 and the existing fitness check.

No dependency or install behavior changed; no installs were run. No UI files changed. Native model sessions were not replayed: runtime checks use scripted App Server and PTY fixtures. A whole-tree sharded gate has not been run; this is a focused story verification on the shared working tree, which already contained unrelated audit-control edits.

## Rollout and replay

Deploy the updated AOF executable/source and restart loop/worker processes that have already loaded the old modules. Run aof work update in each target checkout to install both updated verify procedures; already-launched sessions retain their original instructions.

Historical phase_failed records are not rewritten or made retryable. A resume can select the same failed verify lineage and stop again, even after a repair continue. For a loop halted by this old misclassification, inspect its recorded decline, ensure the declined story is in-progress via the status command, and start a fresh loop invocation without --resume after updating. Preserve the original evidence. Existing genuine in-review stories still route to their review gate.

Correct any unusable work.rubric.command before relaunch; preflight now rejects it immediately. Valid argv shape does not guarantee an executable exists. On Windows, pnpm/npx .cmd shims still require a direct executable declaration (for example node plus the runner's .mjs entry point); shell behavior is unchanged.

Existing recorded indeterminate grades are also retained. A review gate can still consult them; the new preflight prevents new wasted runs and does not retroactively repair historical grading evidence.

## Main files

| Defect | Implementation | Regression coverage |
| --- | --- | --- |
| Phase completion versus acceptance | packages/execution/src/runtime-session.mjs, codex-app-server.mjs, session-driver.mjs | packages/execution/test/codex-app-server.suite.mjs; existing runtime-session.suite.mjs |
| Decline handback | packages/core/assets/commands/verify.md; packages/core/assets/variants/codex/workflow.md; regenerated packages/core/assets/manifest.json | test/loop/work-loop-phase-map.test.mjs; test/loop/loop-command-gate.test.mjs; existing resume/wave and bundle update suites |
| Unusable rubric preflight | packages/work/src/grade.mjs; packages/work/src/commands/grade.mjs; packages/work/src/doctor/index.mjs; packages/work-loop/src/commands/loop.mjs; packages/core/src/application/bindings/commands/loop.mjs; README.md | test/loop/loop-command-refusals.test.mjs; existing grade and doctor suites; shell-size bound in loop-command-wave.test.mjs |

Expanded grade coverage exposed a false positive in the existing single-spawner detector: it counted the diagnostic string work.rubric.command as a config read and RegExp.exec as a process spawn. Updated both detectors to share syntax inspection using the already-pinned TypeScript parser, with negative probes for both false positives and positive probes for spawn/exec calls. No production spawn path changed.

## Findings

| id | observed | type | severity | triage | routed-to | status |
| --- | --- | --- | --- | --- | --- | --- |
| F-175-01 | rubricConfigurationGroup appeared twice in CHECK_GROUPS; finding deduplication hid the second execution | bug | low | Fixed in this story; keep one built-in registration and assert it is registered once | packages/work/src/doctor/index.mjs; test/loop/loop-command-refusals.test.mjs | verified |

The review assertion reproduced the issue as 2 !== 1 before removal (.tmp/175-close-red.log). Prior-finding recall returned 69/F-69-V2, 87/F-87-A, 57/F-57-01-1, 129/F-35 and 102/F-102-C; none describes duplicate execution of the same doctor group. The actual query and returned identities were retained in .tmp/175-review-finding-recall.txt and submitted as a verify-finding recall observation.

## Acceptance review — 2026-10-30

Review ran inline under work.agents.mode: solo. Structural review checked the diff against ADR-001 through ADR-003: one phase contract, unchanged engine/status and retry policy, a shared pure command predicate, and an early invocation guard. F-175-01 was reproduced and fixed before acceptance. The configuration group is now registered once.

Behavioural review checked the three contracts against their registered cases, including the genuine in-review restart route, unchanged actual phase failures, absent/usable rubrics, and the preserved grade failure code. No UI surface or @uat/@manual scenario is declared by this story.

Craft checks: all 16 declared changed .mjs files pass node --check; git diff --check is clean. These files are JavaScript and have no configured TypeScript/lint lane; syntax checks and the runtime suites are the applicable automated checks, not a claimed TypeScript build.

### Scope and traceability

The story now declares its implementation/test files. The production impacted selector was evaluated without launching a runner: it widens to all 1,247 suite files because 11 declared paths have no graph entry or registered dependent. To follow verify's story-scope rule, the acceptance run uses the explicit file-scope fallback for the story's registered suites and relevant fitness checks. This is not a whole-tree regression gate. The selector reasons and all loop/health findings are preserved verbatim in [acceptance-gates.json](verification/acceptance-gates.json).

| Contract | Registered evidence |
| --- | --- |
| 00 · A recorded decline completes on both runtimes | 181/00 in packages/execution/test/codex-app-server.suite.mjs |
| 01 · A blocker handback resumes development without rebuilding genuine review work | 181/01 in test/loop/work-loop-phase-map.test.mjs; same-process verify → continue → verify in loop-command-gate.test.mjs |
| 02 · An unusable rubric is reported before any session starts | 181/02 in test/loop/loop-command-refusals.test.mjs, including six invalid forms, valid/absent boundaries, four invocation modes and unchanged grading |

Retrospective and OUTCOME.md were authored by this accepting session. The observability snapshot has zero attributable runs; the delivery-history recall was empty. No native-model replay or human sign-off is inferred from those results.

### Interrupted acceptance attempt

The first file-scoped CLI acceptance attempt ended without a report when the session was interrupted; its empty output is not a test verdict. The same eleven selected suite files were rerun through scripts/test-shard.mjs in four independent groups with incremental logs (.tmp/175-accept-runtime.log, .tmp/175-accept-gates.log, .tmp/175-accept-wave.log and .tmp/175-accept-fitness.log). Each uses the standard runCases harness and its per-case isolated global home. The final results below supersede that unfinished attempt.

### Final acceptance results

- Eleven selected suite files completed: **370 cases, 0 failures** (runtime/routing 217; preflight/gates 61; wave 52; fitness 40). All four 175 regressions passed, including the added single-registration assertion. Exact commands, suite timings and passing case names are retained in [acceptance-tests.json](verification/acceptance-tests.json).
- All 16 changed JavaScript modules passed node --check. git diff --check passed.
- aof work validate 175 --json returned [] (zero findings). Loop-lane validation reported zero errors (33 nonblocking warnings). Final scoped doctor: healthy, zero errors and three nonblocking warnings (numbering-gap, rubric-join-unchecked, depends-edges-unchecked); no control-unresolved finding at either severity. Raw results are retained in acceptance-gates.json.
- F-175-01 is verified fixed. No blocker finding remains open. No human sign-off is required by the declared scenarios.

**Accept decision:** accept story 175 on its completed contracts and scoped verification. OUTCOME.md and RETROSPECTIVE.md record the delivered state and observed lesson. No whole-tree gate or native-model replay is claimed; rollout and historical-record recovery remain operator actions described above.

## Identity migration — 2026-10-30

Story 175 became 181 through aof work renumber 175 --to 181 (implemented and verified in story 182). Status remains done. Current headings, paths and source/test traceability labels now use 181; local finding ids such as F-175-01 remain stable. Captured acceptance reports, observation snapshots and recall records retain their original bytes and may name 175. All 13 original files were compared: only five current Markdown documents changed, exactly those named by the preview. The four loop-defect regressions passed again under their 181 labels. Full memory rebuild removed all item-175 records and indexed the five item-181 records, including 181/R1. The dated map is retained at wiki/work/.renumber-history.json.

Publication note: before committing, private workspace names in the saved gate report were replaced with neutral placeholders to satisfy the repository privacy hook. Findings and outcomes are unchanged. The migration hash comparison records the evidence before this publication redaction.
