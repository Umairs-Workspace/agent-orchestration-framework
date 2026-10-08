---
doc: verification
updated: 2026-10-08
---
# 154 · Verification

## Fitness functions

Automated readiness evidence recorded on 2026-10-08. All six controls are implemented and
registered. Eight owning cases passed, including their negative controls. The expected failures
below were observed from planted source/action/plan fixtures; production files were not edited.
This is control evidence, not live runtime or milestone acceptance.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-15401 | `test/arch/session/acd-runtime-session-boundary.test.mjs` | pass (automated) | Planted `client.send("turn/start", brief)` and `claudeProjectsDir(cwd)` in sequencing source fixtures. Both failed: `FF-15401: loop sequencing must not own vendor protocol or transcript policy`. |
| FF-15402 | `test/arch/session/acd-runtime-choice-owner.test.mjs` | pass (automated) | Planted `resolveExecution` in the loop engine and `resolveExecutionResume` in core model source fixtures. Both failed: `FF-15402: execution choices and resume policy have one owner`. |
| FF-15403 | `test/arch/session/acd-codex-permission-boundary.test.mjs` | pass (automated) | Loaded an in-memory copy of the actual adapter with permission reply changed to `accept`. Scripted transport failed: `FF-15403: native permissions are declined, never business questions`, actual accept versus expected decline. No native process or approval was launched. |
| FF-15404 | `test/arch/store/acd-codex-output-ownership.test.mjs` | pass (automated) | Removed the preflight baseline from create/update/delete action fixtures. Each reported `Codex mutation lacks a recorded preflight baseline: AGENTS.md`. The real collision fixture also refused `codex-output-conflict` on unowned review.toml despite force, preserving operator files. |
| FF-15405 | `test/arch/command/acd-bundle-runtime-variants.test.mjs` | pass (automated) | Removed `.agents/skills/aof-refine/procedure.md` from the real rendered plan. Observed `skill:aof-refine (codex) at .agents/skills/aof-refine/SKILL.md: missing declared procedure .agents/skills/aof-refine/procedure.md`. Registered unresolved-role and Claude-target negative cases also passed. |
| FF-15406 | `test/arch/session/acd-runtime-observation-facts.test.mjs` | pass (automated) | Loaded actual reducer source in memory with `costUsd: null` changed to zero. Failed: `FF-15406: missing native cost is unavailable`, `0 !== null`. Missing native turn identity separately refused attributable metadata. |

Command: `node .tmp/154-readiness-red-probes.mjs`; result: eight registered cases passed,
all six controls exercised. Captured output: `.tmp/154-readiness-red-probes.json`.
The helper observes the existing expected throws/rejections with their original matchers intact
and reports the existing ownership/reference detectors' actual findings. It uses an isolated
temporary AOF home, scripted transports and no paid assistant execution.
At readiness close, code matched successful full-gate snapshot `7beccabff552c266d7dc6e6071427389056151d8`, retained
by tag `verification/154-11-build-review`: 12,466/12,466 registered cases, zero failures/flakes.
Raw gate evidence is retained at `.tmp/154-evidence/test-sharded/2026-10-08T11-43-25-992Z/`.

## Earlier verification attempt — 2026-10-08, 14:02 UTC

This session used solo, inline verification lenses. No independent root-session review is claimed.
Evidence is retained under `verification/2026-10-08/`; native probes used existing authorized
CLI access and separate disposable AOF homes. Authentication and trust settings were not changed.
Source HEAD was `c08a75471137d81c9239f581d69d26c81cf048bc`; concurrent story 155 edits mean these
observations do not constitute a frozen-source lifecycle or a clean acceptance gate.

### Real Codex protocol

Procedure: `node scripts/verify-runtime-loop.mjs --runtime codex --prepare-live --json`, followed
by actual `createCodexAppServerAdapter` operations against the installed `codex.exe`. Preparation
alone was not counted as execution. The observation wrapper delegated to real `spawn`; no scripted
transport, version response, model catalogue, usage event or model output was substituted.

