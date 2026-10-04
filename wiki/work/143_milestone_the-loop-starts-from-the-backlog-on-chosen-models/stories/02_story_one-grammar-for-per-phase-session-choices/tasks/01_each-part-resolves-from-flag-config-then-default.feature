@executable @cli @work @work-stream
Feature: each part resolves from flag, config, then default

  `resolveSessionLaunch(config, phase, { choice })` resolves the model and the effort separately.
  Each part comes from the flag (the phase's entry from `parseSessionChoices`), then
  `work.agents.session.models` / `.effort`, then the default. The default model is none, so the
  launch passes no `--model`. The default effort is `DEFAULT_EFFORT` (`high`).

  It answers `modelSource` (`--model` or `config`; absent when there is no model) beside the existing
  `effortSource` (`--model`, `--thinking`, `config` or `default`). The `{ thinking }` option from 141
  stays, and means an unphased `--thinking`. 141's outlines stay green unchanged.

  The role map `work.agents.models` is never read here. `--model` sets the session aof spawns, not a
  subagent's model (ADR-003 §7; FF-7006 still holds the split).

  Scenario Outline: the model and the effort resolve separately, each naming its source
    Given `work.agents.session.models.verify` is <cfgModel> and `work.agents.session.effort.verify` is <cfgEffort>
    When `resolveSessionLaunch(config, "verify", { choice: <choice> })` is called
    Then it answers model <model> from <modelSource>, and effort `<effort>` from `<effortSource>`

    Examples:
      | cfgModel      | cfgEffort  | choice                                                    | model         | modelSource | effort | effortSource |
      | unset         | unset      | absent                                                    | none          | absent      | high   | default      |
      | `"opus"`      | `"medium"` | absent                                                    | `opus`        | `config`    | medium | config       |
      | `"opus"`      | `"medium"` | `{ model: "fable", modelFlag: "--model" }`                | `fable`       | `--model`   | medium | config       |
      | `"opus"`      | `"medium"` | `{ effort: "xhigh", effortFlag: "--model" }`              | `opus`        | `config`    | xhigh  | --model      |
      | `"opus"`      | unset      | `{ effort: "max", effortFlag: "--thinking" }`             | `opus`        | `config`    | max    | --thinking   |
      | unset         | unset      | `{ model: "fable", modelFlag: "--model", effort: "high", effortFlag: "--model" }` | `fable` | `--model` | high | --model |
      | `"  "`        | `"turbo"`  | absent                                                    | none          | absent      | high   | default      |

  Scenario: the 141 option still means an unphased --thinking
    Given `work.agents.session.effort.continue` is `"medium"`
    When `resolveSessionLaunch(config, "continue", { thinking: "extra-high" })` is called
    Then its `effort` is `xhigh` and its `effortSource` is `--thinking`
    And it carries no `model` and no `modelSource`

  Scenario: the role map does not leak into the session
    Given `work.agents.models` routes `aof-developer` to `"haiku"` and `work.agents.session` is unset
    When `resolveSessionLaunch(config, "continue", { choice: { effort: "low", effortFlag: "--thinking" } })` is called
    Then it carries no `model`

  Scenario: the grammar and the resolver each have one home
    When FF-14303 (`test/arch/session/acd-agent-model-source-map.test.mjs`, its FF-14303 case) scans comment-stripped `packages/**/src`
    Then `parseSessionChoices` and `resolveSessionLaunch` are each defined only in `packages/execution/src/session-model.mjs`
    And no module under `packages/work-loop/src/` reads `agents?.session` or `agents.session` from config
