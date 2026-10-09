@executable @cli @work @work-stream
Feature: R1 · the loop falls back to work.agents.mode, then solo

  WHY. The phase drive (`aof work drive refine|continue <ref>`, `packages/work-loop/src/commands/drive.mjs`)
  composes a role-mode flag on every refine and continue it drives. Today it reads only
  `work.loop.agents.<phase>.mode` and, when that is unset, the loop's own per-phase default
  (`LOOP_AGENT_MODE_DEFAULTS`, `packages/contracts/src/loop-bounds.mjs`). An operator who sets
  `work.agents.mode: "orchestrated"` therefore gets solo from the loop, and nothing tells them.

  After this task the drive resolves one chain: the loop key when set, else `work.agents.mode`,
  else the one built-in default `solo`. The chain and the default have one home, a new contracts
  leaf `packages/contracts/src/agent-mode.mjs`. `loop-bounds.mjs` keeps declaring `work.loop.*`
  keys and nothing else (FF-6901): it loses `LOOP_AGENT_MODE_DEFAULTS`, and its
  `loopAgentModeFromConfig` answers the loop key alone. The drive still composes a flag on every
  refine and continue, so a driven command always says which mode it runs in.

  This supersedes 140's "the loop never inherits `work.agents.mode`" (140/01) and widens
  129/ADR-001 §5's fallback. Both stay delivered and untouched; the test cases that pin them are
  re-pointed here.

  Rule: R1 · A loop-driven session takes the loop key, then work.agents.mode, then solo

    Background:
      Given `packages/contracts/src/agent-mode.mjs` and `packages/work-loop/src/commands/drive.mjs` after this task

    Scenario: E1 · with no loop key the loop follows an orchestrated work.agents.mode
      Given `.aof/aof.config.json` carries `work.agents.mode: "orchestrated"` and no `work.loop.agents` key
      When `aof work drive continue 53/00 --dry-run --json` runs as a real child process in the fixture
      Then `command` is `/aof:continue 53/00 --orchestrated`

    Scenario: E2 · a set loop key wins over work.agents.mode
      Given `.aof/aof.config.json` carries `work.loop.agents.continue.mode: "solo"` and `work.agents.mode: "orchestrated"`
      When `aof work drive continue 53/00 --dry-run --json` runs as a real child process in the fixture
      Then `command` is `/aof:continue 53/00 --solo`

    Scenario: E3 · with nothing set the loop drives both phases solo
      Given `.aof/aof.config.json` carries neither `work.agents.mode` nor a `work.loop.agents` key
      When `aof work drive refine 53/00 --dry-run --json` and `aof work drive continue 53/00 --dry-run --json` run
      Then the commands are `/aof:refine 53/00 --solo` and `/aof:continue 53/00 --solo`

    Scenario: E4 · a misspelt loop key counts as unset and falls through to work.agents.mode
      Given `.aof/aof.config.json` carries `work.loop.agents.continue.mode: "Solo"` and `work.agents.mode: "orchestrated"`
      When `aof work drive continue 53/00 --dry-run --json` runs as a real child process in the fixture
      Then `command` is `/aof:continue 53/00 --orchestrated`

    Scenario Outline: the chain's edges
      Given `.aof/aof.config.json` carries <config>
      When `aof work drive <phase> 53/00 --dry-run --json` runs as a real child process in the fixture
      Then `command` is <command>

      Examples:
        | phase    | config                                                                          | command                              |
        | refine   | `work.agents.mode: "orchestrated"` and no `work.loop.agents` key                | `/aof:refine 53/00 --orchestrated`   |
        | refine   | `work.loop.agents.refine.mode: "orchestrated"` and `work.agents.mode: "solo"`   | `/aof:refine 53/00 --orchestrated`   |
        | refine   | `work.loop.agents.continue.mode: "orchestrated"` and no `work.agents.mode`      | `/aof:refine 53/00 --solo`           |
        | continue | `work.agents.mode: "Orchestrated"` and no `work.loop.agents` key                | `/aof:continue 53/00 --solo`         |
        | continue | `work.loop.agents.continue.mode: "manual"` and `work.agents.mode: "orchestrated"` | `/aof:continue 53/00 --orchestrated` |
        | verify   | `work.agents.mode: "orchestrated"`                                              | `/aof:verify 53/00`                  |

    Scenario: the chain and its default have one home
      When `packages/contracts/src/agent-mode.mjs` is imported through `@aof/contracts/agent-mode`
      Then it exports `AGENT_MODE_DEFAULT` equal to `"solo"`, a member of `LOOP_AGENT_MODES`
      And `agentModeFromConfig(workspace)` answers `work.agents.mode` when it is a member of `LOOP_AGENT_MODES` and `AGENT_MODE_DEFAULT` otherwise
      And `sessionAgentMode(workspace, phase)` answers the loop key, else `work.agents.mode`, else `AGENT_MODE_DEFAULT` for `refine` and `continue`, and `null` for `verify`
      And `packages/contracts/src/loop-bounds.mjs` exports no `LOOP_AGENT_MODE_DEFAULTS`
      And `loopAgentModeFromConfig(workspace, phase)` answers the loop key's member value, or `null` when it is unset

    Scenario: the bounds home and the drive spell no default of their own
      When `packages/contracts/src/loop-bounds.mjs` and `packages/work-loop/src/commands/drive.mjs` are read with comments stripped
      Then neither contains a read of `work.agents.mode`
      And `drive.mjs` spells neither `"solo"` nor `"orchestrated"` outside `PHASE_MODE_FLAGS`
      And `drive.mjs` composes its flag from `sessionAgentMode`
