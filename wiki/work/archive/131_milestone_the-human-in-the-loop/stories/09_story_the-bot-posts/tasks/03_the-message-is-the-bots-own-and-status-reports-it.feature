@executable @cli @work @work-stream
Feature: the posted message is the bot's own, keeping DESIGN §3's lines, and `messaging status` reports the bot without its token

  ADR-007 §5, §7. A bot cannot set `username`, so `renderDiscord` answers `{ content,
  allowed_mentions: { parse: [] } }`. Its lines, cap, word-boundary clip and fence balancing are
  DESIGN §3's and do not change. `aof messaging status` reports, per type, whether a token is
  stored, whether the env override (named by `tokenEnv`) is set, and, for this project, each
  discord channel's `channelId`.

  RULINGS (PO, 2026-09-25). (1) `status`'s human render says `bot token` wherever 08 said
  `webhook`. (2) The `--json` document keeps 08's keys, renames `envOverride.name`'s default to
  `AOF_DISCORD_BOT_TOKEN`, and adds `project.channelIds` beside `project.channels`. (3) `status`
  never calls `readMessagingSecret`, as in 08.

  RULINGS (QA, 2026-09-25). The existing `notify-discord` cases keep their `content` expectations
  byte for byte. Only the `username` key's presence changes.

  Scenario: the render has no username and the same content
    Given the envelope 08's `notify-discord` suite renders for `session-needs-input`
    When `renderDiscord` runs
    Then its keys are exactly `content` and `allowed_mentions`, and `content` is byte-identical to before

  Scenario: a long ask still fits and keeps its action line
    Given a `session-needs-input` envelope whose question is 3,000 characters with an open code fence
    When `renderDiscord` runs
    Then `content` is at most 2,000 characters, keeps line 1, the action line and the link, and holds an even number of fences

  Scenario: status reports the bot and never the token
    Given the fixture token stored, and this project's `discord` channel with `channelId` "123456789012345678"
    When `aof messaging status --json` runs
    Then `channels[0]` has `stored: true`, `envOverride: { name: "AOF_DISCORD_BOT_TOKEN", set: false }` and `project.channelIds: ["123456789012345678"]`
    And neither the human render nor the JSON carries the token's third segment
