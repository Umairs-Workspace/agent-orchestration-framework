@executable @cli @work @work-stream
Feature: work.notify is a closed block that names each channel's type and the env var holding its URL, never the URL

  ADR-005 §1. `work.notify` in `schemas/aof.schema.json` is closed:
  `{ channels: { <name>: { type: "discord", urlEnv?, events? } }, link? }`. A Discord webhook URL
  carries its token in its path (RESEARCH R9), so the URL IS the credential. No `url`, `webhook` or
  `token` key exists at any level of the block. `urlEnv` matches `^[A-Z][A-Z0-9_]*$` and defaults to
  `AOF_DISCORD_WEBHOOK_URL`. `events` is a list drawn from the seven `EVENTS` and defaults to all
  seven. `link` is an optional template that may carry `{ref}`. `resolveNotifyConfig(config)` in
  `src/notify/notify.mjs` is the ONE reader of the block, and it applies the defaults. Absent means
  an honest no-op (17/ADR-004).

  RULINGS (PO, 2026-09-23). (1) The schema is the acceptance authority for the block's SHAPE,
  compiled in-process with Ajv-2020, the idiom `test/notion/notion-config-schema.test.mjs` uses,
  because `validateConfig` does no `work.*` subtree validation. (2) `channels` is required and may
  be empty; an empty map is the same honest no-op as an absent block. A channel's `type` is required
  and its enum is `["discord"]`; a second channel type is one enum member and one `CHANNELS` entry.
  `events`, when present, has at least one member and no repeats. (3) `resolveNotifyConfig` answers
  `null` for an absent, non-object or channel-less block. Otherwise it answers a frozen
  `{ channels: [{ name, type, urlEnv, events }], link }`, with the channels in config order, the two
  defaults applied, and `link` as `null` when absent. It never reads `process.env` and never throws.
  (4) The committed `.aof/aof.config.json` gains no `work.notify` block in this story. The live
  channel is configured by story 07.

  RULINGS (QA, 2026-09-23). (1) The schema does not require `{ref}` in `link`, since task 03 uses
  a template without one as it is. `link` is a non-blank string: `minLength: 1` and
  `pattern: "\\S"`, the `delegationModel` idiom. (2) Nothing validates the block at run time, so the
  resolver meets shapes the schema refuses and never throws on them. It skips a channel whose value
  is not a plain object, and answers `null` when no channel is left. A key that is absent or of the
  wrong JSON type (a non-string `urlEnv`, a non-array `events`, a non-string `link`) takes its
  default. A present value of the right type passes through unchecked, so a `type` other than
  `discord` reaches `notify` and is refused there (task 05). An array is never a plain object.
  (3) "Config order" is `Object.keys` order: insertion order, except that integer-like names come
  first, as `JSON.parse` gives them. (4) The resolver copies. Its answer is frozen throughout, and
  the config it read is neither frozen nor shared with the answer.

  Scenario: a channel naming its env var validates
    Given a config whose `work.notify` is `{ channels: { ops: { type: "discord", urlEnv: "AOF_DISCORD_WEBHOOK_URL", events: ["session-needs-input", "milestone-accepted"] } }, link: "https://example.test/board/{ref}" }`
    When the schema is compiled and asked to validate it
    Then it is valid

  Scenario: a channel carrying the URL itself is refused
    When the schema validates a channel `{ type: "discord", url: "https://discord.com/api/webhooks/1/abc" }`
    Then it is invalid, and an error points at the channel's unknown property

  Scenario: the resolver applies the two defaults
    When `resolveNotifyConfig({ work: { notify: { channels: { ops: { type: "discord" } } } } })` is asked
    Then it answers `{ channels: [{ name: "ops", type: "discord", urlEnv: "AOF_DISCORD_WEBHOOK_URL", events: <the seven EVENTS> }], link: null }`, frozen

  Scenario: an absent block resolves to nothing
    When `resolveNotifyConfig` is asked of a config with no `work.notify`
    Then it answers `null`

  Scenario Outline: well-formed blocks validate
    When the schema validates `{ name: "x", resources: [], work: { notify: <notify> } }`
    Then it is valid

    Examples:
      | notify                                                                                    |
      | `{ channels: {} }`                                                                        |
      | `{ channels: { ops: { type: "discord" } } }`                                              |
      | `{ channels: { ops: { type: "discord", urlEnv: "A" } } }`                                 |
      | `{ channels: { ops: { type: "discord", urlEnv: "HOOK_2_B" } } }`                          |
      | `{ channels: { ops: { type: "discord", events: ["loop-died"] } } }`                       |
      | `{ channels: { ops: { type: "discord", events: <the seven EVENTS> } } }`                  |
      | `{ channels: { ops: { type: "discord" }, b: { type: "discord", urlEnv: "HOOK_B" } }, link: "https://example.test/board" }` |

  Scenario Outline: a malformed channel is refused where it is malformed
    When the schema validates a config whose `work.notify` is `{ channels: { ops: <channel> } }`
    Then it is invalid, with an error of keyword `<keyword>` at instance path `<path>`

    Examples:
      | channel                                                                  | keyword              | path                               |
      | `{ type: "discord", webhook: "https://discord.com/api/webhooks/1/abc" }` | additionalProperties | /work/notify/channels/ops          |
      | `{ type: "discord", token: "abc" }`                                      | additionalProperties | /work/notify/channels/ops          |
      | `{ type: "discord", urlEnv: "aof_hook" }`                                | pattern              | /work/notify/channels/ops/urlEnv   |
      | `{ type: "discord", urlEnv: "1HOOK" }`                                   | pattern              | /work/notify/channels/ops/urlEnv   |
      | `{ type: "discord", urlEnv: "_HOOK" }`                                   | pattern              | /work/notify/channels/ops/urlEnv   |
      | `{ type: "discord", urlEnv: "AOF-HOOK" }`                                | pattern              | /work/notify/channels/ops/urlEnv   |
      | `{ type: "discord", urlEnv: "" }`                                        | pattern              | /work/notify/channels/ops/urlEnv   |
      | `{ type: "discord", urlEnv: "https://discord.com/api/webhooks/1/abc" }`  | pattern              | /work/notify/channels/ops/urlEnv   |
      | `{ type: "discord", urlEnv: 42 }`                                        | type                 | /work/notify/channels/ops/urlEnv   |
      | `{ type: "slack" }`                                                      | enum                 | /work/notify/channels/ops/type     |
      | `{ type: "Discord" }`                                                    | enum                 | /work/notify/channels/ops/type     |
      | `{ urlEnv: "HOOK_A" }`                                                   | required             | /work/notify/channels/ops          |
      | `{ type: "discord", events: ["session-exploded"] }`                      | enum                 | /work/notify/channels/ops/events/0 |
      | `{ type: "discord", events: [] }`                                        | minItems             | /work/notify/channels/ops/events   |
      | `{ type: "discord", events: ["loop-died", "loop-died"] }`                | uniqueItems          | /work/notify/channels/ops/events   |
      | `{ type: "discord", events: "loop-died" }`                               | type                 | /work/notify/channels/ops/events   |
      | `null`                                                                   | type                 | /work/notify/channels/ops          |
      | `"discord"`                                                              | type                 | /work/notify/channels/ops          |

  Scenario Outline: a malformed block is refused at the block
    When the schema validates a config whose `work.notify` is <notify>
    Then it is invalid, with an error of keyword `<keyword>` at instance path `<path>`

    Examples:
      | notify                                                                | keyword              | path                  |
      | `{ channels: {}, url: "https://discord.com/api/webhooks/1/abc" }`     | additionalProperties | /work/notify          |
      | `{ channels: {}, webhook: "https://discord.com/api/webhooks/1/abc" }` | additionalProperties | /work/notify          |
      | `{ channels: {}, token: "abc" }`                                      | additionalProperties | /work/notify          |
      | `{ channels: {}, retries: 3 }`                                        | additionalProperties | /work/notify          |
      | `{ link: "https://example.test/{ref}" }`                              | required             | /work/notify          |
      | `{ channels: [] }`                                                    | type                 | /work/notify/channels |
      | `{ channels: {}, link: 42 }`                                          | type                 | /work/notify/link     |
      | `{ channels: {}, link: "" }`                                          | minLength            | /work/notify/link     |
      | `{ channels: {}, link: "   " }`                                       | pattern              | /work/notify/link     |
      | `[]`                                                                  | type                 | /work/notify          |
      | `"discord"`                                                           | type                 | /work/notify          |
      | `null`                                                                | type                 | /work/notify          |

  Scenario Outline: nothing to notify resolves to null, and no shape throws
    When `resolveNotifyConfig(<config>)` is asked
    Then it answers `null`, and no error is thrown

    Examples:
      | config                                                      |
      | `undefined`                                                 |
      | `null`                                                      |
      | `{}`                                                        |
      | `{ work: null }`                                            |
      | `{ work: {} }`                                              |
      | `{ work: { notify: null } }`                                |
      | `{ work: { notify: "discord" } }`                           |
      | `{ work: { notify: [] } }`                                  |
      | `{ work: { notify: {} } }`                                  |
      | `{ work: { notify: { channels: {} } } }`                    |
      | `{ work: { notify: { channels: null } } }`                  |
      | `{ work: { notify: { channels: [{ type: "discord" }] } } }` |
      | `{ work: { notify: { channels: { ops: null } } } }`         |

  Scenario Outline: the resolver keeps what is given, defaults what is not, in config order
    When `resolveNotifyConfig({ work: { notify: <notify> } })` is asked
    Then it answers <answer>

    Examples:
      | notify                                                                                                | answer                                                                                                  |
      | `{ channels: { ops: { type: "discord", urlEnv: "HOOK_A", events: ["milestone-accepted", "loop-died"] } }, link: "https://example.test/{ref}" }` | one channel `{ name: "ops", type: "discord", urlEnv: "HOOK_A", events: ["milestone-accepted", "loop-died"] }`, and `link` the template unfilled |
      | `{ channels: { zeta: { type: "discord" }, alpha: { type: "discord" } } }`                             | channels named `["zeta", "alpha"]`, in that order                                                       |
      | `{ channels: { ops: { type: "discord" }, "2": { type: "discord" } } }`                                | channels named `["2", "ops"]`, in that order                                                            |
      | `{ channels: { ops: null, alerts: { type: "discord" } } }`                                            | one channel, `alerts`, with the two defaults                                                            |
      | `{ channels: { ops: { type: "slack" } } }`                                                            | one channel `{ name: "ops", type: "slack", urlEnv: "AOF_DISCORD_WEBHOOK_URL", events: <the seven> }`    |
      | `{ channels: { ops: { type: "discord", urlEnv: 42, events: "loop-died" } }, link: 7 }`                | one channel with both defaults, and `link: null`                                                        |

  Scenario: the answer is frozen and the config it read is untouched
    Given `config` = `{ work: { notify: { channels: { ops: { type: "discord", events: ["loop-died"] } } } } }`
    When `resolveNotifyConfig(config)` is asked
    Then the answer, its `channels`, each channel and each channel's `events` are frozen
    And `config.work.notify.channels.ops.events` is not frozen and is not the answer's `events` array