- Installed CLI: 0.160.0; admitted profile: `codex-app-server-v1`, version 1. Real initialize and
  model/list succeeded; the advertised default was `gpt-6.1-sol`. Protocol probes selected that
  exact model with low continue effort; the governed refine retained configured high effort.
- Create completed on native thread `01a11bd7-2565-7922-9742-863d8aa0535b`; a new server resumed
  the same thread and completed another turn. Native turn ids and usage counters are in
  `native-probes.json`. Observed final items were `agentMessage` with `phase: final_answer`,
  followed by `turn/completed` with status `completed`; the closed result schema parsed successfully.
- A deliberately unanswered synthetic colour choice returned the structured needs-input result
  with token, text, choices and native thread identity. A separate availability probe invited the
  native question tool if available; no native server question request was observed and the
  structured fallback completed. Native question-tool support remains **unproven**.
- An abort immediately after turn start returned `failed / abort`. All four captured probe server
  PIDs were absent afterward. The question and abort probes reported `interrupt_failed` cleanup
  warnings; these are retained rather than presented as a clean interrupt acknowledgement. This
  proves owned-process release for this probe, not interruption during a tool or mesh recovery.
- Native token counters were observed for completed turns. Codex monetary cost is unavailable,
  not zero. These short protocol turns establish no workflow correctness or prompt improvement.

verifies → `154/02/tasks/02_live-profile-proof.feature`, real candidate profile scenario:
create/resume, structured fallback, usage and owned-process release observed; native question
capability and clean interrupt acknowledgement remain limited as above. Story remains unaccepted.

### Governed lifecycle and repeated prompt workload

Procedure: in the retained Codex fixture, with its isolated `AOF_GLOBAL_HOME`, run
`node <source-cli> work drive refine 07/01 --runtime codex --json`. The real driven directive was
`$aof-refine 07/01 --orchestrated`. Native thread `01a11bd9-5165-7113-a407-60147f42a587` started,
then returned **failed / operator_action_required** when the adapter declined a native permission
request. Build, independent review and verify were not treated as completed or continued past
that refusal. The failure and resolved settings are retained in `native-probes.json`.

Prepared the separate comparable Claude fixture. Installed Claude Code 2.1.292 completed a
tools-disabled native connectivity prompt using its existing access: session
`0cc61e10-62c9-4fc7-86e4-9eb99ecac8a0`, default native model `claude-opus-5-5`. This was **not**
the AOF PTY lifecycle. Its reported usage included 122,957 cache-creation input tokens and four
output tokens; the CLI's $0.983744 value is list-price accounting, not evidence of a charged bill.
The governed Claude driver prewrites folder trust through `ensureWorktreeTrusted`; that path
was not launched against a fresh fixture because this verification does not grant host trust.

The frozen prompt workload remains an authored protocol, with no accepted optimization. Full
baseline/candidate repetitions were not run past the lifecycle permission prerequisite. No
before/after speed, cost or correctness benefit is inferred from these connectivity samples.
No authorized live worker assignment was prepared for a mesh reconnect test.

verifies → `154/11/tasks/01_live-lifecycle-acceptance.feature`, missing prerequisites scenario:
actual Codex refusal recorded; full Codex/Claude lifecycle, independent review, the five recovery
checkpoints and final fixture acceptance remain **unverified**.

verifies → `154/11/tasks/02_prompt-behavior-evaluation.feature`: pending, no three-repetition
samples or candidate comparison; historical non-executable Codex assets supply no fabricated baseline.

### Design and accessibility

The operator supplied `http://127.0.0.1:4181/fleet?scope=global`. Used its origin and the binding
DESIGN route `/config`. Globbed the cache and selected Chromium revision 1243 at
`LOCALAPPDATA/ms-playwright/chromium-1243/chrome-win64/chrome.exe`; a bounded
headless blank-document probe established executability before rendering.

