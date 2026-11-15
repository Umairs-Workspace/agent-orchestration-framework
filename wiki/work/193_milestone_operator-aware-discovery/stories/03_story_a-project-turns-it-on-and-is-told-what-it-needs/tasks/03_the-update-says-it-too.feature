@executable @cli @work @distribution
Feature: `aof work update` says it too

  WHY. A warning only the doctor shows has to be remembered before it helps. The update is the one
  command a project runs to render what it turned on, so it ends with the same line (ADR-006 §5),
  from the same function, as it does for the test layout (190/ADR-008 §5). The cases run
  `work:update` in a scratch repo under an isolated `AOF_GLOBAL_HOME`. "On" below means
  `work.examples` is `{ enabled: true, operatorAware: true }`.

  Rule: R3 · A project that turned it on hears once that no profile is declared

    Scenario: E10 · the update ends with the doctor's line
      Given operator-aware discovery is on and no profile is declared
      When "aof work update" runs
      Then after the "Updated ACD:" line it prints one "operator-profile-undeclared" line
      And the line names "aof work init-config --operator-role"

    Scenario: the update and the doctor say the same thing
      Given operator-aware discovery is on and no profile is declared
      When "aof work update --json" and "aof work doctor --json" run
      Then the update's "operatorProfile" warning has the doctor finding's code and message

    Scenario: the dry run prints the same line and writes nothing
      Given operator-aware discovery is on and no profile is declared
      When "aof work update --dry-run" runs
      Then it prints the "operator-profile-undeclared" line
      And no file is written

    Scenario Outline: nothing to say prints nothing
      Given <state>
      When "aof work update --json" runs
      Then "operatorProfile" is an empty list, and no output line names "operator-profile-"

      Examples:
        | state                                                                  |
        | discovery is on, the switch is off, and no profile is declared         |
        | "work.examples" is absent                                              |
        | operator-aware discovery is on and the project declares a role         |
        | operator-aware discovery is on and only the global config declares a role |

    Scenario: the line follows the test-layout lines, and neither hides the other
      Given a project that owes a "test-layout-suites" warning and has operator-aware discovery on with no profile
      When "aof work update" runs
      Then it prints both the "test-layout-suites" line and the "operator-profile-undeclared" line
