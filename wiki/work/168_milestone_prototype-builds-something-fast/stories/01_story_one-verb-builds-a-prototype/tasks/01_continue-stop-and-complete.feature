@executable @cli @work @work-stream
Feature: Continue takes a new ask, and stop and complete keep the hand-off on record

  WHY. A prototype's wants change between sessions and inside one, and that is normal. A new
  ask is folded in and logged with no change process. A stop must leave the next session
  something to resume from, and every checkpoint is kept in the Log, so the prototype stays
  auditable without phase files or a plan made in advance.

  Background:
    Given an isolated work tree whose stream ends at item 168
    And prototype 169 started on "2026-10-23" with the ask "a CSV importer"

  Rule: R2 · Continue folds a new ask into the wants and reopens the prototype

    Scenario: E5 · a new ask on an active prototype is added and logged
      When "aof work prototype 169 'export to JSON too' --today 2026-10-24" runs
      Then "## Wants" ends with "- 2026-10-24 · export to JSON too"
      And "## Log" ends with "- 2026-10-24 · want added: export to JSON too"
      And the status of 169 is "active"

    Scenario Outline: continuing a stopped prototype reopens it
      Given prototype 169 at status "<status>"
      When "aof work prototype 169 <addition> --today 2026-10-25" runs
      Then the status of 169 is "active"
      And "## Log" holds "- 2026-10-25 · reopened"
      And "## Wants" <wants>

      Examples:
        | example | status    | addition             | wants                                                  |
        | E6      | paused    | "export to JSON too" | ends with "- 2026-10-25 · export to JSON too"          |
        | E7      | done      |                      | is unchanged                                           |
        |         | abandoned |                      | is unchanged                                           |

    Scenario: an active prototype continued with no addition changes nothing on disk
      When "aof work prototype 169" runs
      Then "PROTOTYPE.md" and "STATE.md" are byte-identical to before

    Scenario: E8 · a ref that is not a prototype is refused
      When "aof work prototype 168 'more'" runs
      Then it is refused as "prototype-not-a-prototype"
      And milestone 168 is unchanged

    Scenario: E9 · --log appends one dated line and nothing else
      When "aof work prototype 169 --log 'dropped the PDF want' --today 2026-10-24" runs
      Then "## Log" ends with "- 2026-10-24 · dropped the PDF want"
      And "PROTOTYPE.md" is byte-identical to before
      And the status of 169 is "active"

  Rule: R3 · Stop and complete need a written hand-off, and keep a copy of it in the Log

    Scenario: E10 · a stop with the template's hand-off is refused
      Given "## Hand-off" still holds the template's placeholder
      When "aof work prototype 169 --stop" runs
      Then it is refused as "prototype-handoff-missing"
      And the status of 169 is "active"

    Scenario Outline: a stop or a completion moves the status and quotes the hand-off into the Log
      Given prototype 169 at status "<from>"
      And "## Hand-off" reads "Import works for Monzo CSV. Next: Starling."
      When "aof work prototype 169 <flag> --today 2026-10-26" runs
      Then the status of 169 is "<to>"
      And "## Log" ends with "- 2026-10-26 · <line>" followed by the quoted line "> Import works for Monzo CSV. Next: Starling."
      And "## Hand-off" still reads "Import works for Monzo CSV. Next: Starling."

      Examples:
        | example | from   | flag      | to        | line      |
        | E11     | active | --stop    | paused    | stopped   |
        | E12     | paused | --done    | done      | done      |
        |         | active | --abandon | abandoned | abandoned |

    Scenario: two stops keep both hand-offs in the Log
      Given "## Hand-off" reads "First checkpoint."
      And "aof work prototype 169 --stop --today 2026-10-26" has run
      And "aof work prototype 169 --today 2026-10-27" has run
      And the session replaced "## Hand-off" with "Second checkpoint."
      When "aof work prototype 169 --stop --today 2026-10-27" runs
      Then "## Log" holds the quoted line "> First checkpoint." before the quoted line "> Second checkpoint."

    Scenario Outline: a move a status does not allow is refused
      Given prototype 169 at status "<from>" with a written hand-off
      When "aof work prototype 169 <flag>" runs
      Then it is refused as "status-edge-not-applicable", naming "<legal>"

      Examples:
        | example | from      | flag      | legal  |
        | E13     | abandoned | --abandon | active |
        |         | done      | --stop    | active |

    Scenario: two move flags together are refused
      When "aof work prototype 169 --stop --done" runs
      Then it is refused as "prototype-one-move"
      And the status of 169 is "active"

    Scenario: no line the verb writes carries a time of day
      When "aof work prototype 169 'more'" runs
      Then no line it wrote in "PROTOTYPE.md" or "STATE.md" holds a time of day
      And no run record exists for 169