Procedure: one direct headless invocation per width 390, 768 and 1280, height 1200, with
`--disable-gpu --hide-scrollbars --window-size=W,1200 --virtual-time-budget=5000` and an absolute
forward-slash screenshot path, each bounded to 30 seconds. All exited zero and wrote nonempty
images. Retained `config-390.png`, `config-768.png`, `config-1280.png` and `renders.json`.
User-directory prefixes are redacted in the committed record; the original absolute invocation
paths remain in the local ignored `.tmp/154-verify-design/report.json`.

Inline designer lens: **INCONCLUSIVE** for the intended execution form. Every image shows
“Could not load the configuration” and “This origin does not serve the configuration API”.
The default assistant, phase controls, role overrides and preview are absent. At 390 the error
text is clipped; this is an observation of the fallback surface, not a verdict on the unseen form.
The exposed browser connector returned no available browser and could not create an in-app tab.
Keyboard interaction, visible focus, invalid/save states and browser accessibility remain unverified.
A running configuration-editor URL was requested; no app was started by this skill.

verifies → `154/10/tasks/01_accessible-runtime-form.feature`, manual responsive scenario:
**INCONCLUSIVE**, missing configuration API at the supplied origin.

### Automated and acceptance gates

The earlier readiness full suite and six actual fitness red probes remain historical evidence
for their recorded snapshot; they are not relabelled as this verify run's acceptance gate.
Attempted current registered-case loading through `.tmp/154-verify-targeted.mjs`. It stopped
before executing any case: `test/loop/loop-bounds.test.mjs` imported
`LOOP_AGENT_MODE_DEFAULTS`, which the concurrently edited contracts module no longer exported.
This is a transient shared-tree observation, not an attributed milestone 154 regression.

Ran `node packages/core/bin/aof.mjs work regression-gate 154 --jobs 8 --json`. It refused
`regression-gate-dirty-tree`, naming the concurrent source changes and active run records.
`regression-refusal.json` retains the actual command result. No suite ran and no REGRESSION.md
row or override was manufactured. Other-session changes were neither committed nor stashed.

Scoped `work validate 154 --json` returned `[]`; subsequent `work doctor 154 --json` reported
healthy, zero errors and 15 metadata warnings. There were no `control-unresolved` findings at
either severity. These structural checks do not discharge the manual or regression gates.

## Autonomous reverification — 2026-10-08, 14:41 UTC

Run `20261008T144112971Z-0004` used solo, inline roles. The operator's instruction to resolve
prerequisites autonomously authorized starting the local configuration editor. No root subagents
were launched. This attempt supersedes the earlier missing-URL conclusion above.

### Frozen source and actual regression gate

Created a clean detached checkout of `53b99b1cd81c1896fa7bfed251fb0ae9f6f27706`, with its own
dependencies and an isolated `AOF_GLOBAL_HOME`. The active verification phase required dependency
preparation: the checked-in worktree helper used pinned Yarn, immutable resolution and skipped
lifecycle builds; dependency versions and lockfiles were unchanged. Supply-chain audit passed with
zero warnings. UI production build passed. Neither the other session's story 155 edits nor its index
were stashed, committed or included in this snapshot.

Ran the actual accept-door command in that checkout:
`node packages/core/bin/aof.mjs work regression-gate 154 --jobs 8 --json`.
All **12,466 registered cases executed** in 1,210 units, with **one persistently failing case** and
zero load flakes; integration and cargo lanes passed. Elapsed time was **23.9 minutes**, exceeding
the gate's 15-minute budget. The recorded result is **red**, not an overridden or inferred pass.
The command-authored `REGRESSION.md` row is copied unchanged from the detached checkout.

The failure is `arch/71 FF-7106`: the committed, open story **155** declares bundle members without
all their tracked generated siblings. The original and isolated retry name the same 22 omissions,
including Codex skill entries, `agents/openai.yaml` and the shared workflow contract. This is a
planning write-set failure in the frozen revision, not evidence that the new runtime transport failed.
The other writer's current changes require their own completed, committed gate; this run cannot
certify those bytes.

