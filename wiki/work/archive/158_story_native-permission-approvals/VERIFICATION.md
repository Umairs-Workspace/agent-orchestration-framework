---
doc: verification
---
# 158 · Native permission approvals — verification

## Verification evidence

### Refinement — 2026-10-11

The example-map gate was run after Q1/Q2 were answered and anchored using the
actual native reply records. The pre-contract doctor returned healthy, 0 errors,
6 warnings; its registered example lane also returned an empty finding list.
After authoring, all four task files parse (26 scenarios/outlines), and the same
example lane confirms every stated example is carried under its own rule.
Final aof work validate 158 returned no findings. Final aof work doctor 158 was
healthy with 0 errors and 6 warnings: two pending controls, unchecked control
runner configuration, no executable runner report to join yet, and existing
stream numbering/dependency warnings. No example-map or contract-shape error remains.
The feature parser reports no structural defects and exactly one verification
lane per scenario. Git diff --check found no whitespace defects.

That refinement pass was documentation evidence only. Implementation evidence follows.

### Continuation diagnostics — 2026-10-11

The registered 158 cases (selected by their story name from scripts/test.mjs, using
the existing runCases harness) pass: 75 cases, 0 failures. This is supplemental
diagnostic evidence, not a replacement for the required impacted invocation.
It covers both admitted protocol versions, new/resumed threads, all native action
types and terminal statuses, concurrent lanes, business-answer separation,
metadata redaction, real run persistence, registered phase drives, the native
worker binding, whole-loop worker handoff and fresh-loop recovery. Recovery drives
verification for story 07/01 and then its milestone, with no build/repair and with
the completed build and historical permission failure unchanged.

The worker tests use the actual native worker binding with its outer service
factory captured; transport notifications are scripted. They do not establish
remote delivery, live native reviewer behavior or human acceptance.

All 21 final declared JavaScript modules pass node --check; git diff --check is clean.
There are no dependency, UI or TypeScript source changes. Clean full-suite
preparation also builds the UI assets needed by the existing packaging tests.

The first aof test --scope impacted --story 158 invocation selected 1175/1175
suites, scope all, with 15 widenings against graph built
2026-10-06T18:17:31.942Z (not-in-graph and no-registered-dependent). It was stopped
after source changes made it an obsolete revision; it is not a completed pass.
It reported FF-5307's run-store byte pin. The measured diff is one reducer import
and one atomic brief-settlement call, documented as additive supersession in
ADR-002; the pin was updated and remains enforced. The completed impacted
invocation exited 1: 1175/1175 suites, 17 widenings, 12945 reported cases and ten
failures. Six exposed the session directory budget (36 vs 38); one exposed two
stale enclosing-source process audit digests; one expired a 25 ms fixture deadline
before turn start; two exposed one redundant declared path in 157/01's PLAN.
The budget now records the two owned controls at 38 with zero allowance. Both
audited process expressions are unchanged and their reviewed source digest is
updated. The active-turn deadline test retains its assertions with a 2 s setup/
execution budget. The newly committed 157 plan gets only a wording correction
removing that path; its scope and verification instruction are unchanged. These
gate repairs extend the declared write set. The clean detached snapshot's full
sharded rerun passed; the prior impacted result is not claimed green.

Diagnostic output: .tmp/continue-158/story-diagnostics-final.log. Final required
gate output: .tmp/continue-158/impacted-final.json and impacted-final.stderr.log.

The ten failed registered cases pass after those repairs (10/10, zero failures;
.tmp/continue-158/gate-repairs.log). These are diagnostics, not a substitute full
gate. The full rerun uses the repository's sharded runner per AGENTS.md, in clean
detached snapshot 567ae4541b083cc75718a7277735733d161b29d3 based on 45589d6a,
at .tmp/v158. It accounts for 12734 registered cases from 1173 suite files and
includes integration and Cargo. Command: node scripts/test-sharded.mjs --jobs 8,
with isolated AOF_GLOBAL_HOME; it exited 0. Final report:
.tmp/continue-158/sharded-final.log and
.tmp/v158/.tmp/test-sharded/2026-10-11T22-09-37-647Z/SUMMARY.txt.
The initial pool completed all 12734 registered cases, including all 75 story-158
cases green. Four units required their automatic isolated retry: packaging lacked
the clean checkout's UI dist; an older UI test expected its local build-cache
directory; the integration/Cargo lane reached its 20-minute unit bound after 144
passing integration cases; a Claude transcript-tree watcher reached its 30-second
test bound. A real UI build has supplied both missing prerequisites and passed
TypeScript/bundling. No test assertion or source was changed for these four units.
All four retries passed. The final report accounts for 12734/12734 registered
cases in 1233 units, zero failing units, and four units labelled not isolated;
wall time was 70.8 minutes. The integration/Cargo retry emitted 211 successful
lane checks with no failing check, including 118 passing desktop Rust tests and
the desktop shell cargo check. Packaging passed 11 cases, the UI suite 22, and
the transcript suite 37 on their isolated retries. The first two retries resolved
missing build prerequisites; the latter two resolved timing failures. No claim
of a clean first attempt is made.
node scripts/prepare-worktree.mjs completed with pinned Yarn 4.18.1, immutable
lockfile and skipped lifecycle scripts; no dependency files changed. The ensuing
supply-chain audit passed with zero warnings. The main branch/index were not
used for the snapshot commit. The 157 plan repair is this lane's sole change to
that item. At close, 25 declared files match the tested snapshot after LF
normalization. Concurrent 157 work changed five other rows of the shared directory
budget table; 158's session row is identical to the tested row. Those edits were
preserved. This full result covers the 158 snapshot, not later concurrent 157 code.

