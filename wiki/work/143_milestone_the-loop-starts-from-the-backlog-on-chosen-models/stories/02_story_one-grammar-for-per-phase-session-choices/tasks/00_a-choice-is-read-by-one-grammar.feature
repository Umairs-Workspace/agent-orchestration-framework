@executable @cli @work @work-stream
Feature: a choice is read by one grammar

  `parseSessionChoices({ model, thinking })` (`packages/execution/src/session-model.mjs`) takes the
  values of the two repeatable flags, in order. It answers `{ choices }` or `{ refusal: { code,
  message } }`. `choices` maps a phase (`refine`, `continue`, `verify`) to
  `{ model?, modelFlag?, effort?, effortFlag? }`, where each `*Flag` is `--model` or `--thinking`. An
  unphased value applies to all three phases.

  `--model` splits on the FIRST `=` (a phase prefix), then on the LAST `:`, but only when the suffix
  is an effort spelling (`normalizeEffort`). Any other `:` is part of the model id, so a Bedrock-style
  `…-v1:0` is a model. A phased value beats an unphased one for its phase. Two values at the same
  specificity that set the same part of the same phase refuse, even when they are equal: nothing
  picks a winner (ADR-003 §4).

  Scenario Outline: a --model value is read into its parts
    When `parseSessionChoices({ model: [<value>] })` is called
    Then the choice for `<phase>` is <choice>

    Examples:
      | value                                             | phase    | choice                                                           |
      | `"opus"`                                          | refine   | model `opus` (`--model`), no effort                               |
      | `"opus"`                                          | verify   | model `opus` (`--model`), no effort                               |
      | `"sonnet:medium"`                                 | continue | model `sonnet`, effort `medium`, both `--model`                   |
      | `"verify=fable"`                                  | verify   | model `fable` (`--model`), no effort                              |
      | `"verify=fable"`                                  | refine   | empty: nothing chosen                                             |
      | `"verify=fable:high"`                             | verify   | model `fable`, effort `high`                                      |
      | `"refine=:xhigh"`                                 | refine   | no model, effort `xhigh` (`--model`)                              |
      | `"refine=:extra-high"`                            | refine   | no model, effort `xhigh`                                          |
      | `":max"`                                          | continue | no model, effort `max`                                            |
      | `"anthropic.claude-opus-v1:0"`                    | refine   | model `anthropic.claude-opus-v1:0`, no effort                     |
      | `"verify=anthropic.claude-opus-v1:0:high"`        | verify   | model `anthropic.claude-opus-v1:0`, effort `high`                 |
      | `"opus:turbo"`                                    | refine   | model `opus:turbo`, no effort (the suffix is not an effort, so it is part of the id) |

  Scenario Outline: a --thinking value is read into an effort
    When `parseSessionChoices({ thinking: [<value>] })` is called
    Then the choice for `<phase>` is <choice>

    Examples:
      | value              | phase    | choice                              |
      | `"high"`           | refine   | effort `high` (`--thinking`)         |
      | `"verify=max"`     | verify   | effort `max` (`--thinking`)          |
      | `"verify=max"`     | continue | empty: nothing chosen                |
      | `"extra-high"`     | continue | effort `xhigh` (`--thinking`)        |

  Scenario Outline: a phased value beats an unphased one, across both flags
    When `parseSessionChoices(<given>)` is called
    Then the choice for `verify` is <verify> and the choice for `refine` is <refine>

    Examples:
      | given                                                          | verify                               | refine                              |
      | `{ model: ["sonnet:high", "verify=fable"] }`                   | model `fable`, effort `high`         | model `sonnet`, effort `high`       |
      | `{ model: ["sonnet:high"], thinking: ["verify=max"] }`         | model `sonnet`, effort `max` (`--thinking`) | model `sonnet`, effort `high` (`--model`) |
      | `{ model: ["verify=fable"], thinking: ["low"] }`               | model `fable`, effort `low`          | no model, effort `low`              |

  Scenario Outline: a value it cannot read is refused with a code
    When `parseSessionChoices(<given>)` is called
    Then it refuses with the code `<code>`, and the message names <named>

    Examples:
      | given                                                       | code                         | named                                            |
      | `{ model: ["build=opus"] }`                                 | session-choice-unknown-phase | `build` and the phases `refine`, `continue`, `verify` |
      | `{ thinking: ["Refine=high"] }`                             | session-choice-unknown-phase | `Refine` and the three phases                    |
      | `{ model: ["refine=:turbo"] }`                              | thinking-unknown-level       | `turbo` and the six effort spellings             |
      | `{ thinking: ["verify=ultra"] }`                            | thinking-unknown-level       | `ultra` and the six effort spellings             |
      | `{ model: [""] }`                                           | session-choice-empty         | the empty value                                  |
      | `{ model: ["verify="] }`                                    | session-choice-empty         | `verify=`                                        |
      | `{ model: ["verify=fable", "verify=opus"] }`                | session-choice-conflict      | both values and the phase `verify`               |
      | `{ model: ["verify=fable:high"], thinking: ["verify=max"] }` | session-choice-conflict      | both values and the phase `verify`               |
      | `{ model: [":high"], thinking: ["high"] }`                  | session-choice-conflict      | both values, even though they are equal          |
      | `{ thinking: ["high", "max"] }`                             | session-choice-conflict      | both values                                      |

  Scenario: no flags is no choice
    When `parseSessionChoices({})` is called
    Then it answers `{ choices: {} }`
