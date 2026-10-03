@executable @cli @work @validate
Feature: Example is read as a scenario, and an Examples row keeps its cells

  WHY. Gherkin 6 added `Example:` alongside `Rule:` as a synonym for `Scenario:`. Today the parser
  does not admit it, and in the measured probe an `Example:` after a `Background:` produced no
  scenario and no finding (RESEARCH R3). That is a scenario falling out of a contract silently, which
  is the failure this milestone exists to stop. An Examples block also reports only its row count
  (RESEARCH R4), so no reader can find a row by what it holds. ADR-003 §3 and §4 add both, under new
  keys only.

  Scenario Outline: an Example line is a scenario wherever a Scenario line would be
    Given a task feature with "<position>" holding "Example: E4 · a loan a day overdue blocks the next" and three steps
    When it is parsed
    Then it reports a scenario named "E4 · a loan a day overdue blocks the next" that is not an outline
    And the scenario takes its lane from the tags in scope
    And it reports no structural finding

    Examples:
      | position                              |
      | at feature level                      |
      | under a Rule                          |
      | under a Rule, after a Background      |
      | at feature level, after a Background  |

  Scenario: an Example's steps are no longer read as the Background's
    Given a rule with a one-step Background followed by an "Example:" with three steps
    When it is parsed
    Then the Example reports its own name and line
    And the rule holds exactly the Example as its scenario

  Scenario: an Examples block reports its column names and every row's cells
    Given an outline whose Examples table is
      """
      | example | held | outcome |
      | E1      | 4    | issued  |
      |         | 0    | issued  |
      """
    When it is parsed
    Then the block's columns are "example", "held", "outcome"
    And its cells are ["E1", "4", "issued"] then ["", "0", "issued"]
    And its row count is 2

  Scenario Outline: cells are trimmed and an empty cell is kept
    Given an Examples row written "<row>" under the header "| a | b |"
    When it is parsed
    Then the row's cells are <cells>

    Examples:
      | row                | cells          |
      | \| x \| y \|       | ["x", "y"]     |
      | \|x\|y\|           | ["x", "y"]     |
      | \|  \| y \|        | ["", "y"]      |

  Scenario: an Examples block with only a header has columns and no cells
    Given an outline whose Examples table holds only the row "| example | held |"
    When it is parsed
    Then the block's columns are "example", "held"
    And it has no cells and a row count of 0
