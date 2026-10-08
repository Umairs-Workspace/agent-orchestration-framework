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

## Verification evidence — 2026-10-08

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

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| D-01 | Real Codex governed refine stopped at a declined native permission; equivalent trusted Claude lifecycle and worker recovery prerequisites are not established. | prerequisite-gap | Blocker | Keep lifecycle and recovery acceptance pending; obtain approved existing native execution/worker prerequisites, then rerun the declared fixtures. No permission bypass or invented bug scenario for an environmental stop. | 154/11 live acceptance; 154/02 remaining profile proof | open |
| D-02 | Supplied Fleet origin cannot serve the configuration API; intended execution form is absent at every rendered width. | prerequisite-gap | Blocker | Obtain an already-running configuration editor URL and rerun responsive, keyboard and state checks. | 154/10 manual verification | open |
| D-03 | Concurrent story 155 writes prevent the clean whole-tree gate; registry loading also encountered a missing export during those writes. | verification-environment | Blocker | Wait for the other writer's completed, committed work; run the recorded clean gate against the intended frozen revision. | milestone 154 regression gate | open |

## Accept decision

**NOT ACCEPTED.** Native protocol evidence advanced, but the full lifecycle, recovery, repeated
prompt evaluation, visual/keyboard lane and recorded clean whole-tree gate are incomplete.
No story was marked done and no milestone story checkbox was ticked. Milestone remains
in-progress, its twelve stories remain in-review, and no acceptance OUTCOME or retrospective
was fabricated. No genuine human UAT scenarios are declared in this milestone.
