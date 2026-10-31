@bug @cli @work @executable
Feature: Unusable rubric commands fail preflight

  Scenario: An unusable rubric is reported before any session starts
    Given a declared rubric has a missing or invalid command
    When doctor or loop preflight runs
    Then it names work.rubric.command as unusable
    And the loop starts no session
    And grade still reports runner-spawn-failed