Evidence: `verification/2026-10-08-reverify/{regression.json,SUMMARY.txt,u0802.log,retry-800.log,u0005.log}`.
All raw sharded logs are retained locally at `.tmp/154-reverify-evidence/test-sharded/`.
Scoped validate returned `[]`; doctor was healthy, zero errors and 15 warnings, with no
`control-unresolved` at either severity. The registered fitness cases ran in the full suite;
the six observed negative probes remain recorded in the fitness register above.

### Actual configuration UI, design and keyboard checks

Started the frozen AOF CLI's `work ui` server at `http://127.0.0.1:4180/config`, targeting a separate
disposable UI project and AOF home. The supplied Fleet server on port 4181 was left untouched.
The UI fixture contains the generated context asset required for valid configuration saves; browser
edits do not touch either live assistant fixture or the operator's project settings.

The cached Chromium 1243 passed the bounded executable preflight. Three direct renderer invocations
at 390 / 768 / 1280 exited zero and wrote nonempty images. These entry-route images prove shell
rendering; the browser harness then selected **Settings** and captured the actual execution form.
Used the existing Python Playwright installation and cached browser; added no browser dependency.

**QA: 18/18 checks passed.** Actual DOM and keyboard interaction proved visible focus, labelled
controls, retained edits and associated field errors for invalid Claude effort, preservation of the
other assistant's draft, a successful real API save, inherited defaults and explanatory global scope.
Browser-transport 503 injections proved retained edits after save failure and load-error/retry
behavior; delayed GET proved the loading state has no stale execution-save control. These injected
faults exercise the real component, not a mocked form or claimed live server outage. Long saved
model identifiers wrap in the resolved preview and document width stays within all three viewports.
An unadvertised Codex model is explicitly shown as unproven, not claimed launchable.

**Inline designer verdict: CONFORMS to the binding DESIGN checklist for the execution form.**
Region review: existing shell/navigation preserved; project heading and assistant select lead;
phase model/effort rows stack on mobile and align on desktop; role overrides expand; resolved
value/source cards follow; save, error and result treatments remain visible and use existing tokens.
Inherited, populated, loading, invalid, failed, saved and global states were rendered and exercised.
Viewport screenshots avoid the fixed-header overlap present in full-page/element capture artifacts.
These are reviewed baseline evidence; no pre-existing pixel baseline comparison or new
`toHaveScreenshot` test is claimed.

Evidence: `verification/2026-10-08-reverify/ui/` contains both browser reports and rendered states;
`entry-renders.json` records direct renderer preflight/results. User-directory prefixes in textual
evidence are redacted; original commands remain in ignored local logs.

verifies → `154/10/tasks/01_accessible-runtime-form.feature`: responsive, keyboard and state checks
pass. D-02 is discharged. This resolves that lane without accepting the whole milestone.

### Real native execution and diagnosed prerequisite

Prepared separate Codex and Claude projects using the frozen `scripts/verify-runtime-loop.mjs
--prepare-live` path. Preparation is not counted as assistant execution.

Actual Codex 0.160.0 initialized, selected advertised `gpt-6.1-sol` at high effort and started thread
`01a11bfa-9756-7a00-acf7-26010353e383`. Its native policy was `on-request` / `readOnly` with network
disabled. Governed refine stopped at `operator_action_required` when the adapter correctly declined
the native shell permission request. The model-selected Microsoft Store PowerShell could not start.

A separate **native, model-free read-only** `command/exec` diagnostic established the distinction:
Node and system Windows PowerShell could read the fixture, while Store PowerShell returned
`CreateProcessAsUserW failed: 5 (Access is denied.)`. Retried the real adapter with a process-local
PATH excluding WindowsApps shell candidates, leaving native sandbox and approval policy unchanged.
Thread `01a11c0d-0bb7-7731-849b-e183cb319513` then read the skill through system PowerShell, but stopped
at the required `work run-start` write because native policy remained **read-only**. No native
approval was granted, no sandbox was weakened, and no host security/authentication setting was edited.
This isolates shell discovery from the remaining write-permission prerequisite.

