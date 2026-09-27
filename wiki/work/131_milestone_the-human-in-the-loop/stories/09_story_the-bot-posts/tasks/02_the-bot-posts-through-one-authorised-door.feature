@executable @cli @work @work-stream
Feature: the bot posts every notification through one authorised request, and the send answers the posted message's id

  ADR-007 §4, §6. `discordRequest(token, method, route, body, { fetch, timeoutMs })` in
  `src/notify/discord.mjs` is the only `src/**` code that builds `Authorization: Bot <token>` or
  names `https://discord.com/api/v10`. It keeps 08's bounded send: one timer, an abort, never
  throws, never retries. `sendDiscord(token, channelId, body, opts)` is `POST
  /channels/{channelId}/messages` through it, and answers `{ ok, status, messageId }`. `notify`
  resolves the token on every send, as `env[tokenEnv]` when set and not blank, else
  `readMessagingSecret("discord")`. It answers `{ delivered, failed, messages }`.

  RULINGS (PO, 2026-09-25). (1) `messages` holds one `{ channel, channelId, messageId }` per
  delivered channel, in config order. (2) The six firing sites do not change and ignore
  `messages`. (3) A stored value that is not a bot token, such as an old webhook URL, degrades
  `notify-channel-unconfigured`, and the message names `aof messaging init discord`. (4) A 401 or
  403 degrades `notify-delivery-failed` naming the status. A 429 degrades `notify-rate-limited`
  with `retry_after`, as today.

  RULINGS (QA, 2026-09-25). (1) The request is observed through the fake fetch's arguments: the
  URL, the method, the `authorization` header and the JSON body. (2) "Never the token" is checked
  over every degrade message captured by the sink spy, and over the returned value.

  RULINGS (developer, feasibility, 2026-09-25). (1) `discordRequest` parses a JSON body when the
  content type is JSON, and answers `json: null` otherwise. (2) The redaction pass 08 keyed on the
  URL is now keyed on the token.

  Scenario: a notification is posted by the bot to the configured channel
    Given the fixture token stored, and `discord` enabled with `channelId` "123456789012345678"
    When `notify` runs for `session-needs-input` with a fake fetch answering 200 `{ "id": "998877665544332211" }`
    Then the fetch was called once with `POST https://discord.com/api/v10/channels/123456789012345678/messages`
    And its `authorization` header is `Bot <token>`, and its body holds `content` and `allowed_mentions`
    And `notify` answers `{ delivered: ["discord"], failed: [], messages: [{ channel: "discord", channelId: "123456789012345678", messageId: "998877665544332211" }] }`

  Scenario Outline: which token a send uses
    Given <stored>, and `AOF_DISCORD_BOT_TOKEN` set to <env>
    When `notify` runs with a fake fetch answering 200 `{ "id": "1" }`
    Then <called>

    Examples:
      | stored                          | env              | called                                                                     |
      | the fixture token               | unset            | the fetch's `authorization` is `Bot <fixture>`                             |
      | the fixture token               | a second token   | the fetch's `authorization` is `Bot <second>`                              |
      | the fixture token               | `"   "`          | the fetch's `authorization` is `Bot <fixture>`                             |
      | a Discord webhook URL           | unset            | the fetch was not called, and `notify-channel-unconfigured` names init     |
      | nothing                         | unset            | the fetch was not called, and `notify-channel-unconfigured` names init     |

  Scenario Outline: a failed post degrades by name and never carries the token
    Given the fixture token stored and `discord` enabled
    When `notify` runs with a fetch that <does>
    Then it resolves `failed: ["discord"]` and `messages: []`, and never rejects
    And one `<code>` degrade is reported, and no degrade message holds the token

    Examples:
      | does                                         | code                    |
      | answers 401                                  | notify-delivery-failed  |
      | answers 403                                  | notify-delivery-failed  |
      | answers 429 `{ "retry_after": 1.5 }`         | notify-rate-limited     |
      | throws `TypeError`                           | notify-delivery-failed  |
      | hangs past `timeoutMs`                       | notify-delivery-failed  |
