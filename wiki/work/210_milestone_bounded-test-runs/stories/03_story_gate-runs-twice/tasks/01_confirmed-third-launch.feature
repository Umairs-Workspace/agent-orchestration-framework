@cli @work @validate
Feature: a third launch runs only on the operator's recorded confirmation

  WHY. The operator decided that the gate refuses a third launch, that a flag may override it, and
  that the flag's use must be confirmed (210/03 Q1). A flag an agent can type confirms nothing. So
  the override is honoured only when the harness has recorded the operator's answer to a question
  carrying the token `<ref> G<n>`. That is read through the one answer reader the example maps
  already rely on (FF-13401), with `G` added to the token grammar (ADR-007). Each further launch
  needs its own confirmation.

  Rule: R4 · A third launch needs the operator's recorded confirmation

    @executable
    Scenario: E7 · the override without a recorded answer is refused, and prints the question to ask
      Given milestone 17's REGRESSION.md holds two red rows
      And no answer to a "17 G3" question is on record for milestone 17's runs
      When I run "aof work regression-gate 17 --again \"fixed F-03\""
      Then it is refused as "regression-gate-confirmation-missing"
      And it prints the question "17 G3 · Run a third whole-tree gate for milestone 17?" with the affirmative option "Run gate 3"
      And the runner is not launched

    @executable
    Scenario: E8 · a recorded confirmation lets the third launch run, and the row says so
      Given milestone 17's REGRESSION.md holds two red rows
      And the harness recorded the answer "Run gate 3" to "17 G3 · Run a third whole-tree gate for milestone 17?" in a session run on milestone 17
      When I run "aof work regression-gate 17 --again \"fixed F-03\""
      Then the runner is launched once
      And the appended row's detail carries the reason "fixed F-03" and the token "17 G3"

    @executable
    Scenario: E9 · each further launch needs its own confirmation
      Given milestone 17's REGRESSION.md holds two red rows and a third red row launched on "17 G3"
      And the only answer on record is "Run gate 3" to "17 G3"
      When I run "aof work regression-gate 17 --again \"retry\""
      Then it is refused as "regression-gate-confirmation-missing", printing the question "17 G4 · Run a fourth whole-tree gate for milestone 17?"
      And the runner is not launched

    @executable
    Scenario Outline: only the right answer to the right token confirms
      Given milestone 17's REGRESSION.md holds <rows>
      And the only answer on record is <answer>
      When I run "aof work regression-gate 17 --again \"retry\""
      Then <outcome>

      Examples:
        | rows                                      | answer                                    | outcome                                                    |
        | two red rows                              | "Run gate 3" to "17 G3"                   | the runner is launched                                     |
        | two red rows                              | "Don't run it" to "17 G3"                 | it is refused as "regression-gate-confirmation-missing"    |
        | two red rows                              | "Run gate 3" to "18 G3"                   | it is refused as "regression-gate-confirmation-missing"    |
        | two red rows and a third red row from 17 G3 | "Run gate 3" to "17 G3"                 | it is refused as "regression-gate-confirmation-missing"    |
        | two red rows and a third red row from 17 G3 | "Run gate 4" to "17 G4"                 | the runner is launched                                     |

    @executable
    Scenario: the override is only an override
      Given milestone 17's REGRESSION.md holds one red row
      When I run "aof work regression-gate 17 --again \"early\""
      Then the runner is launched as an ordinary second launch, and no confirmation is asked for

    @executable
    Scenario: an answer the agent writes into a file confirms nothing
      Given milestone 17's REGRESSION.md holds two red rows
      And "17 G3 · Run gate 3" is written in milestone 17's STATE.md but no harness answer is on record
      When I run "aof work regression-gate 17 --again \"retry\""
      Then it is refused as "regression-gate-confirmation-missing"

    @executable
    Scenario Outline: the token grammar reads the gate kind beside examples and questions
      When the map token reader reads <text>
      Then it answers <token>

      Examples:
        | text                                               | token            |
        | "17 G3 · Run a third whole-tree gate?"             | ref 17, id G3    |
        | "17/02 Q1 · Does a reserved book count?"           | ref 17/02, id Q1 |
        | "17 G0 · Run gate 0?"                              | none             |
        | "17 X3 · Something else"                           | none             |