Evidence: `codex-default.json`, `native-shell-preflight.json` and `codex-system-shell.json` in the
reverification evidence folder. Token usage is actual native usage; monetary cost remains unavailable.
This is additional refusal/diagnostic proof, not a successful Codex workflow or prompt optimization.

The real default-Claude AOF PTY driver completed refine, then the foreground `work loop 07 --level L2`
completed continue and story verify in distinct native sessions. The actual module changed from
`answer: 0` to `answer: 42`; its real two-case runner passed and story 07/01 was accepted with outcome
and retrospective records. Milestone verify refused the dirty fixture regression gate and persisted
its question rather than accepting without evidence. The loop acknowledged an AOF drain request,
halted on `operator-interrupt`, and preserved that pending question. A local fixture-operator answer
authorized a separate fixture branch/commit and the loop was resumed; final results are recorded in
`claude-live.json`. The same milestone session `c2e7060d-87a7-4039-bb59-704c09a56ea3` resumed,
committed fixture branch `verification/154-claude-live`, ran a clean green gate at
`48f2d01d898d2df049bafd8f10befc6e3b6af2a7`, and accepted fixture milestone 07. The foreground
loop exited zero with `Accepted milestone 07` / `07 — loop done`; all four actual phase runs settled
done. This is a synthetic fixture decision, not genuine human UAT.
Default Claude folder trust was established by the ordinary AOF driver; earlier non-launch statements
above apply only to the earlier attempt. ConPTY cleanup emitted `AttachConsole failed` diagnostics;
they are retained as a limitation rather than described as flawless process cleanup.

verifies → `154/11/tasks/01_live-lifecycle-acceptance.feature`: default-Claude build, story and
milestone acceptance, same-session question resume and drain behavior observed. Full Codex lifecycle, independent role review,
all five Codex recovery checkpoints and worker reconnect remain unverified. The repeated frozen
baseline/candidate workload in `154/11/tasks/02_prompt-behavior-evaluation.feature` remains pending;
no speed, cost, correctness or template-optimization benefit is claimed from partial samples.

The required `aof test --scope impacted --story 154/06` resolved to the entire unsharded suite
(no graph), observed as child `scripts/test.mjs` without selection arguments. It was cancelled
after source fixes superseded that process, to replace duplicate whole-tree execution with the
required clean sharded regression gate. No impacted or cancelled full run is reported green.

### Native lifecycle and recovery after verification fixes

`codex-live.json` records actual Codex continue, three native reviewer identities/results, story
verify and milestone-loop completion. The isolated fixture reached `done` on 2026-10-08. The
operator committed the fixture and executed its real clean gate at `8e73e1715af94a13ba37e5c46ec69f7a4f1df76d`;
Codex consumed that recorded green row. Its native Git pipe restriction was not bypassed or granted.
The earlier direct-adapter refine and the separately exercised native refine driver remain distinguished.

`codex-question-recovery.json` records a genuinely unresolved fixture choice, a durable parked ask,
closure of the first process, a new process reading that pending ask, and one acknowledged answer
on the same native thread. The result used the structured question fallback. Its completed-turn
interrupt warning is retained; the owned server processes closed. Warm-fix, operator-stop, worker
reconnect and the frozen repeated prompt workload still require their own results.

