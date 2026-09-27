@executable @cli @work @planning
Feature: `work.examples.enabled` is off unless a project turns it on, and one resolver answers for it

  WHY. Discovery costs a person's time and a refine beat, so a project opts in (ADR-006). The gate
  has code readers that land in story 04 (the snapshot probe, the lane and the continue door), and
  they must all ask the same question the same way. So there is one resolver,
  `examplesEnabledFromConfig(config)`, beside `planEnabledFromConfig` in `src/config-inspect.mjs`,
  and one validator beside `validateWorkPlan`, called from `validateWork`. The plan gate's rule
  carries over unchanged: anything that is not the boolean `true` resolves OFF, and a value of the
  wrong type is also diagnosed. A mistyped gate must never read as on.

  `schemas/aof.schema.json` gains a `work.examples` entry, so an editor that validates against the
  schema flags the same shapes `aof project validate` does.

  RULINGS (QA, 2026-09-24).
  (1) The plan gate's rows all carry over: absent, `false` and `true` raise nothing; a string, a
      number or `null` for `enabled` resolves off and is one error at `work.examples.enabled`,
      code `examples-gate-bad-value`.
  (2) `work.examples` that is not an object (`true`, `[]`, a string) resolves off and is one error
      at `work.examples`, code `examples-gate-bad-value`.
  (3) A key inside `work.examples` other than `enabled` is one error at `work.examples.<key>`,
      code `examples-gate-unknown-key`, so a misspelt `enable` never passes silently. The schema's
      `additionalProperties: false` says the same.
  (4) The resolver is total: a config that fails validation still resolves, and never throws. It
      reads `enabled` alone, so an unknown key beside `enabled: true` is diagnosed and the gate is
      still on: the error is the validator's to report (PO, 2026-09-24).

  Background:
    Given a fixture project `P` in a fresh temp directory, with `AOF_GLOBAL_HOME` set to another fresh temp directory
    And `examplesEnabledFromConfig` and `validateConfig` are imported from `src/config-inspect.mjs`

  Scenario Outline: the gate resolves off unless it is the boolean true — <configured>
    Given `P`'s `.aof/aof.config.json` sets `work.examples` to <config>
    When `examplesEnabledFromConfig` is asked for that config and `validateConfig(P)` is run
    Then the gate resolves <resolved>
    And <diagnosed>

    Examples:
      | configured    | config                   | resolved | diagnosed                                                                                   |
      | absent        | nothing                  | off      | no diagnostic's path starts with `work.examples`                                            |
      | false         | `{ enabled: false }`     | off      | no diagnostic's path starts with `work.examples`                                            |
      | true          | `{ enabled: true }`      | on       | no diagnostic's path starts with `work.examples`                                            |
      | a string      | `{ enabled: "yes" }`     | off      | exactly one error at `work.examples.enabled`, code `examples-gate-bad-value`                |
      | a number      | `{ enabled: 1 }`         | off      | exactly one error at `work.examples.enabled`, code `examples-gate-bad-value`                |
      | null          | `{ enabled: null }`      | off      | exactly one error at `work.examples.enabled`, code `examples-gate-bad-value`                |
      | the string true | `{ enabled: "true" }`  | off      | exactly one error at `work.examples.enabled`, code `examples-gate-bad-value`                |
      | an empty object | `{}`                   | off      | no diagnostic's path starts with `work.examples`                                            |
      | a boolean     | `true`                   | off      | exactly one error at `work.examples`, code `examples-gate-bad-value`                        |
      | an array      | `[]`                     | off      | exactly one error at `work.examples`, code `examples-gate-bad-value`                        |
      | a bare string | `"on"`                   | off      | exactly one error at `work.examples`, code `examples-gate-bad-value`                        |
      | a misspelt key | `{ enable: true }`      | off      | exactly one error at `work.examples.enable`, code `examples-gate-unknown-key`               |
      | an extra key  | `{ enabled: true, extra: 1 }` | on | exactly one error at `work.examples.extra`, code `examples-gate-unknown-key`              |

  Scenario: the gate is off for the empty config, and a missing config is not an error
    When `examplesEnabledFromConfig` is asked for `{}`, for `undefined` and for a config with no `work` object
    Then it answers `false` every time, and never throws

  Scenario: the schema types the gate as the validator does
    When `schemas/aof.schema.json` is read
    Then `$defs.work.properties.examples` is an object schema whose one property `enabled` is typed `boolean`
    And it declares `additionalProperties: false`
    And its description says the key is optional and that absent means off

  Scenario: setting the gate changes nothing else in the config's reading
    Given `P`'s config sets `work.plan.enabled` to `true` and `work.examples.enabled` to `false`
    When `validateConfig(P)` is run and both resolvers are asked
    Then `planEnabledFromConfig` answers `true` and `examplesEnabledFromConfig` answers `false`
    And the diagnostics are exactly those the same config raises without its `work.examples` key
