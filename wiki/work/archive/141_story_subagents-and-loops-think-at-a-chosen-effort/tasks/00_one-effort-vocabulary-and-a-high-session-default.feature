@executable @cli @work @work-stream
Feature: one effort vocabulary, and a driven session thinks at high unless told otherwise

  `resolveSessionLaunch(config, phase)` (`src/session-model.mjs`) answers `{}` when
  `work.agents.session.effort` is unset, so a driven `claude` gets no `--effort` and thinks at the
  model's own default. On Opus 5.5 that default is `medium`. After this task the resolver answers
  `high` when nothing is configured. A `--thinking <level>` on `aof work drive` wins over the
  phase's configured effort for that one drive.

  The level vocabulary has ONE home, `src/session-model.mjs`: Claude Code's five levels (`low`,
  `medium`, `high`, `xhigh`, `max`), plus `extra-high` as another name for `xhigh`. Every door
  that takes a level (the drive flag, the loop flag, both config maps) calls it. It lives in the
  session module rather than in a new `src/` root file because the root is at its budget
  (`test/arch/testing/acd-source-directory-budget.test.mjs`), and ADR-005's split (FF-7006) is
  about which CONFIG PATH each resolver reads, not about who imports a vocabulary.

  The model half of the resolver is unchanged: an unset `work.agents.session.models` still passes
  no `--model`.

  Scenario Outline: a level is read through the one vocabulary
    When `normalizeEffort("<given>")` is called
    Then it answers <answer>

    Examples:
      | given      | answer            |
      | low        | `low`             |
      | medium     | `medium`          |
      | high       | `high`            |
      | xhigh      | `xhigh`           |
      | extra-high | `xhigh`           |
      | max        | `max`             |
      | Extra-High | a refusal         |
      | x-high     | a refusal         |
      | ultra      | a refusal         |
      |            | a refusal         |

  Scenario Outline: the session effort resolves from the flag, then the phase's config, then high
    Given `work.agents.session.effort.continue` is <configured>
    When `resolveSessionLaunch(config, "continue", { thinking: <thinking> })` is called
    Then its `effort` is `<effort>` and its `effortSource` is `<source>`

    Examples:
      | configured               | thinking     | effort | source     |
      | unset                    | absent       | high   | default    |
      | `"medium"`               | absent       | medium | config     |
      | `"extra-high"`           | absent       | xhigh  | config     |
      | `"turbo"`                | absent       | high   | default    |
      | `"medium"`               | `"extra-high"` | xhigh  | --thinking |
      | unset                    | `"low"`      | low    | --thinking |

  Scenario: the drive takes --thinking and shows the effort it will launch at
    Given `work.agents.session.effort` is unset
    When `aof work drive continue 141 --thinking extra-high --dry-run --json` runs
    Then the answer's `effort` is `{ "level": "xhigh", "source": "--thinking" }`
    And the answer's `command` carries no `--thinking` token
    And `aof work drive continue 141 --dry-run --json` answers `effort` `{ "level": "high", "source": "default" }`

  Scenario: an unknown level refuses at the drive's door before anything is minted
    When `aof work drive continue 141 --thinking turbo --json` runs
    Then it refuses with the code `thinking-unknown-level`, naming the six accepted spellings
    And no run record is written and no session is spawned

  Scenario: the spawned claude carries the resolved effort, and no inherited effort variable
    Given the drive resolved the effort `xhigh`
    When the launch argv and env for the session are built
    Then the argv carries `--effort xhigh`
    And the env carries neither `CLAUDE_EFFORT` nor `CLAUDE_CODE_EFFORT_LEVEL`, even when the parent's env set them

  Scenario Outline: a configured session effort is checked by project validate
    Given `work.agents.session.effort.<phase>` is <value>
    When `aof project validate --json` runs
    Then it reports <result> at `work.agents.session.effort.<phase>`

    Examples:
      | phase    | value          | result                              |
      | continue | `"extra-high"` | nothing                             |
      | refine   | `"turbo"`      | an error coded `effort-bad-value`   |
      | verify   | `""`           | an error coded `effort-bad-value`   |
      | continue | `3`            | an error coded `effort-bad-value`   |

  Scenario: the schema describes the session routing
    When `schemas/aof.schema.json` is read
    Then `work.agents` declares `session`, with `models` and `effort` maps keyed by phase
    And the `effort` description names the six accepted spellings and the `high` default
