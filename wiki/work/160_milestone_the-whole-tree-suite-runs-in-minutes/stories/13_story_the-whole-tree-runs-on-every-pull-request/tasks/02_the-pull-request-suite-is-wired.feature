Feature: The pull request suite is wired, and the control node keeps no budget
  The test workflow runs the shards and then the summary on every pull request, with the 10-minute
  budget. The control node's gate declares no budget of its own: it is the correctness gate, and the
  budget is the pull request suite's. This supersedes two delivered assertions, whose tests now hold
  the new state: 160/05's "this repository declares a 10-minute budget" and site-build/00's "no third
  workflow is added".

  @executable @cli @work @work-stream
  Scenario: The workflow runs the shards, then the summary, on every pull request
    Given the repository's test workflow
    Then it runs on a pull request to main and on a push to main
    And a matrix of shards each run one shard of the plan and upload its report
    And the summary job needs every shard, runs even when one fails, and judges them with a 10-minute budget

  @executable @cli @work @work-stream
  Scenario: The regression gate runs on a runner, unchanged, and its row comes home
    Given the repository's gate workflow
    Then a push of a branch gate/<ref> starts it
    And it runs aof work regression-gate for that ref on a clean, full-history checkout
    And it uploads the REGRESSION.md the gate wrote, whether the row is green or red
    And the CLI's gate command reads nothing from CI

  @executable @cli @work @work-stream
  Scenario: The control node's gate declares no budget
    Given this repository's configuration
    Then its gate declares no budgetMinutes
    And it still declares how a budget would reach the runner

  @executable @cli @work @work-stream
  Scenario: The pull request suite publishes and releases nothing
    Given the repository's workflows
    Then the test workflow carries neither the publishing path nor the release path
