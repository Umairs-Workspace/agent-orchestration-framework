@bug @cli @work @executable
Feature: Declined stories return to continue

  Scenario: A blocker handback resumes development without rebuilding genuine review work
    Given verify has recorded a blocker and returned its story to in-progress
    When the same loop or a restarted loop selects the next phase
    Then it drives continue within the existing attempt cap
    And a story still in-review goes to its review gate
