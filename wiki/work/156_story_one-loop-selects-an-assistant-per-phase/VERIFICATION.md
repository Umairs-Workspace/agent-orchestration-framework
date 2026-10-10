---
doc: verification
---
# 156 verification — 2026-10-09

Implementation is ready for review. This is not live Astra/Sonnet acceptance.
Work and review were performed inline in solo mode. No subagents, dependencies,
standing project runtime settings, or persistent branches/worktrees were added.

## Retained-branch reopen ordering — 2026-10-10

Resume at 12:40 UTC still failed on `.agents/skills/aof-add-chore/SKILL.md`.
The retained `aof/mesh/153-01` branch remained at `c58718d4` with no worktree.
The earlier fresh-HEAD probe did not cover this state: materialization received
the execution envelope and prepared native assets inside the lower mesh door,
before dispatch could advance the retained branch to the corrected primary.

Dispatch now owns native preparation once, after its optional branch advancement,
for recreated lanes as it already did for reused lanes. Mesh assignment/session
callers keep their existing preparation. The declared dependency preparation is
unchanged; no asset ownership or approval check is relaxed.

Two regression cases use real Git and assembled application services to retain
an older branch with checkout-mismatched hashes, commit corrected assets in the
primary, then recreate and advance the lane. Both failed before the fix and pass
afterward. The second retains a divergent worker commit and proves it survives.
The complete ownership/worker suite passes 60 cases, dispatch passes 5, and mesh
worktree preparation passes 5 (70 total).

A diagnostic also reopened the actual 153/01 branch using its persisted mixed
execution plan. It fast-forwarded to `4859ef69`, prepared the actual assets, and
passed repeated native preparation. The diagnostic omitted dependency setup and
launched no assistant. Its newly created worktree was removed; the existing
story branch retains the safe fast-forward. This verifies admission, not Sonnet
execution. Evidence: `.tmp/156-retained-lane-full.log`,
`.tmp/156-worktree-prepare-tests.log`, `.tmp/156-reopen-actual-lane.mjs`.

## Owned lane refresh and checkout hashes — 2026-10-10

The live AOF milestone 153 run completed refinement (commit `8d25af05`) and
reached the continue wave. Lane admission for 153/01 then refused the architect
asset with `codex-output-conflict`; repair run `20261010T121938091Z-0000`
returned needs-input. This is evidence of live refinement, not completed mixed
loop acceptance or a successful Sonnet execution turn.

`prepareCodexWorktree` compared an exclusive destination both with its own lock
and with the latest source content. The latter check rejected legitimate older
owned outputs. It now permits refresh when the destination matches its own
Codex ownership record; source drift, destination edits and unowned files still
refuse during preflight before any writes. Two new cases (flat and work lock
sections) failed with the reported conflict before the fix and pass afterward.
A third case proves that a later edited destination prevents earlier pending
updates and leaves the lane lock unchanged.

A disposable detached checkout of actual AOF HEAD exposed a second issue:
the installed lock recorded CRLF/mixed output hashes while Git checks out LF.
The Codex variant source still had CRLF working bytes despite its existing LF
attribute. Restoring its LF bytes and running ordinary `aof work update` (no
force, no drift warnings) regenerated matching outputs and ownership records.
Those outputs and records are committed together in `2f4c9f91`. Preparation
against that actual checkout now succeeds twice, including the architect asset
comparison. The scratch worktree is removed after verification.

Checks: 58 ownership/worker cases, 5 dispatch cases and 69 bundle/context/native
permission cases passed (132 total). Evidence: `.tmp/156-lane-refresh-tests.log`,
`.tmp/156-lane-bundle-checks.log`, `.tmp/156-lane-refresh-probe.mjs`.
Full live loop acceptance and the repository-wide sharded gate remain pending.

## Advisory graph spawn failure — 2026-10-10

The language-tutor run at 2026-10-09 20:46 UTC reached native thread
`01a1226a-8091-7892-9b85-817521129899`. Shell startup, skill reading and driven
run bookkeeping proceeded. The later codebase graph build failed to spawn
Graphify with EPERM; the assistant requested an elevated retry and AOF declined.

