@executable @cli @work @work-stream
Feature: the loop resolves and records every phase

  `aof work loop` gains a repeatable `--model [<phase>=][<model>][:<effort>]`, and its `--thinking`
  becomes repeatable with the same `[<phase>=]` form. Both are parsed by `parseSessionChoices`
  (story 02) with the other vocabulary guards, before any registered read. Each of the three phases
  is then resolved through `resolveSessionLaunch`, which takes the flag first, then
  `work.agents.session`, then the default.

  The declaration on every run the loop mints gains the appended key `sessions`:
  `{ refine | continue | verify: { model, modelSource, effort, effortSource } }`, with `model` and
  `modelSource` `null` when no model resolves. `thinking` keeps 141's meaning: the unphased
  `--thinking` level, or `null`.

  Scenario: the operator's example resolves per phase and is recorded
    Given `work.agents.session.effort` sets every phase to `"high"` and `work.agents.session.models` is unset
    When `aof work loop 143 --model sonnet:high --model refine=opus:xhigh --model verify=fable:high` mints its first drive's run
    Then that run's declaration `sessions` is:
      | phase    | model  | modelSource | effort | effortSource |
      | refine   | opus   | --model     | xhigh  | --model      |
      | continue | sonnet | --model     | high   | --model      |
      | verify   | fable  | --model     | high   | --model      |
    And its `thinking` is `null`

  Scenario Outline: each part names where it came from
    Given `work.agents.session.models.continue` is <cfgModel> and `work.agents.session.effort.continue` is <cfgEffort>
    When `aof work loop 143 <flags> --dry-run --json` runs
    Then the probe's `sessions.continue` is model <model> (<modelSource>) at `<effort>` (`<effortSource>`)

    Examples:
      | cfgModel   | cfgEffort  | flags                          | model    | modelSource | effort | effortSource |
      | unset      | unset      |                                | `null`   | `null`      | high   | default      |
      | `"opus"`   | `"medium"` |                                | `opus`   | `config`    | medium | config       |
      | `"opus"`   | `"medium"` | `--model continue=sonnet`      | `sonnet` | `--model`   | medium | config       |
      | `"opus"`   | `"medium"` | `--thinking continue=max`      | `opus`   | `config`    | max    | --thinking   |
      | `"opus"`   | unset      | `--thinking xhigh`             | `opus`   | `config`    | xhigh  | --thinking   |
      | unset      | unset      | `--model refine=opus`          | `null`   | `null`      | high   | default      |

  Scenario: an unphased --thinking is still recorded as 141's thinking
    When `aof work loop 143 --thinking extra-high` mints its first drive's run
    Then that run's declaration `thinking` is `"xhigh"`
    And every phase in its `sessions` has effort `xhigh` from `--thinking`

  Scenario Outline: a session flag the grammar refuses stops the loop at its door
    When `aof work loop 143 <flags> --json` runs
    Then it refuses with the code `<code>`
    And no declaration and no run record is written, and no session is spawned

    Examples:
      | flags                                         | code                         |
      | `--model build=opus`                          | session-choice-unknown-phase |
      | `--model refine=:turbo`                       | thinking-unknown-level       |
      | `--thinking turbo`                            | thinking-unknown-level       |
      | `--model verify=`                             | session-choice-empty         |
      | `--model verify=fable:high --thinking verify=max` | session-choice-conflict  |

  Scenario: the loop says what each phase runs on before its first drive
    Given `work.agents.session.effort.continue` is `"high"` and nothing else is configured
    When `aof work loop 143 --model refine=opus:xhigh --model verify=fable --thinking verify=high` starts
    Then before its first drive it narrates `Sessions: refine opus (--model) at xhigh (--model); continue default model at high (config); verify fable (--model) at high (--thinking).`
    And this line replaces 141's `Thinking:` line, superseding that narration scenario in the open (ADR-004 §5)

  Scenario: a declaration built without the key is still usable
    Given a declaration built by the mesh assignment directive or the trigger declaration, which pass no `sessions`
    When `readLoopDeclaration` reads it back
    Then it is usable and its `sessions` is `null`

  Scenario: the usage, the schema text and the operator guide name the flag
    When `aof work loop --help` prints its usage
    Then it lists `--model [PHASE=][MODEL][:EFFORT]` and `--thinking [PHASE=]LEVEL`, each repeatable
    And the description of `work.agents.session.effort` in `schemas/aof.schema.json` names `--model` beside `--thinking` as a per-run override
    And `docs/acd.md` shows the operator's example `aof work loop <ref> --model sonnet:high --model refine=opus:xhigh --model verify=fable:high`
