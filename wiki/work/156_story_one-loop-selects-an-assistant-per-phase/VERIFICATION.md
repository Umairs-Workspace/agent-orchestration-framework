---
doc: verification
---
# 156 verification — 2026-10-09

Implementation is ready for review. This is not live Astra/Sonnet acceptance.
Work and review were performed inline in solo mode. No subagents, dependencies,
standing project runtime settings, or persistent branches/worktrees were added.

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
