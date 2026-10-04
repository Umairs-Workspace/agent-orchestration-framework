@executable @cli @work @validate
Feature: The build is refused while an agreed example is missing from the contract

  WHY. The operator ruled (135/04 Q1, 2026-10-03) that a story whose contract has lost an example
  they agreed to is not built until the example is restored, which is how an unanswered business
  question is already handled. The continue door judges the map with the lane's own function, so
  the door and the doctor cannot disagree (134/ADR-005 §4). The door also reads the story's task
  features, so the trace reaches it.

  Rule: R1 · An example a person agreed appears in the contract, under its own rule

    Scenario: E8 · continue refuses a story whose contract lost a confirmed example
      Given story "7/2" with the gate on, whose map's confirmed "E2" of rule "R1" is anchored
      And its task feature holds "Rule: R1 · …" but no scenario or row carries "E2"
      When "aof work continue 7/2 --json" is run
      Then it is refused with code "examples-question-open" and status 409
      And the refusal's detail lists the "example-untraced" finding naming "E2"
      And no status moved and nothing was dispatched

    Scenario: restoring the example lets the build start
      Given the same story after the scenario "E2 · a sixth loan is refused while five are out" is restored under "Rule: R1 · …"
      When "aof work continue 7/2" is run
      Then the door does not refuse it on its map

    Scenario Outline: the door and the doctor agree on the trace
      Given story "7/2" in the state "<state>"
      When "aof work doctor 7/2 --json" and "aof work continue 7/2 --json" are run
      Then the doctor's error-severity "example-untraced" findings are exactly the ones in the door's refusal detail

      Examples:
        | state                                                     |
        | E2 carried under R1                                       |
        | E2 carried nowhere                                        |
        | E2 carried only under R2                                  |
        | no task names a rule id and E2 is carried nowhere         |

  Rule: R3 · A contract not formulated from the map is held to nothing new

    Scenario: a story with no tasks is never refused on the trace
      Given story "7/2" whose map is answered and anchored, and which has no "tasks/" folder
      When "aof work continue 7/2" is run
      Then the door does not refuse it on its map
