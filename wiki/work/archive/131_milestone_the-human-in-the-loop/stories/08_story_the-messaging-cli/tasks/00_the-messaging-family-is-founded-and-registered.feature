@executable @cli @work @work-stream
Feature: the aof messaging family is founded in its own directory and registered as four routed commands

  ADR-005 §1, as amended at 131/08. `src/commands/messaging/messaging.mjs` is a new command
  family. It is not a 70th flat sibling, because the `src/commands` row of
  `acd-source-directory-budget` is at its ceiling with an allowance of 0. The module registers
  `messaging:init`, `messaging:enable`, `messaging:disable` and `messaging:status`, each through
  `src/command-core.mjs`'s one import. Their routes are `["messaging", "init"]` and so on, and the
  channel type is a positional.

  RULINGS (PO, 2026-09-25). (1) The directory is an EXEMPTION in the budget table, at one member,
  the way `src/commands/diagram` is, and its `why` names this story. A ninth member is a row.
  (2) `src/notify/` gains a fifth member, `secret.mjs`, and `test/notify/` gains a fifth,
  `notify-messaging.test.mjs`. Both stay under `FLAT_LAYER_THRESHOLD`, and both exemptions' `why`
  are rewritten to name the new member. (3) The help needs no hand-kept line. `helpText` groups by
  route family and titles an unlisted family by capitalising it, so `Messaging:` appears on its own.
  (4) No `work:*` id is added, so `WORK_IDS` in `command-core-contract` and the board's route
  coverage are unchanged.

  RULINGS (developer, feasibility, 2026-09-25). (1) One module may register several commands, as
  `src/commands/mesh/desktop.mjs` does. (2) The four modules stay out of every static closure
  that `72/FF-7205` guards, because `command-core.mjs` is already reached only by a dynamic import.

  Scenario: the four commands are routed
    When `listCommands()` is read
    Then it holds `messaging:init`, `messaging:enable`, `messaging:disable` and `messaging:status`, each with a `cli.route` of `["messaging", <verb>]`

  Scenario: the help lists the family
    When `aof --help` runs
    Then its output carries a `Messaging:` section listing the four usage lines, and no URL

  Scenario: the new directories are budgeted
    When `acd-source-directory-budget` runs over the working tree
    Then it is green, `src/commands/messaging` is an exemption naming 131/08, and the `src/commands` row is still 69

  Scenario Outline: an unknown verb or channel type is refused by name
    When `<argv>` runs
    Then it exits non-zero with code `<code>`, and the message names `<names>`

    Examples:
      | argv                           | code                       | names    |
      | `aof messaging init slack`     | messaging-unknown-channel  | discord  |
      | `aof messaging enable slack`   | messaging-unknown-channel  | discord  |
      | `aof messaging disable`        | messaging-channel-required | discord  |
      | `aof messaging init`           | messaging-channel-required | discord  |
