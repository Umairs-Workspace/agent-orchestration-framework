@executable @cli @work @work-stream
Feature: the four slash commands are registered in every guild an aof channel lives in, at READY and hourly

  ADR-009 §1. `src/discord/commands.mjs` holds one frozen table, `COMMANDS`, of three
  application-command definitions:
  - `status`;
  - `asks`;
  - `loop`, with two subcommands, `stop` and `resume`, each taking a required string option
    `scope`.

  Every command and subcommand also takes an optional string option `workspace`.

  At every READY, and every hour after it, the bot reads the served workspaces' discord
  `channelId`s, resolves each channel's guild with `GET /channels/{id}`, and bulk-overwrites that
  guild's commands with `PUT /applications/{application.id}/guilds/{guild}/commands`. The
  `application.id` is READY's. `bot.mjs` wires this in.

  RULINGS (PO, 2026-09-25). (1) Guild commands, not global ones, because they are available at
  once. (2) Each guild is registered once per pass, however many channels it holds. (3) A channel
  whose lookup fails is skipped with one `discord-command-register-failed` degrade naming the
  channel id, and the other guilds are still registered. (4) The hourly pass is skipped for a guild
  whose last successful overwrite carried the same table.

  RULINGS (QA, 2026-09-25). (1) The requests are observed through a faked `discordRequest`. (2)
  The hour is driven by the fake clock from 10's fixture.

  Scenario: READY registers the table in each guild
    Given two served workspaces whose discord channels are "111111111111111111" and "222222222222222222", both in guild "900000000000000000"
    When the fake gateway sends READY with `application.id` "800000000000000000"
    Then `GET /channels/111111111111111111` and `GET /channels/222222222222222222` were requested
    And exactly one `PUT /applications/800000000000000000/guilds/900000000000000000/commands` was sent, whose body deep-equals `COMMANDS`

  Scenario: the table is the four commands
    When `COMMANDS` is read
    Then it names `status`, `asks` and `loop`; `loop` holds subcommands `stop` and `resume`, each with a required string `scope`; every command and subcommand holds an optional string `workspace`

  Scenario: a failed lookup skips only that channel
    Given two channels in two guilds, where `GET /channels/111111111111111111` answers 404
    When READY arrives
    Then the other guild is registered, and one `discord-command-register-failed` names "111111111111111111"

  Scenario: the hourly pass registers only what changed
    Given a pass that registered guild "900000000000000000"
    When an hour passes on the fake clock, and nothing changed
    Then no `PUT` is sent, and a guild added to a workspace's config since then is registered on that pass
