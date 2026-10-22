@executable @cli @work @design
Feature: On a prototype, `aof diagram plan` and `export` take a diagram name, and a drawn diagram can be redrawn

  WHY. A prototype has no ADRs to hang a picture on, so its briefs live under `## Diagrams` in
  `PROTOTYPE.md`, one `### <name>` each. Its wants change, so unlike a delivered ADR's picture a
  prototype's diagram is replaced when it is redrawn, and only the current picture is kept.

  Background:
    Given an isolated project with diagrams enabled and the generator available
    And prototype 169 whose "## Diagrams" holds a "### data-flow" brief "statement rows flow into the ledger"

  Rule: R1 · On a prototype, a diagram's subject is its name, and its brief is the prose under `### <name>`

    Scenario: E1 · a named brief plans into the prototype's diagrams folder
      When "aof diagram plan 169 data-flow --json" runs
      Then it answers available with the brief "statement rows flow into the ledger"
      And its paths are "diagrams/data-flow.html", "diagrams/data-flow.svg" and "diagrams/data-flow.png" under 169's folder

    Scenario Outline: a subject that is not one of the prototype's briefs is refused
      When "aof diagram plan 169 <subject> --json" runs
      Then it is refused as "<code>", naming <named>

      Examples:
        | example | subject | code                 | named                          |
        | E2      | screens | diagram-name-unknown | the heading "### screens"      |
        | E3      | ADR-001 | diagram-slug-invalid | the lowercase name it expects  |

    Scenario: a brief heading with no prose under it is refused
      Given prototype 169 also holds a "### empty" heading with nothing under it
      When "aof diagram plan 169 empty --json" runs
      Then it is refused as "diagram-brief-missing"

    Scenario: E4 · the ADR path on a milestone is unchanged
      Given milestone 168 whose ARCHITECTURE.md holds "## ADR-001" with a "### Diagram" brief
      When "aof diagram plan 168 ADR-001 --slug layout --json" runs
      Then its paths are "diagrams/ADR-001-layout.html", "diagrams/ADR-001-layout.svg" and "diagrams/ADR-001-layout.png" under 168's folder

    Scenario: --slug is refused on a prototype
      When "aof diagram plan 169 data-flow --slug other --json" runs
      Then it is refused as "diagram-slug-not-applicable"

  Rule: R3 · A prototype diagram can be redrawn after it is drawn

    Scenario Outline: E8 · a drawn diagram plans again, whatever the prototype's status
      Given "diagrams/data-flow.svg" already exists under 169's folder
      And prototype 169 at status "<status>"
      When "aof diagram plan 169 data-flow --json" runs
      Then it answers available with the brief "statement rows flow into the ledger"

      Examples:
        | status |
        | active |
        | done   |

    Scenario: E9 · export answers a block for the prototype's diagram
      Given "diagrams/data-flow.html" was drawn under 169's folder
      When "aof diagram export 169 data-flow --json" runs
      Then it writes "diagrams/data-flow.svg" and "diagrams/data-flow.png"
      And its block is an image of "diagrams/data-flow.svg" titled "data-flow" with links to the source and the PNG

    Scenario: E10 · a redraw replaces the picture and keeps no copy
      Given "diagrams/data-flow.html", ".svg" and ".png" were drawn and exported under 169's folder
      And "diagrams/data-flow.html" was drawn again
      When "aof diagram export 169 data-flow --json" runs
      Then 169's "diagrams" folder holds exactly "data-flow.html", "data-flow.svg" and "data-flow.png"
      And "data-flow.svg" is the export of the new drawing