A no-model native sandbox probe reproduced the actual operation: standalone
`graphify --version` succeeded, while `aof graph build . --json` failed with
`graphify-spawn-failed`. The correction does not claim to repair that host-level
nested process restriction. Instead it completes the intended advisory-graph
contract: spawn errors, timeout and sandbox denial now explicitly take the same
source-inspection fallback as a missing or unusable graph, without requesting
escalation, changing permissions or installing tools. A stale graph is not evidence.
The canonical Claude procedures/architect and the Codex variants were updated.

The project's `aof work update` refreshed six generated assets, skipped 159 and
reported no drift warnings. The original failed run remains unchanged.
The focused render/contract/permission suite passed 69 cases, including both
assistants' rendered refine/review/architect instructions. Evidence:
`.tmp/156-graph-sandbox-evidence.json`, `.tmp/156-graph-fallback-tests.log`.

A live Astra/high turn then consumed the updated installed graph-grounding
instructions and ran the real `aof graph build` in language-tutor under the default
sandbox. It completed with eight tool activity events, recorded the graph as
unavailable after the spawn failure, and read package.json as source context;
no permission request stopped the turn. Its scratch evidence file was checked
and the scratch directory removed. Evidence:
`.tmp/156-native-graph-fallback-evidence.json`. This verifies the reported failing
operation and its fallback, not an end-to-end milestone loop.

## Windows sandbox shell correction — 2026-10-09

The language-tutor item 16 attempt at 19:44 UTC reached native thread
`01a12232-7fee-76f3-940d-0f7e5d3650be`. Its first skill-read command failed with
`CreateProcessAsUserW failed: 5 (Access is denied)` while launching Store `pwsh.exe`.
The subsequent unsandboxed retry requested approval and was correctly declined.
The active policy was `on-request` with `workspace-write` and no network access.

A bounded native `command/exec` probe reproduced the Store shell failure in the
project's read-only sandbox; built-in Windows PowerShell successfully checked the
same skill under the same policy. AOF now filters the Store shell directories from
only the owned Codex child's PATH when an ordinary shell remains available.
Execution aliases require `lstat`: following the alias returns EACCES on this host.
Preferred ordinary PowerShell, non-Windows environments and sole-shell environments
are unchanged. The host's saved settings, trust, permissions and PATH were not edited.

Verification: 87 focused adapter, phase and permission/architecture cases passed.
A real Astra/high turn with the production adapter and no test transport completed
eight tool activity events: scratch input read, scratch output written and checked,
the real project's skill header read as data, and `aof --version` executed.
The scratch directory was removed. This supersedes the earlier no-tool native smoke
test for shell readiness; it does not claim a complete mixed project loop.
Evidence: `.tmp/156-sandbox-shell-evidence.json`,
`.tmp/156-native-tools-evidence.json`, `.tmp/156-shell-tests.log`.

