@executable @cli @work @board
Feature: The tasks projection carries the rule each scenario sits under

  WHY. The board reads a story's tasks through `aof work tasks` and `/api/work/tasks`, and today
  each scenario arrives as a name, an outline flag and a lane. To show rules, the board needs to
  know each scenario's rule (ADR-005 §1). The projection adds the rule's title, taken from the
  parser's `rule` key (story 02), and nothing else from it. Local and remote (cached) tasks
  are projected by the same function, so they arrive shaped the same way.

  Rule: R1 · Each projected scenario names the rule it sits under, or none

    Scenario: E1 · scenarios under two rules carry their rules' titles in file order
      Given a story task whose feature holds rule "R1 · at most five loans" with 2 scenarios and rule "R2 · overdue blocks" with 1 scenario
      When "aof work tasks <story> --json" is run
      Then the task's scenarios carry the rules "R1 · at most five loans", "R1 · at most five loans", "R2 · overdue blocks" in that order

    Scenario: E2 · a scenario outside any rule carries no rule
      Given a story task whose feature holds one scenario before rule "R1 · at most five loans"
      When "aof work tasks <story> --json" is run
      Then the first scenario's rule is null
      And the scenarios after it carry "R1 · at most five loans"

  Rule: R2 · A task without rules is projected as before, plus a null rule

    Scenario: E3 · a feature with no Rule projects every scenario with a null rule
      Given a story task whose feature holds three scenarios and no "Rule:" line
      When "aof work tasks <story> --json" is run
      Then every scenario carries "name", "outline", "lane" and "rule"
      And every scenario's rule is null
      And the per-lane counts are what they were before this story

    Scenario Outline: the projection carries the rule title and nothing else of the rule
      Given a story task whose feature holds a rule tagged "@manual" titled "R2 · overdue blocks"
      When "aof work tasks <story> --json" is run on a <source> task
      Then each scenario in that rule carries exactly the keys "name", "outline", "lane", "rule"
      And its rule is "R2 · overdue blocks"

      Examples:
        | source                        |
        | local                         |
        | remote, read from the cache   |
