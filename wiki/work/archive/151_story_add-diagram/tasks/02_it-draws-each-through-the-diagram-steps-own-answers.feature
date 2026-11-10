@cli @work @design
Feature: /aof:add-diagram draws each ADR through the diagram step's own answers

  WHY. The command re-runs refine's diagram step and nothing more: "aof diagram plan <ref> <ADR-NNN>
  --slug <slug> --json", the session follows the answer's instructions, then "aof diagram export <ref>
  <ADR-NNN> --json" and the returned block is pasted under the brief. aof never edits ARCHITECTURE.md;
  the session does. Every answer the step already gives keeps its meaning here. The slug is the ADR
  title in kebab case (EXAMPLES Q4), and nothing is committed (Q6).

  Rule: R3 · The diagram step's own answers stand

    @executable
    Scenario: the command plans, follows the instructions, exports, then pastes
      When the command's prose is read
      Then it runs "aof diagram plan <ref> <ADR-NNN> --slug <slug> --json" for each ADR
      And it follows the answer's "instructions" after the plan and before the export
      And it runs "aof diagram export <ref> <ADR-NNN> --json" and pastes the returned "block" under the ADR's brief
      And it says aof never edits "ARCHITECTURE.md" and never commits what was drawn

    @executable
    Scenario Outline: an answer that draws nothing is reported, never a failure
      When the command's prose is read
      Then on <answer> it reports <report> and <then>

      Examples:
        | example | answer                                   | report                                      | then                        |
        | E7      | "enabled: false"                         | the answer's reason                         | writes nothing and stops    |
        | E8      | "available: false"                       | the answer's "code" and "fix"               | keeps every brief and stops |
        | E9      | a refusal coded "diagram-item-delivered" | that a delivered ADR's diagram is immutable | writes nothing and stops    |

    @executable
    Scenario: E10 · a missing PNG still pastes the block
      When the command's prose is read
      Then on an export answer whose "png" is not ok it still pastes the returned "block"
      And it reports the PNG's "code" and "fix", and that "aof work doctor" stays red until a node with a browser exports it

  @manual
  Scenario: an undrawn brief and a named ADR are drawn end to end
    Given the payload is installed and a scratch project with diagrams on holds one open milestone
    And its ARCHITECTURE.md has ADR-001 with a "### Diagram" brief and no diagram, and ADR-002 with no brief
    When "/aof:add-diagram <ref>" is run in a Claude Code session, then "/aof:add-diagram <ref> ADR-002"
    Then the milestone's "diagrams/" folder holds an "ADR-001-" and an "ADR-002-" source, SVG and PNG
    And each ADR's section carries its pasted block, and ADR-002 its new brief above it
    And "aof work doctor <ref> --json" reports no "diagram-*" finding
    And a third run "/aof:add-diagram <ref>" reports nothing to draw and changes no file
