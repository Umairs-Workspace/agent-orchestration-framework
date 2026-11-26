@cli @work @validate
Feature: a milestone's gate launches the whole tree at most twice, then hands over

  WHY. At 209 the gate ran three times at about fifty minutes each. Each red meant fix, commit and
  another whole run, and the operator stopped the third. The whole tree runs once as the gate, and
  once more to confirm the fixes. After that the milestone goes to a person (ADR-007). The count is
  read from the milestone's own REGRESSION.md rows, before anything is launched. The cases drive
  the gate through the regression-gate fixture with a stub runner that records every launch.

  Rule: R1 · A milestone's gate launches the whole tree at most twice

    @executable
    Scenario Outline: the third launch is refused before anything runs
      Given milestone 17's REGRESSION.md holds <rows>
      When I run "aof work regression-gate 17 --json"
      Then <outcome>

      Examples:
        | rows                                 | outcome                                                                      |
        | no rows                              | the runner is launched once and one row is appended                          |
        | one red row                          | the runner is launched once and a second row is appended                     |
        | one green row                        | the runner is launched once and a second row is appended                     |
        | two red rows                         | it is refused as "regression-gate-runs-spent" and the runner is not launched |
        | one red row and one green row        | it is refused as "regression-gate-runs-spent" and the runner is not launched |

    @executable
    Scenario: E3 · the refusal names both rows and the hand-over
      Given milestone 17's REGRESSION.md holds two red rows, at commits "aaaa111" and "bbbb222"
      When I run "aof work regression-gate 17"
      Then the refusal names both commits and their results
      And it says to hand over: a blocker in milestone 17's STATE.md, or in a driven session the loop's question
      And it names "aof test --failed" for the confirming run's new reds

  Rule: R2 · Rows that are not a new whole-tree launch do not count

    @executable
    Scenario: E4 · a resume finishes a counted run rather than starting one
      Given milestone 17's REGRESSION.md holds one red row, then one not-finished row
      When I run "aof work regression-gate 17 --resume"
      Then the runner is launched for the not-finished row's remaining units
      And afterwards milestone 17 has used both of its launches

    @executable
    Scenario: E5 · an override row opens no launch
      Given milestone 17's REGRESSION.md holds two red rows and an "override" row
      When I run "aof work regression-gate 17"
      Then it is refused as "regression-gate-runs-spent" and the runner is not launched

    @executable
    Scenario: the count is per milestone
      Given milestone 17's REGRESSION.md holds two red rows and milestone 18 has none
      When I run "aof work regression-gate 18"
      Then the runner is launched once
