@executable @cli @work @validate
Feature: A scenario reports the Examples rows it carries

  A Scenario Outline without its Examples table is a sentence with a blank in it. The rows are the
  acceptance criteria — each one a case someone decided this system had to handle — and the parser
  that everything else in this repository reads features through currently throws them away.

  Reporting them is a small addition with a precise shape. Each Examples block contributes its
  caption, the line it opened on, and the number of DATA rows beneath it — the column-header row
  names the columns and is not a case. A scenario may carry more than one Examples block, and the
  order they appear in is the order they are reported in, because a counter comparing two versions of
  a file needs to compare like with like.

  ADR-005. FF-5704.

  Scenario: an outline reports its rows
    Given a scenario outline with an examples table of three data rows
    When the feature is parsed
    Then the scenario reports one examples block
    And that block reports three rows

  Scenario: the column-header row is not counted as a case
    Given a scenario outline whose examples table has a header row and two data rows
    When the feature is parsed
    Then the block reports two rows

  Scenario: the caption and the line are reported
    Given a scenario outline whose examples table carries a caption
    When the feature is parsed
    Then the block reports that caption
    And it reports the line the caption opened on

  Scenario: several examples blocks are reported in order
    Given a scenario outline with two examples tables
    When the feature is parsed
    Then the scenario reports two examples blocks
    And they are in the order they appear in the file

  Scenario: an outline with no examples table reports an empty list
    Given a scenario outline with no examples table
    When the feature is parsed
    Then the scenario reports no examples blocks
    And the value is a list rather than an absence

  Scenario: a plain scenario reports an empty list
    Given a scenario that is not an outline
    When the feature is parsed
    Then the scenario reports no examples blocks

  Scenario: a table inside a docstring is not an examples table
    Given a scenario whose docstring contains pipe-delimited lines
    When the feature is parsed
    Then those lines contribute no rows

  Scenario: a commented row is not counted
    Given a scenario outline whose examples table has a commented-out row
    When the feature is parsed
    Then that row is not counted

  Scenario Outline: what contributes a row
    Given a scenario outline whose examples table contains <line>
    When the feature is parsed
    Then it <outcome>

    Examples: only data rows are cases
      | line                | outcome        |
      | the header row      | is not counted |
      | a data row          | is counted     |
      | a blank line        | is not counted |
      | a commented line    | is not counted |
      | a second data row   | is counted     |
