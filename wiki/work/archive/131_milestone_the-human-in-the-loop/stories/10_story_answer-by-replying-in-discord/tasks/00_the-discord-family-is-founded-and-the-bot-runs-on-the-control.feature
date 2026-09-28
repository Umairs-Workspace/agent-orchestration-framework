@executable @cli @work @work-stream
Feature: the `src/discord/` family is founded, and the bot runs inside the control node's serve daemon and nowhere else

  ADR-008 §1. `src/discord/` is a new family: `gateway.mjs` (the connection), `bot.mjs` (the
  composer: token, served workspaces, dispatch routing) and `replies.mjs` (the answer by reply).
  Story 11 adds `commands.mjs`. `startLauncher` (`src/mesh/launcher.mjs:811`) starts the bot by a
  deferred `import("../discord/bot.mjs")` only when this node is the control
  (`issuanceAuthority`), and the handle's `stop()` stops it.

  RULINGS (PO, 2026-09-25). (1) The bot starts only when a token resolves: the `tokenEnv`
  override, or the store. With neither, the launcher logs `discord-bot-off` once, at `info`, and
  posting is unaffected. (2) The launcher decides only whether to start the bot. The bot reads
  which workspaces it serves on each event, so a project enabled later needs no restart. (3) A
  worker node never imports `bot.mjs`.

  RULINGS (architect, 2026-09-25). (1) `src/discord` and `test/discord` enter
  `acd-source-directory-budget` as EXEMPTIONS, under `FLAT_LAYER_THRESHOLD`. `src/discord`'s
  `why` names `gateway.mjs`, `bot.mjs`, `replies.mjs` and 11's `commands.mjs`. `test/discord`'s
  names the index, `discord-fixture.mjs` (the fake gateway and the reply background, shared with
  the arch file), `discord-bot` (this task), `discord-gateway`, `discord-replies` and 11's `discord-commands`. So 11 edits no
  budget. (2) `src/notify`'s exemption `why` gains `ask-messages.mjs` (task 02). (3)
  `scripts/test.mjs` registers `test/discord/index.mjs` by one import and one spread.

  RULINGS (developer, feasibility, 2026-09-25). (1) The start is placed after the control-node
  branch's other starts, and its `stop` is placed before `streamServer?.stop?.()`. (2)
  `startLauncher` takes `startDiscordBot` as an injected option, as it takes its other
  collaborators, so no suite opens a socket. There is no launcher suite to extend, so these cases
  live in `test/discord/discord-bot.test.mjs`.

  Scenario Outline: which node starts the bot
    Given a launcher on a node that is <role>, with <token>
    When `startLauncher` runs with an injected `startDiscordBot` spy
    Then the spy was <called>

    Examples:
      | role               | token                          | called                                          |
      | the control node   | a token stored                 | called once                                     |
      | the control node   | `AOF_DISCORD_BOT_TOKEN` set    | called once                                     |
      | the control node   | nothing                        | not called, and one `discord-bot-off` is logged |
      | a worker           | a token stored                 | not called                                      |

  Scenario: stopping the launcher stops the bot
    Given a control-node launcher whose injected bot handle records `stop`
    When the launcher's `stop()` runs
    Then the bot handle's `stop` was called once

  Scenario: the new directories are budgeted and the suite is registered
    When `acd-source-directory-budget` runs, and `scripts/test.mjs --only test/discord/index.mjs` is listed
    Then the budget is green with `src/discord` and `test/discord` as exemptions naming 131/10, and the discord suite is reachable from the runner
