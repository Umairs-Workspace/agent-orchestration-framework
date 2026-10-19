@executable @cli @work @distribution
Feature: aof work questions ships its /aof:questions wrapper

  WHY. A `work:*` verb is not done until its slash command reaches a repo through `aof work update`:
  an operator inside a Claude Code session should read the loop's questions without leaving it.
  The wrapper runs the verb and prints its rows; it answers nothing itself.

  Scenario: the bundle carries a questions wrapper that runs the verb
    Given the core bundle's commands directory
    When "questions.md" is read
    Then its process runs "aof work questions"
    And it names "--all" and "--json"
    And it writes no file and answers no question

  Scenario: aof work update renders the wrapper into a repo
    Given a fixture repo initialised with "aof work init"
    When "aof work update" is run
    Then ".claude/commands/aof/questions.md" exists and matches the bundle's "questions.md" body

  Scenario: the registry, the CLI route and the bundle agree on the new verb
    Given the command registry
    When the work command bijection and route coverage checks run
    Then "work:questions" has a CLI adapter reachable as "aof work questions"
    And "aof work questions --json" runs cleanly on a fixture stream and emits parseable JSON
    And the learning-edge classification names "questions.md" as a read that cuts nothing
