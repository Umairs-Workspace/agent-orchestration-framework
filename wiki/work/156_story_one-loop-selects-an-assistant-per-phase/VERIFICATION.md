---
doc: verification
---
# 156 verification — 2026-10-09

Implementation is ready for review. This is not live Astra/Sonnet acceptance.
Work and review were performed inline in solo mode. No subagents, dependencies,
standing project runtime settings, or persistent branches/worktrees were added.

## Evidence

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
- A read-only local capability preflight found the current IDE/npm Codex CLI is
  `0.130.0`; the installed desktop app bundles `0.162.0-alpha.2`. The existing AOF
  profile admits only `0.160.0`, so both currently available binaries are refused
  before a model turn. No compatibility allowlist was widened or CLI installed.
  A supported CLI or separately proven profile update is required for live testing.
- The updated configuration editor has build and API roundtrip evidence, not a new
  browser visual acceptance run.
- The repository-wide clean-worktree sharded gate has not been rerun for story 156.

Milestone 154's earlier acceptance remains evidence of its single-runtime behavior,
not acceptance of this mixed-runtime correction. Its scope now explicitly points
to this story.
