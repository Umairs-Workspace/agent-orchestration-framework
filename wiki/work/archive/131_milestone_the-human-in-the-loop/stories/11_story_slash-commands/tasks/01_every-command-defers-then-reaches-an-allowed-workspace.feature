@executable @cli @work @work-stream
Feature: every command is deferred first, then reaches only a workspace whose channel allows the user

  ADR-009 §2-§4, §7. `bot.mjs` routes `INTERACTION_CREATE` (type 2) to `commands.mjs`. Each
  interaction gets its initial callback, `POST /interactions/{id}/{token}/callback` with `type: 5`,
  before any config read or dispatch. `/status` and `/asks` defer with `flags: 64` (ephemeral), and
  the `/loop` subcommands defer without it. The final text is `PATCH
  /webhooks/{application.id}/{token}/messages/@original`.

  RULINGS (PO, 2026-09-25). (1) The workspaces COUNTED are the served ones whose `work.notify` has
  a discord channel with the interaction's `channel_id`. (2) Of those, the ones KEPT are those
  whose matched channel's `allow` holds the user (`member.user.id`). (3) With none counted, the
  reply says this channel is not an aof project channel. With some counted but none kept, it
  refuses `discord-command-not-allowed`. In both cases nothing is dispatched. (4) `/loop stop`
  and `/loop resume` need exactly one kept workspace. The `workspace` option, when given, must
  match a kept workspace by id or by project folder name. With several kept and no option, the
  command refuses `discord-scope-ambiguous`, naming each candidate's folder name. (5) An
  interaction with no `member` (a DM) is refused ephemerally. (6) Every reply is at most 2,000
  characters. A longer one is clipped at a line boundary with `… and N more`.

  RULINGS (QA, 2026-09-25). (1) `invoke` is injected and records its calls. The callback and the
  edit are observed as `discordRequest` calls, in order. (2) The ordering assertion is on the
  recorded sequence, not on timing.

  Background:
    Given served workspace "alpha" with discord channel "111111111111111111" and `allow: ["222222222222222222"]`
    And served workspace "beta" with discord channel "111111111111111111" and `allow: ["333333333333333333"]`

  Scenario: the deferral precedes the dispatch
    When user "222222222222222222" runs `/asks` in channel "111111111111111111"
    Then the recorded sequence is the `type: 5` callback with `flags: 64`, then `invoke("work:list", …)` for "alpha" only, then the `PATCH` of the original message

  Scenario Outline: who reaches what
    When user <user> runs `<command>` in channel <channel>
    Then <outcome>

    Examples:
      | user                  | command                              | channel                | outcome                                                                              |
      | "222222222222222222"  | /status                              | "111111111111111111"   | `work:list` is invoked for "alpha" only                                              |
      | "444444444444444444"  | /status                              | "111111111111111111"   | the reply refuses `discord-command-not-allowed`, and `invoke` is never called         |
      | "222222222222222222"  | /status                              | "555555555555555555"   | the reply says this is not an aof project channel, and `invoke` is never called      |
      | "222222222222222222"  | /loop stop scope:131                 | "111111111111111111"   | `work:loop` is invoked for "alpha" with `{ scope: "131", stop: true }`                |

  Scenario: an ambiguous loop command names its candidates
    Given user "222222222222222222" is also in "beta"'s `allow`
    When they run `/loop stop scope:131` in channel "111111111111111111"
    Then the reply refuses `discord-scope-ambiguous` naming "alpha" and "beta", and `invoke` is never called
    And running `/loop stop scope:131 workspace:beta` invokes `work:loop` for "beta"

  Scenario: a DM is refused
    When an interaction with no `member` arrives
    Then it is deferred ephemerally, the reply refuses it, and `invoke` is never called

  Scenario: a long reply is clipped
    Given `/asks` would render 60 lines
    When it runs
    Then the edited content is at most 2,000 characters and ends with `… and <N> more`