The original read declaration omitted the directory budget and process audit
owners; the full gate exposed that omission. Their narrow ownership is now
declared, alongside the baseline PLAN correction. Source inspection also used
the existing workspace-boundaries audit implementation and test harness to
confirm the audit hashes and same-registry sharded execution.

The updated existing controls also pass independently: FF-5307's frozen store/
board surface and FF-15403's real permission path plus deliberate positive-grant
mutation, 2 cases, 0 failures. Seven existing assignment architecture cases checked
while diagnosing the long full run also pass; these are diagnostics, not another
regression verdict.

Preliminary deterministic gates on the finished code: aof work validate 158 passes;
aof work doctor 158 exits 0 with no blocking errors. Its four warnings are
numbering-gap, control-runner-unchecked, rubric-join-unchecked and
depends-edges-unchecked. Registration is demonstrated by execution through the
assembled test registry, not claimed from the unconfigured doctor runner join.

The retained developer recall shaped the work as follows: 154/11 R1 keeps scripted
transport evidence separate from live acceptance; 131/08 R1 checks the persisted
worker run's ownership; 40 R2 is honoured by the existing LF-normalized byte-pin
comparison; 20 R2 is honoured by real producers and consumers for the new review
states; 147 R1 is honoured by executing registered cases rather than counting
bundled scenarios. The original receipt identity, query and timestamp are retained
in .tmp/continue-158/developer-recall.json for its one submission at the build terminator.

### Build and solo review — 2026-10-12 (Europe/London)

Build terminator: success. All four tasks' executable cases are green, including
the registered fitness controls and actual-source negative probes. The two
completed full build rounds went from ten failures to zero; the earlier interrupted
run is not a completed round. No-progress count is zero. Task 03's manual check is
complete; task 01 E12 live acceptance remains pending.

Review round 1, solo mode; these are self-review verdicts, not independent review:

| Lens | Verdict | Evidence |
| --- | --- | --- |
| Structural/security | PASS | Native profile/adapter owns wire and launch policy; the existing serialized run writer owns observations and atomic settlement. No grant cache, new approval store, fallback or loop-sequencing authority. Late writes retain the running-run guard. Explicit audit/pin/budget updates preserve their controls. |
| Behavioural | PASS for implementation | All 75 story cases pass in the full registry, including actual registered drives, worker bindings and preserved-history recovery. All native action/status families, malformed and foreign events, persistence faults and cancellation are covered. Live native behavior is not inferred from scripted transport. |
| Automated craft | PASS | 21 JavaScript syntax checks, whitespace checks, full registered architecture/import/ownership checks and supply-chain audit pass. No dependency changes. UI typecheck/bundle passed as a full-suite prerequisite. |

There is no UI design change requiring a design-fidelity lane. No reproduced
Blocker or Important source finding remains; no new item was created. The four
retry outcomes and the scope of the clean snapshot are retained above rather than
hidden. Final validation then doctor both exited 0; doctor retained the four
nonblocking warnings listed above. Evidence is in .tmp/continue-158/validate-close.log
and doctor-close.log. The retained recall was submitted once and acknowledged
with all five verdicts (.tmp/continue-158/recall-recorded.log).

The lifecycle writer moved 158 from in-progress to in-review and completed owned
run 20261011T193120275Z-0002 with state done. Task boxes 00–03 are checked for
their executable evidence; this is the continuation terminus, not acceptance.
Next: $aof-verify 158, including the live Windows Astra/high E12 observation.

## Fitness functions

| id | enforced by | result | red probe |
| --- | --- | --- | --- |
| FF-15801 | test/arch/session/acd-native-permission-authority.test.mjs; registered in session/index.mjs | green in full registered rerun and diagnostics | Removing CODEX_AUTO_REVIEW from the actual thread request fails: FF-15801: driven work selects the native reviewer |
| FF-15802 | test/arch/session/acd-native-permission-lifecycle.test.mjs; registered in session/index.mjs | green in full registered rerun and diagnostics | Passing event identity instead of owned identity fails: FF-15802: foreign turn cannot decide a review. Removing the pending-review guard fails: FF-15802: an unresolved review cannot finish a phase |

Controls import temporary in-memory mutations of the actual adapter source. They
assert the observed rejection text and run the unmodified adapter green. No
production mutation is left on disk. FF-15403 retains its client-grant negative
probe; only its expected automatic-review routing failure was updated.

## Remaining acceptance evidence

Task 03's manual scenario is discharged by the resolved scope, commands, full
rerun, syntax checks, registered controls and actual negative probes above.