The [official App Server documentation](https://learn.chatgpt.com/docs/app-server#command-execution)
defines `command/exec` as sandboxed execution and distinguishes approval requests
from normal tool execution. The correction changes shell discovery, not that boundary.

## Existing-project asset preflight correction — 2026-10-09

The language-tutor item 16 failure at 19:37 UTC occurred before Codex started:
the recorded attempt had no session identity, and the same child command with
`--dry-run --json` returned `runtime-asset-missing` for
`.agents/skills/aof-refine/SKILL.md`. The project still had the older
`.codex/skills` bundle. The parent had reduced that child refusal to `agent_error`.

The loop now shares the driver's native asset validation and performs it during
invocation resolution, before a phase run is minted. New launches, resumes and
worker handoffs check only phases assigned to Codex. Missing or incompatible
procedures and their referenced files produce a named command refusal with the
`aof work update` remedy; the child repeats validation in its own checkout.

The project's normal `aof work update` completed after a dry-run showed no drift
warnings: 81 created, 38 updated, 46 skipped, 39 obsolete generated files deleted.
The recorded Astra/high refinement now passes the actual child dry-run. The
existing failed attempt was preserved; it remains non-retryable and a fresh loop
launch is the recovery path. No full project loop was started for this correction.

Verification: 86 adapter/phase/architecture cases and 18 mesh assignment cases
passed. The phase suite includes a real CLI resume that refuses a missing skill
with the update remedy and leaves the run records unchanged, plus fresh/resume/
handoff cases for missing, incompatible and incomplete assets and a mixed-phase
case that requires no Codex files for the Claude phases. Raw evidence:
`.tmp/156-asset-preflight-tests.log` and `.tmp/156-asset-mesh-tests.log`.

## Windows Codex startup correction — 2026-10-09

The reported `runtime_unavailable` was reproduced as an executable-discovery gap:
normal Windows terminals expose the npm `codex.cmd`, while the adapter tried only
`codex.exe`. The npm installation is 0.130.0 and advertises the older model catalogue.
The registered desktop installation is 0.162.0-alpha.2 and advertises gpt-6-astra/high.

AOF now resolves npm launchers to native executables and checks admitted versions.
If PATH contains no compatible installation, it discovers the registered Windows
desktop application. Explicit binary choices never fall back. Native processes
still launch directly with `shell: false`. Failure diagnostics distinguish missing
executables from unsupported versions. The prerelease version parser and allowlist
admit exactly 0.162.0-alpha.2 alongside 0.160.0, rather than admitting arbitrary versions.

Evidence:

- Live Astra/high structured completion through the production adapter passed on
  0.162.0-alpha.2, including identity and usage callbacks.
- Native thread read and a second live turn resuming the same identity passed.
- Seven request/question/usage/permission-refusal payloads match JSON schemas
  emitted by that installed CLI. Its blocking question shape includes `isBlocking`;
  the older 0.130.0 shape does not, and remains unsupported.
- Native model preflight in `language-tutor`, with IDE paths removed from PATH,
  resolved the user's exact flags to Astra/high, Sonnet/high, Astra/high.
- The same project command with `--dry-run --json` returned success. Because that
  item is a backlog target, this is a promotion preview, not a driven loop.
- All 75 focused executable-discovery, protocol, phase and architecture checks passed.

The schema-generation method follows the [official App Server documentation](https://learn.chatgpt.com/docs/app-server#message-schema).
No CLI was installed, no PATH or credentials were changed, and no actual work loop
was started on the user's project. Live protocol checks used an empty temporary
directory with a no-tools/no-file-changes prompt. Full mixed-loop acceptance remains separate.

Raw evidence: `.tmp/156-native-live-evidence.json`, `.tmp/156-native-schema-evidence.json`,
`.tmp/156-language-tutor-native-preflight.json`, `.tmp/156-language-tutor-preflight.json`,
and `.tmp/156-codex-launch-tests.log`.

## Model-only routing correction — 2026-10-09

The operator now selects only models and effort. The loop and standalone drive
infer the assistant; their CLI parsers no longer expose `--runtime`. Child drives
use the persisted run envelope instead of carrying a runtime flag. Phase models
in `work.agents.session` select the assistant even when older defaults disagree.
The editor saves those neutral settings and removes phase-assistant selectors.
Bundled Codex workflow guidance and its generated manifest were updated together.

The AC now explicitly uses `--model sonnet:high --model refine=gpt-6-astra:high`.
It includes ownership/capability refusals and no provider fallback. Live acceptance
is a separate unchecked task rather than an implicit caveat on completed tasks.

| Correction check | Result |
| --- | --- |
| Runtime/model resolution, native phase/CLI boundaries and configuration editor | 78 cases passed |
| Legacy configuration, local drive, resume and session grammar | 119 cases passed |
| Loop probe, mixed worker lanes, shell boundaries, native assets and bundle manifest | 52 cases passed |
| Native dispatch | 5 cases passed |
| CLI lifecycle, including model-only mixed loop and edited-config resume | 54 scenarios passed |
| Drive and CLI architecture | 97/100 initially passed; three obsolete fictitious-model cases corrected, all 8 affected model cases passed on rerun |
| UI TypeScript and production build | Passed; existing large-chunk advisory |
| Work validation | No findings |

Raw evidence: `.tmp/156-model-tests.log`, `.tmp/156-model-legacy.log`,
`.tmp/156-model-boundary.log`, `.tmp/156-model-dispatch.log`, `.tmp/156-model-ui.log`,
`.tmp/156-model-lifecycle-final.log`, `.tmp/156-model-drive-checks.log`,
`.tmp/156-model-drive-rerun.log`.
The older drive fixtures used `fable` as an arbitrary Claude model. With model
ownership now meaningful, those precedence/argv cases use the real `haiku` alias.
An initial stricter missing-run guard also exposed the older Claude lending contract;
that behavior was preserved, while a missing native record still refuses before launch.
The browser tool reported the in-app browser unavailable and returned an empty
browser inventory. No browser visual acceptance is claimed. Live assistant
execution and the full clean-worktree sharded gate remain pending below.

## Earlier implementation evidence

All command tests used isolated `AOF_GLOBAL_HOME` directories or the fixture's own
temporary home. The working tree is based on `6af4635d` with the story-156 changes.

| Check | Result |
| --- | --- |
| Runtime selection, native phases, editor, worker ownership and legacy resume focused run | 147 cases passed |
| Final runtime selection, phase driver and editor run | 72 cases passed |
| Updated policy-map and runtime selection checks | 197 cases passed |
| CLI lifecycle (`node test/integration/cli.mjs lifecycle`) | 54 scenarios passed |
| Native dispatch (`node --test packages/work-loop/test/dispatch.test.mjs`) | 5 cases passed |
| Final mixed wave, shell-size and configuration-boundary checks | 7 selected cases passed |
| UI (`node scripts/ui-build.mjs`) | TypeScript and production build passed; existing large-chunk advisory |
| Whitespace (`git diff --check`) | Passed |

The lifecycle suite now registers both a complete mixed loop and a mixed loop
interrupted after refinement, with configuration changed before resume. Each uses
the real loop, phase drivers, gate ladder and persisted run records. Assistant
transports and the assistants' resulting file edits are scripted. Codex refines;
Claude implements and verifies. The implementation remains Sonnet/high after the
configuration is changed to select Codex and another model. A persistently failing
mixed build halts before verification under the existing bound.

The refine-first wave test installs both asset bundles in an isolated Git fixture,
opens real lanes, and checks that child inputs and lane run records carry
Claude/Sonnet/high while `brief.loop.execution` retains the complete mixed plan.
The worker test checks that this plan survives the declared child-loop launch.

The initial 328-case contract run found three obsolete policy-map count/position
assertions; their expectations now include the new phase-runtime key. Its affected
policy suite passed on rerun. The 55-case wave/architecture run found three structural
assertions and one legacy heartbeat timing failure. Runtime grammar was extracted
into the existing invocation module to keep the shell below its unchanged line
budget; phase projection is injected into the wave so it still imports no bounds
module. The expected policy-map tail now includes phase runtimes. All affected
structural checks passed on rerun. The heartbeat case passed alone, including its
three outline rows; this is recorded as a load-sensitive failure, not a clean full
wave-suite pass.

Local raw evidence: `.tmp/156-focused-tests.log`, `.tmp/156-final-unit-tests.log`,
`.tmp/156-bounds-tests.log`, `.tmp/156-integration-tests.log`,
`.tmp/156-final-mixed-resume.json`, `.tmp/156-wave-tests.log`,
`.tmp/156-wave-isolated.log`, `.tmp/156-wave-final.log`.

## Remaining acceptance

- A live Astra/high → Sonnet/high loop has not been run for this change.
- The earlier CLI compatibility blocker is resolved by the Windows startup
  correction above; full mixed-loop acceptance still requires its own evidence.
- The updated configuration editor has build and API roundtrip evidence, not a new
  browser visual acceptance run.
- The repository-wide clean-worktree sharded gate has not been rerun for story 156.

Milestone 154's earlier acceptance remains evidence of its single-runtime behavior,
not acceptance of this mixed-runtime correction. Its scope now explicitly points
to this story.
