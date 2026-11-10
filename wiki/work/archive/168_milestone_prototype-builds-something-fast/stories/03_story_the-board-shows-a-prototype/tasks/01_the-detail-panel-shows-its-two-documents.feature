@executable @ui @work @board
Feature: Opening a prototype card shows its own two documents

  WHY. A prototype's wants and its hand-off are what an operator looks for, and both should be
  readable from the board. Today a non-milestone driver's card opens on a SPEC tab it does not
  have, and the board's document reader knows no `PROTOTYPE.md`.

  Rule: R4 · Opening a prototype card shows its own two documents

    Scenario: E8 · a prototype card opens on PROTOTYPE.md, with a STATE tab and nothing else
      Given the board's items hold prototype 169 at "active"
      When its detail panel's tabs are listed
      Then they are "PROTOTYPE" then "STATE"
      And the tab it opens on is "PROTOTYPE"

    Scenario Outline: E9 · the document reader answers a prototype's two documents
      Given an isolated work tree holding prototype 169 with "PROTOTYPE.md" and "STATE.md"
      When the board asks for 169's "<doc>" document
      Then it answers present with the text of "<file>"

      Examples:
        | doc       | file         |
        | PROTOTYPE | PROTOTYPE.md |
        | STATE     | STATE.md     |

    Scenario: a folder with no PROTOTYPE.md answers not present
      Given an isolated work tree holding milestone 168 with no "PROTOTYPE.md"
      When the board asks for 168's "PROTOTYPE" document
      Then it answers present false

    Scenario Outline: the other types keep their tabs
      Given the board's items hold a <type> item
      When its detail panel's tabs are listed
      Then they are <tabs>

      Examples:
        | type      | tabs                                                                   |
        | milestone | "SPEC", "ARCHITECTURE", "VERIFICATION", "RETROSPECTIVE", "RUNS", "FINDINGS" |
        | story     | "STORY", "TASKS", "RUNS"                                               |
        | uat       | "FINDINGS"                                                             |
