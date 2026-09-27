@executable @cli @work @work-stream
Feature: the loop drives both phases solo — an unset work.loop.agents.<phase>.mode composes --solo, never nothing

  The phase drive (`aof work drive refine|continue <ref>`, `src/commands/drive.mjs`) composes its
  role-mode flag from `work.loop.agents.<phase>.mode` through the bounds home. Today an unset key
  composes NO flag, so a driven session falls back to `work.agents.mode` and, with that unset too,
  runs orchestrated. After this task the loop has its own default, `solo` for both phases, declared
  once in `src/loop-bounds.mjs`. Every refine and continue the loop drives carries a flag, and the
  loop never inherits `work.agents.mode`. The loop's settings become self-contained under
  `work.loop` for the modes, as they already are for the bound.

  The default is applied at the PHASE level (`loopAgentModeFromConfig`). The per-key resolvers
  (`resolveLoopAgentMode`, `loopAgentRefineModeFromConfig`, `loopAgentContinueModeFromConfig`) keep
  answering `null` for an unset key, so the registry's range probe and the tuner, which step from
  `null`, are unchanged.

  This SUPERSEDES the drive rows of `129/07/tasks/02_the-drive-carries-the-phase-mode.feature` whose
  command carries no flag (unset → `/aof:<phase> <ref>`), and the "composes no flag and the
  prompt's own read of `work.agents.mode` is the fallback" clause of 129/ADR-001 §5 (AMENDED
  2026-09-15). Both stay delivered and untouched. The test cases backing those rows, and every loop
  test that pins a flagless drive directive, are re-pointed here.

  Background:
    Given `src/loop-bounds.mjs` and `src/commands/drive.mjs` after this task

  Scenario Outline: the phase drive composes a flag for every refine and continue it drives
    Given `.aof/aof.config.json` carries <config>
    When `aof work drive <phase> 53/00 --dry-run --json` runs as a real child process in the fixture
    Then `command` is <command>

    Examples:
      | phase    | config                                                           | command                            |
      | refine   | no `work.loop.agents` key                                        | `/aof:refine 53/00 --solo`         |
      | refine   | `work.loop.agents.refine.mode: "orchestrated"`                   | `/aof:refine 53/00 --orchestrated` |
      | refine   | `work.loop.agents.continue.mode: "orchestrated"` (refine unset)  | `/aof:refine 53/00 --solo`         |
      | refine   | `work.agents.mode: "orchestrated"` and no `work.loop.agents` key | `/aof:refine 53/00 --solo`         |
      | continue | no `work.loop.agents` key                                        | `/aof:continue 53/00 --solo`       |
      | continue | `work.loop.agents.continue.mode: "orchestrated"`                 | `/aof:continue 53/00 --orchestrated` |
      | continue | `work.loop.agents.continue.mode: "Solo"`                         | `/aof:continue 53/00 --solo`       |
      | continue | `work.agents.mode: "orchestrated"` and no `work.loop.agents` key | `/aof:continue 53/00 --solo`       |
      | verify   | `work.loop.agents.continue.mode: "orchestrated"`                 | `/aof:verify 53/00`                |

  Scenario: the loop's default has one home
    When `src/loop-bounds.mjs` is imported
    Then it exports a frozen `LOOP_AGENT_MODE_DEFAULTS` equal to `{ refine: "solo", continue: "solo" }`
    And `loopAgentModeFromConfig(workspace, phase)` answers the key's value when it is set, the phase's default when it is unset, and `null` for `verify`
    And `resolveLoopAgentMode(undefined)`, `loopAgentRefineModeFromConfig` and `loopAgentContinueModeFromConfig` over an unset key still answer `null`
    And `src/commands/drive.mjs`, comments stripped, spells neither `"solo"` nor `"orchestrated"` outside `PHASE_MODE_FLAGS`

  Scenario: the loop never reads the workspace twin
    When `src/loop-bounds.mjs` and `src/commands/drive.mjs` are read with comments stripped
    Then neither contains a read of `work.agents.mode`

  Scenario: the autonomous prompt names the loop's default beside the mode
    When the `<config>` paragraph of `src/bundle/commands/autonomous.md` that names `work.loop.concurrency` is read
    Then it states that `work.loop.agents.refine.mode` and `work.loop.agents.continue.mode` default to `solo` when unset and do not fall back to `work.agents.mode`
    And it states that `work.loop.dispatch.concurrency` falls back to its workspace twin `work.dispatch.concurrency`
    And `statedValues(sentence, unitOf(key))` is `[]` for every sentence naming one of the three loop keys
    And the prompt's config-key set is exactly `work.agents`, `work.agents.mode`, `work.codeReview.autoComplete`, `work.dispatch.concurrency`, `work.loop.agents.continue.mode`, `work.loop.agents.refine.mode`, `work.loop.concurrency`, `work.loop.dispatch.concurrency`
    And its three rendered files carry the same statement
