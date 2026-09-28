@executable @cli @work @work-stream
Feature: a project's discord channel names its Discord channel by id, and `enable discord --channel <id>` writes it

  ADR-007 §3. A `work.notify` channel is `{ type: "discord", channelId, tokenEnv?, events? }`.
  `channelId` is a required snowflake and is not a secret. `tokenEnv` replaces `urlEnv` and
  defaults to `AOF_DISCORD_BOT_TOKEN`. The closed schema holds no `url`, `webhook`, `token` or
  `urlEnv`. (`allow` arrives with story 10.)

  RULINGS (PO, 2026-09-25). (1) `aof messaging enable discord --channel <id>` writes `{ type:
  "discord", channelId }`. Without `--channel` it refuses `messaging-channel-id-required`. An id
  that is not 17 to 20 digits is refused `messaging-channel-id-invalid`. (2) Enabling the same id
  again changes nothing. Enabling a different id adds `discord-2`, as 08 numbers them. (3)
  `disable discord` is 08's and unchanged. (4) At send, a channel with no `channelId`, such as one
  left by 08's enable, degrades `notify-channel-unconfigured`, and the message names `aof messaging
  enable discord --channel <id>`.

  RULINGS (QA, 2026-09-25). (1) The schema is checked through the repo's own validator, over the
  whole config document. (2) Every write leaves every key outside `work.notify` byte-identical,
  08's invariant.

  Scenario: enable writes the channel id
    Given a project with no `work.notify`
    When `aof messaging enable discord --channel 123456789012345678` runs
    Then `.aof/aof.config.json` holds `work.notify.channels.discord` = `{ "type": "discord", "channelId": "123456789012345678" }`, and nothing else changed

  Scenario Outline: what enable refuses
    When `<argv>` runs in a project
    Then it exits non-zero with `<code>`, and the config is unchanged

    Examples:
      | argv                                           | code                          |
      | `aof messaging enable discord`                 | messaging-channel-id-required |
      | `aof messaging enable discord --channel 12ab`  | messaging-channel-id-invalid  |
      | `aof messaging enable discord --channel 123`   | messaging-channel-id-invalid  |

  Scenario Outline: the schema accepts the bot channel and refuses the webhook keys
    Given a config whose `work.notify.channels.discord` is <channel>
    When the config is validated against `schemas/aof.schema.json`
    Then it is <verdict>

    Examples:
      | channel                                                                             | verdict  |
      | `{ "type": "discord", "channelId": "123456789012345678" }`                          | valid    |
      | `{ "type": "discord", "channelId": "123456789012345678", "tokenEnv": "MY_BOT" }`    | valid    |
      | `{ "type": "discord" }`                                                             | invalid  |
      | `{ "type": "discord", "channelId": "123456789012345678", "urlEnv": "X" }`           | invalid  |
      | `{ "type": "discord", "channelId": "123456789012345678", "token": "x" }`            | invalid  |
      | `{ "type": "discord", "channelId": "not-a-snowflake" }`                             | invalid  |

  Scenario: a channel left without an id degrades by name at send
    Given a token stored, and `work.notify.channels.discord` = `{ "type": "discord" }` written by hand
    When `notify` runs for `milestone-accepted` with a fake fetch
    Then it answers `failed: ["discord"]`, the fetch was not called, and one `notify-channel-unconfigured` names `aof messaging enable discord --channel <id>`