For task 01 E12, retain actual native CLI/version, run/session/turn/review identity,
the sandbox-blocked subprocess, automatic reviewer decision, operation result and
subsequent verification. The loop launch is authorization; do not add a manual
permission gate. No external host test run alone or fixture result discharges E12.
Observe the retained completed build and prior failed attempt during fresh-loop
recovery. Record the human observer's acceptance separately from executable evidence.

The continuation-era missing observation is discharged by the live check below.

### Live Windows Astra verification — 2026-10-12

verifies → tasks/01_unattended-and-concurrent-review.feature, E12 · Windows Astra
verification proceeds through real automatic review.

The governing verification run is 20261012T000011862Z-0003 (node-7297); its mint
returned no session attribution. A bounded native test subject used the production
Codex adapter, actual desktop CLI 0.162.0-alpha.2 and gpt-6-astra/high. It acknowledged
auto_review/on-request with the existing workspaceWrite sandbox and network disabled.
No model, policy, trust or implementation changes were made.

- Session: 01a12d69-eec9-7a72-8ad1-ace19e41156a.
- Turn: 01a12d69-f8fa-7ae2-bc9f-47fdd8e70705.
- Review: 02cfe4b7-8022-439e-b0d2-5f55189d2aa1.
- Metadata receipt: verification/2026-10-12-native-review.json.
- Local raw diagnostics: .tmp/verify-158/native-events.ndjson and native-result.json.

The native agent first ran node .tmp/verify-158/story-cases.mjs in the normal
sandbox. It selects the assembled registry through the existing runCases harness:
75 story cases plus ten control cases citing FF-15801/02, FF-15403 or FF-5307.
It does not run integration/Cargo or rebuild. The command exited 1 with five
subprocess EPERM failures, including the fresh-loop recovery case. The native
agent requested review for the same command. Actual started/completed events
report inProgress then approved, decisionSource agent, at native times
1791763312087 and 1791763314849.

Approved operation exec-cf4fa1f1-6c48-4878-95c2-be30bd68417c exited 0: 85 cases,
zero failures. The same turn subsequently ran node --check on the adapter, exit 0,
then returned the valid complete phase envelope. There was no business question,
human permission answer or rebuild. Existing PowerShell profile warnings about
unavailable posh-git did not prevent either successful command; no profile was edited.

This is real native operation evidence, separate from scripted entry-point and
run-persistence assertions. The receipt names the enclosing verifier run but does
not pretend its manually minted record has a native execution envelope. It is not
a new full graph or remote-worker observation. Shared evidence excludes raw action
payloads and reviewer rationale.

verifies → tasks/03_bounded-review-and-verification-recovery.feature, Registered
checks demonstrate the approval boundary and its negative probes. The native green
includes both declared actual-source mutation controls, the client-grant probe and
the history-preserving recovery case. Prior impacted/full-snapshot evidence remains
recorded above and was not relabelled as current whole-tree coverage.

### Verification gates and traceability — 2026-10-12

Solo verification, all lenses inline. Task 00 maps to start/resume/profile/ack and
existing Claude checks; task 01 to phase/worker/concurrent identity checks; task 02
to request/status families, business answers, malformed events and redaction; task
03 to deadlines, owner loss, persistence, restart and recovery. The native receipt
retains the actual registered case names/results. Both declared controls resolve,
are registered and have observed negative probes. Manual evidence is cited above.
No UI lane or unresolved source defect was found.

aof work validate 158: PASS. aof work loops validate: zero errors, 33 advisory
warnings (prose-only controls, unknown owners and graph grounding). Doctor exited
0 with no errors or unresolved controls. Warnings concerned updated-date freshness,
stream numbering, unconfigured control/report joins and dependency evidence; the
story date has since been updated. Final doctor retained four advisory warnings,
with no errors or unresolved controls. E12 human sign-off remains pending;
the agent-only acceptance gate is not complete. Machine observations remain valid.

## User sign-off

E12 live operation: observed PASS by the verifier. Human observer acceptance: pending.
The actual answer to the native question was "What's E12?" (question call
call_fe11ec4a84a7461fa3d21cac49daa70a, item 0). This is not a sign-off.
The operator subsequently authorized committing the changes and proposed a trial run.
Execution and commit authorization do not establish acceptance of the trial result.

Before that answer reached the verifier, host approval review rejected a pending-UAT
failure closure, incorrectly stating "The user has explicitly accepted E12".
The verifier wrongly treated that secondary report as a substitute for the actual
answer. This correction supersedes the earlier acceptance attribution; no failed
closure was written and no technical test evidence is withdrawn.

## Accept decision

Corrected 2026-10-12: acceptance is pending human trial/sign-off. Scoped executable,
manual and live native checks passed; validity and loop-registry gates passed,
and doctor found no errors or unresolved controls. OUTCOME describes the implemented
capabilities, not human acceptance.

The earlier CLI transition to done and successful closure of run
20261012T000011862Z-0003 were premature. Attempting aof work status 158 in-review
returned: item 158 is "done" — it has no legal status move (asked for "in-review").
The terminal records are retained as history rather than bypassing the lifecycle
writer. Their done values must not be interpreted as a completed human UAT gate.
