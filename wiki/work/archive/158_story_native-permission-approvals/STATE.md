# 158 · Implementation state

2026-10-12 correction: implementation, solo review and native verification passed;
human acceptance is pending the operator's trial. The actual E12 answer was
"What's E12?", not sign-off. A mistaken host report led the verifier to close the
item and run 20261012T000011862Z-0003 prematurely. The CLI refuses reopening a
terminal done item; VERIFICATION records this lifecycle error without rewriting
run history. Build run 20261011T193120275Z-0002 remains validly done.

## Decisions and answers

The operator answered both native discovery questions at 2026-10-11T18:54:57.970Z.
Q1 delegates permission approval to the assistant, as Claude does. Q2 makes starting
the loop/graph the authorization, rather than a later permission prompt. Exact
answers are in EXAMPLES.md and anchored to the original request_user_input_async
tool ids through the run-store answer writer on discovery run
20261011T183208115Z-0000. They were extracted from this session's actual native
user reply, not invented or defaulted. No business question remains open.

Native auto_review was chosen as the technical mechanism after inspecting both
admitted protocol versions. It handles approval within the native session. There
is no new operator approval surface, unconditional client grant, or AOF reviewer.
Both ADRs were settled before the four task features were authored.

## Contract and ownership

Four tasks cover launch authorization, unattended/concurrent execution, attributable
decisions, and bounded recovery. They contain 26 scenarios/outlines across executable,
agent-run manual and human-observed live UAT lanes. All 12 map examples have headline
scenarios under their owning rules. PLAN.md is the enabled advisory build brief.
The inline security lens is recorded in SECURITY.md; there is no UI design scope.

Ownership was derived again from subject files, citations and the existing graph,
then narrowed to the native adapter/profile/runtime/event seams, drive/worker wiring,
recovery diagnostic and their real test owners. The 2026-10-06T18:17:31.942Z graph
does not carry several newer files: the proposal reports unknown coupling, not a
complete or fresh graph. Source reads ground those seams. The proposal remains in
.tmp/refine-158/contract-proposal-final.json outside work folders.

The derivation's conventional test names were replaced with the actual package
.suite.mjs owners, existing loop/worker cases and registered arch-test paths.
Unrelated clone credentials, desktop status, pinning and broad graph consumers were
subtracted. Native permission observation reuses the run writer; there is no new
approval store or configuration schema change. No dependency work is authorized.

## Checks and remaining evidence

The pre-contract aof work doctor returned healthy with 0 errors and 6 warnings.
The focused registered example doctor also returned no findings before authoring.
After authoring, the same lane confirms all stated examples trace to their own rules
and native answer receipts. All four features parse and stay below 150 lines each.
Final whole-story validation/doctor results are recorded in VERIFICATION.md.

Controls FF-15801 and FF-15802 are implemented, registered and red-probed. The
75 registered story diagnostics pass, as do FF-15403 and the updated FF-5307
frozen-surface assertion. The required impacted invocation widened to all suites
and failed ten cases; all ten now pass after narrow gate repairs. A clean detached
snapshot passed the full registered sharded suite, integration and Cargo:
12734/12734 registered cases, all 75 story cases, zero failing units. Four units
passed their isolated retries; VERIFICATION retains the prerequisite and timing
failures. No live model call or
native permission acceptance has been performed in continuation.

The refinement run is 20261011T185612995Z-0001, attributed through the live
store and closed at hand-back. The earlier discovery run remains as history. Changes belonging to item 157
were left intact except a one-line PLAN wording correction required by the
existing declared-path control after those files were committed. Continuation
reached its review gate; verification has now observed live native approval.

## Continuation progress

Native thread start/resume now selects and checks automatic review before tools. The profile normalizes metadata-only review events; the existing runtime callback and run writer retain pending, terminal and interrupted observations. Native grants remain owned by Codex. Unexpected client approval RPCs receive only a validated no-grant response and an automatic-review routing failure. Historical permission failure guidance now names fresh launch without --resume.

Added registered controls and scripted adapter, persistence, phase, worker-binding and recovery cases. The declared write set now includes runs.mjs for atomic owner-loss settlement and the existing runtime-loop fixture for the fresh-verification case; these repair missing ownership for already-locked task 03 outcomes. No production loop sequencing or Claude launch change was necessary.

All 21 final declared JavaScript modules pass node --check. The first required impacted
invocation was stopped when later changes made its revision obsolete; it exposed
the existing FF-5307 run-store byte pin. ADR-002 documents the two-site change and
the control remains enforced with the measured new digest. The completed impacted
run exposed the session directory budget, enclosing process audit digests, a 25 ms
setup deadline in an existing test, and a declared-path repetition in 157/01's PLAN.
The repairs preserve the controls and behaviour, and all ten affected registered
cases pass. The clean snapshot full rerun exited 0. Validation passed;
doctor returned no blocking errors and four
warnings (stream numbering/dependencies and unconfigured control/report joins).
Build terminator is success (ten failures to zero across two completed full
rounds; no-progress count zero). Solo structural/security, behavioural and
automated craft review passed in round one. These are self-review verdicts,
not independent review. The actual-source negative probes pass; no unresolved
Blocker or Important source finding and no new item remains from this close.
At continuation close, live Windows Astra UAT remained for $aof-verify 158;
the verification progress below records its subsequent observation.

The retained developer recall was submitted once as
773f3482-f4cf-4775-bc17-cce8361b8b73, with five explicit honoured verdicts.
The tested snapshot is 567ae4541b083cc75718a7277735733d161b29d3; later concurrent
157 changes are outside that full-test claim. Its five other budget-table row
edits are preserved, and the tested 158 session row is unchanged.

## Verification progress — 2026-10-12

Windows Codex 0.162.0-alpha.2 acknowledged auto_review/on-request and retained the
workspaceWrite sandbox plus Astra/high. Its first scoped Node command reproduced
five subprocess EPERM failures. Native review approved the same-command retry;
85 registered checks passed, followed by syntax verification and a complete phase
result in the same session/turn. No permission question or rebuild occurred.
The host's report of E12 human acceptance was contradicted by the actual user answer.
Human acceptance remains pending. VERIFICATION records the correction, native
identities and the limits of this live adapter observation.

Scoped validate and loop-registry checks passed with warnings retained. Doctor had
no errors or unresolved controls. Retrospective R1 records the build's omitted
control/audit ownership; CLI observability was refreshed. Full regression evidence
remains tied to the earlier snapshot, not concurrent 157 changes. This verification
pass changed no implementation or item 157 work.
