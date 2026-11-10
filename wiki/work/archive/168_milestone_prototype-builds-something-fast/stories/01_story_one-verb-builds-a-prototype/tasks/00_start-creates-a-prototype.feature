@executable @cli @work @scaffold
Feature: Start creates a prototype from the ask, through the one number mint

  WHY. "Build me X" has to become a work item in one step, with no refine and no position to
  choose. The number still comes from the one mint every top-level item uses, so a prototype
  can never collide with or reorder the governed stream.

  Background:
    Given an isolated work tree whose stream ends at item 168
    And the prototype templates are installed under ".aof/templates/work/prototype"

  Rule: R1 · Start creates the prototype from the ask, through the one number mint

    Scenario: E1 · the ask becomes the intent, the first want and the first log line
      When "aof work prototype 'a CSV importer for bank statements' --today 2026-10-23" runs
      Then the folder "169_prototype_csv-importer-for-bank-statements" exists at the root of the work tree
      And its "PROTOTYPE.md" has status "active", number 169 and created "2026-10-23"
      And its "## Intent" reads "a CSV importer for bank statements"
      And its "## Wants" holds the one line "- 2026-10-23 · a CSV importer for bank statements"
      And its "STATE.md" "## Log" holds the one line "- 2026-10-23 · started"
      And no "backlog" folder is left behind

    Scenario: E2 · --slug names the folder
      When "aof work prototype 'a CSV importer for bank statements' --slug importer" runs
      Then the folder "169_prototype_importer" exists at the root of the work tree

    Scenario Outline: the slug is made from the ask
      When "aof work prototype '<ask>'" runs
      Then the folder "169_prototype_<slug>" exists at the root of the work tree

      Examples:
        | ask                                                 | slug                               |
        | Build me a CSV importer                             | csv-importer                       |
        | the Kanban board, with drag & drop!                 | kanban-board-with-drag-drop        |
        | a tool that reads bank statements and sorts them by | tool-that-reads-bank-statements-and |

    Scenario Outline: an argument that is not an ask is refused, and nothing is written
      Given <state>
      When "aof work prototype <arg>" runs
      Then it is refused as "<code>"
      And the work tree is unchanged

      Examples:
        | example | state                                              | arg                 | code                      |
        | E3      | no item 999 exists                                 | 999                 | prototype-ref-unknown     |
        | E4      | a backlog leaf "prototype_csv-importer" exists     | "a CSV importer"    | insert-backlog-exists     |
        |         | nothing else                                       | "!!!"               | insert-invalid-slug       |

    Scenario: start mints through the one mint and opens no slot
      Given milestone 168 and an archived item 52
      When "aof work prototype 'a CSV importer'" runs
      Then the new prototype is number 169
      And no existing item was renumbered
