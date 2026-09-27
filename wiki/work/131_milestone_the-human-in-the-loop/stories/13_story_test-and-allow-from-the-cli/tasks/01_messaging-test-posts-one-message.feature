@cli @work @work-stream
Feature: `aof messaging test discord` posts one real message through the notifier's own path, and names the fix when it does not arrive

  The fifth `aof messaging` verb, beside 08's four. It posts the bot's test message to each discord
  channel of the project, through the SAME pre-send checks (`readyChannel`, shared with `deliver`)
  and the SAME sender a notification uses. A green test is therefore the path an ask will take.

  RULINGS (PO, 2026-09-26). (1) The message is `**aof — test message** · <project>`, then a line saying the bot
  can post here and that nothing needs an answer, with `allowed_mentions: { parse: [] }`.
  (2) It is not a notification: no envelope, no event, not one of the seven firing sites, and it
  indexes nothing. (3) It degrades nothing. The operator asked, so each outcome is answered to the
  caller. (4) Any channel not reached makes the verb fail `messaging-test-failed`, listing each
  channel with its fix: 401 names `aof messaging init discord`, 403 names the invite and the
  channel permissions, and 404 names the channel id. A pre-send problem (no token, not a bot token,
  no channel id) is worded as the notifier words it. (5) A project with no discord channel is
  refused `messaging-not-enabled`, naming `aof messaging enable discord --channel <id>`. (6) The
  token never appears in an answer, a message or a refusal. (7) Asked for on seeing the first test
  (operator, 2026-09-26): EVERY Discord message, the test included, names its project on line 1 as
  ` · <project>` after the cost and before the node. The project is the config's `name`, else the
  project folder, else nothing. It is a render option, not an envelope key, so the eleven keys and
  the shared headline prefix (FF-13108) do not move.

  @executable
  Scenario: a test posts the bot's test message and answers its id
    Given a bot token is stored and the project enables discord on <id>
    When `messaging test discord` runs against a Discord that answers 200 with a message id
    Then exactly one POST goes to `/channels/<id>/messages` with `Authorization: Bot <token>`
    And its body is the test message, which pings nobody
    And the answer names the channel, the id and the message id, `ok: true`
    And no `notify-` degrade was raised, and the answer holds no part of the token

  @executable
  Scenario Outline: a refused post names its fix
    Given a bot token is stored and the project enables discord on <id>
    When `messaging test discord` runs against a Discord that answers <status>
    Then it is refused `messaging-test-failed`, and the message says "<words>" and "(<status>)"
    And the message holds no part of the token, and no `notify-` degrade was raised

    Examples:
      | status | words                  |
      | 401    | rejected the bot token |
      | 403    | may not post in channel |
      | 404    | knows no channel       |

  @executable
  Scenario: with no token, or no discord channel, nothing is posted
    Given no bot token is stored
    When `messaging test discord` runs in a project that enables discord
    Then it is refused `messaging-test-failed`, naming `aof messaging init discord`
    When it runs in a project with no discord channel
    Then it is refused `messaging-not-enabled`, naming `aof messaging enable discord --channel <id>`
    And no request reached Discord

  @executable
  Scenario: the verb is registered and listed
    Then `messaging:test` is routed at ["messaging", "test"]
    And `aof --help`'s Messaging section lists `aof messaging test <type>` after `status`

  @executable
  Scenario Outline: every message names its project on line 1
    Given a project whose <source>
    When an ask is posted to its discord channel
    Then line 1 reads `<line>`

    Examples:
      | source                                   | line                                                   |
      | config names it "named"                  | **131/08 — waiting on you** (build, 1s) · named        |
      | config has no name, folder is "folder-b" | **131/08 — waiting on you** (build, 1s) · folder-b     |
      | config has no name and no folder is known | **131/08 — waiting on you** (build, 1s)               |

  @manual
  Scenario: the guide shows the test and the allow flag
    When `wiki/architecture/discord-notifications.md` is read
    Then step 3 shows `enable discord --channel <id> --allow <user-id>,<user-id>` with its output
    And step 4 shows `aof messaging test discord`, its output, and the fix for 401, 403 and 404
    And no step still says there is no verb for the allow list
    And the message format shows ` · <project>` on line 1
    And every quoted output matches the source CLI's own