The clean gate at `3dec8d1e` executed **12,491/12,491 registered cases** in 1,213 units:
20.6 minutes, two persistent failure units and seven cases that passed when rerun alone.
The two persistent failures were the bounded capture module platform-import declaration and three
stale source hashes in the runtime audit. Both are repaired; their exact units now pass 24/24 cases.
The command-generated red row is retained in `REGRESSION.md`; the corrected commit needs a new gate.

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| D-01 | Native Codex defaults the fixture to read-only. Process-local shell selection resolves the Store PowerShell access error, then the required AOF run-record write is refused. Full Codex lifecycle/recovery and repeated prompt workload remain unverified. | prerequisite-gap | Blocker | The approved fixture policy now supports actual native build, independent review and acceptance; question/restart recovery passes. Finish warm-fix, stop, worker reconnect and repeated workload proof. Preserve permission refusal. | 154/11 live acceptance; 154/02 remaining profile proof | open |
| D-02 | Fleet origin lacks the config API; the autonomous rerun started the real isolated AOF editor and passed 18 browser checks plus binding-checklist design review at three widths. | prerequisite-gap | Blocker | Responsive, keyboard and state evidence is now retained; no further URL input needed. | 154/10 manual verification | closed |
| D-03 | The previous clean gate failed FF-7106 on generated siblings omitted from story 155's declarations. Elapsed time was 23.9 minutes; the 15-minute budget is advisory and did not cause the red result. | regression-gap | Blocker | Declaration and agent-mode changes are committed at a2846fce; 405 focused cases, 35 native-asset cases and 7 bundle checks pass. The obsolete a2846fce rerun was cancelled after native fixes changed the source; it is not evidence of a green gate. A final corrected snapshot still requires a recorded clean gate. | 155 declared write set; milestone 154 regression gate | open |
| D-04 | Actual Codex continue thread 01a11cb6-4f9d-7c41-8445-b940552c24fb invoked run-start and received duplicate-run because the native phase driver omitted its run environment. | bug | Blocker | Lend the driver-owned run identity to native tool processes. Two ownership regression cases plus all 46 phase/question cases pass; mutation probe fails without the fix. Live confirmation now returns driven:true on the same run; the later test-launch refusal is D-05. Evidence: verification/2026-10-08-reverify/native-run-ownership.json. | 154/06 task00 | closed |

| D-05 | The actual Codex sandbox allows fixture execution and file writes but refuses Node output pipes with EPERM. The required AOF test command cannot start its child. Print-only probes confirm inherited output and file-backed capture work; ordinary and overlapped pipes fail. | prerequisite-gap | Blocker | A synchronous Windows EPERM now retries the same executable with temporary file-backed capture when stdin has no cancel channel. All 45 affected cases pass, including output, deadline, abort and cleanup; the actual sandboxed AOF test command exits zero. No policy changed. Evidence: verification/2026-10-08-reverify/native-file-capture.json. | 154/11 native acceptance; bounded test execution | closed |

| D-06 | The next actual native continue phase ran its test gate, then halted with protocol_queue_limit during validation. The adapter queues every notification, including events it never consumes, behind durable observation writes. | bug | Blocker | Filtering now drops ignorable notifications before queue admission. The new 512-notification case fails without the fix; all 81 protocol/loop cases pass with it. Scoped validate is empty and doctor has zero errors. Actual native continue now completes with three independent reviewer threads; story and fixture milestone acceptance followed. | 154/02 protocol transport | closed |

| D-07 | Clean full verification found node:path absent from bounded-process platform imports and stale source digests for unchanged process calls in config-inspect and codex-app-server. | declaration-drift | Blocker | Declare the capture module platform API and refresh only source hashes after confirming all three audited call expressions are unchanged. Exact failing units pass 24/24; the final clean gate is still required. | 154/11 regression declaration maintenance | closed |

## Accept decision

**NOT ACCEPTED after autonomous reverification.** The visual/keyboard lane now passes, default-Claude
workflow evidence advanced, and the clean whole-tree gate actually ran. That gate is red; native
Codex full recovery and repeated prompt evaluation remain incomplete. A fixture-only workspace-write
launch policy was explicitly approved and real Codex refine completed; native build exposed D-04.
No story was marked done and no milestone story checkbox was ticked. Milestone remains
in-progress, its twelve stories remain in-review, and no acceptance OUTCOME or retrospective
was fabricated. No genuine human UAT scenarios are declared in this milestone.
