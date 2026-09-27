@executable @cli @work @work-stream
Feature: `aof messaging enable discord --channel <id> --allow <user-id>[,<user-id>…]` writes the channel's answer list

  ADR-008 §3 put the answer list on the channel, `work.notify.channels.<name>.allow`, and said there
  was no verb for it until one was asked for. The operator asked on 2026-09-26. `--allow` is a flag
  of `enable`, the verb that already writes the channel, so there is no new verb for it.

  RULINGS (PO, 2026-09-26). (1) `--allow` takes Discord user ids, comma-separated. Each is 17 to 20
  digits, and a list with any other entry, or with none, is refused `messaging-allow-invalid` before
  anything is written. (2) It ADDS to the channel's `allow`: ids already there stay, new ones are
  appended in the order given, and a repeated id is written once. Nothing here removes an id. (3)
  An enable whose `--allow` adds nothing reports `changed: false` and leaves the file byte-identical.
  (4) Without `--allow`, every enable behaves exactly as 09 delivered it. (5) The notes name how
  many ids were added and how many may answer, never the ids, as `status` never does.

  Scenario: --allow adds ids, unique and in order, and the file validates
    Given a project with no discord channel
    When `enable discord --channel <id> --allow "A, B,A"` runs
    Then the channel reads `{ type: "discord", channelId: <id>, allow: [A, B] }`
    And the config validates against the repo's schema
    And a note says 2 user ids were added and 2 may answer by reply

  Scenario: an id already listed changes nothing, and a new one is appended
    Given the channel's allow is [A, B]
    When `enable discord --channel <id> --allow B` runs
    Then the answer says `changed: false` and the file is unchanged
    When `enable discord --channel <id> --allow C` runs
    Then the allow reads [A, B, C]

  Scenario: without --allow, enable is 09's
    Given the channel is enabled on <id>
    When `enable discord --channel <id>` runs with no `--allow`
    Then the note ends "— nothing changed." and nothing is written

  Scenario Outline: a bad --allow is refused before any write
    When `enable discord --channel <id> --allow "<allow>"` runs
    Then it is refused `messaging-allow-invalid` and the config file is byte-identical

    Examples:
      | allow |
      | 12    |
      | abc   |
      |       |
      |  ,    |

  Scenario: the CLI's --allow reaches the write, and status counts it
    When `aof messaging enable discord --channel <id> --allow A` runs in the project
    Then it exits 0 and the channel's allow reads [A]
    And `aof messaging status` prints `discord → <id>, 1 may answer by reply`
