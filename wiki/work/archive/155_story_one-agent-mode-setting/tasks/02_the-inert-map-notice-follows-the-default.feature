@executable @cli @work @validate
Feature: R3 · a per-role map is reported inert wherever the effective mode is solo

  WHY. `aof config inspect` tells an operator when `work.agents.models` or `work.agents.effort` can
  have no effect, because under solo no sub-agent is spawned to carry a per-role model or effort
  (`packages/core/src/application/bindings/config-inspect.mjs`). Today the notice fires only on an
  explicit `work.agents.mode: "solo"`. Once an unset mode means solo (task 01), an operator with an
  unset mode and a populated map is in exactly the state the notice exists for, and hears nothing.
  After this task the notice follows the effective hand-run mode, `agentModeFromConfig` from task
  00, rather than the literal value.

  This supersedes story 30's "with a per-role map and no mode set, no solo-mode notice is
  surfaced". Its delivered feature stays untouched; the test case that pins it is re-pointed here.

  Rule: R3 · A per-role map is reported inert wherever the effective mode is solo

    Scenario: E9 · an unset mode with a per-role model map is reported inert
      Given a config with no `work.agents.mode` and `work.agents.models: { "aof-qa": "opus" }`
      When `aof config inspect --json` runs
      Then the diagnostics carry one `info` notice `model-map-inert-under-solo` at `work.agents.models`
      And the config is still valid
      And the notice's message says the map has no effect because the default mode is solo

    Scenario: E10 · an orchestrated mode raises no inert notice
      Given a config with `work.agents.mode: "orchestrated"` and `work.agents.models: { "aof-qa": "opus" }`
      When `aof config inspect --json` runs
      Then no diagnostic carries `model-map-inert-under-solo`

    Scenario Outline: both maps follow the effective mode
      Given a config with <mode> and <map>
      When `aof config inspect --json` runs
      Then the diagnostics <notice>

      Examples:
        | mode                               | map                                         | notice                                          |
        | no `work.agents.mode`              | `work.agents.effort: { "aof-qa": "high" }`  | carry `info` `effort-map-inert-under-solo`       |
        | `work.agents.mode: "solo"`         | `work.agents.models: { "aof-qa": "opus" }`  | carry `info` `model-map-inert-under-solo`        |
        | `work.agents.mode: "orchestrated"` | `work.agents.effort: { "aof-qa": "high" }`  | carry no `effort-map-inert-under-solo`           |
        | no `work.agents.mode`              | `work.agents.models: {}`                    | carry no `model-map-inert-under-solo`            |

    Scenario: the inspector reads the effective mode from its one home
      When `packages/core/src/application/bindings/config-inspect.mjs` is read with comments stripped
      Then both inert checks resolve the mode through `agentModeFromConfig` from `@aof/contracts/agent-mode`
      And it compares no raw `agents.mode` against `"solo"`
