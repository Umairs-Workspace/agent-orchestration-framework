@executable @cli @work @work-stream
Feature: A stated target turns the ratio into a verdict — and an absent target invents nothing

  A number with no target is a number nobody acts on. The SPEC asks for the ratio *"with a target,
  because if creation stays high turn after turn, something is changing in your prefix"* — the
  target is what converts an observation into a claim that this milestone worked.

  **The verdict reports; it does not enforce.** No run is failed, capped, retried or killed on a
  missed target. Milestone 69 owns bounds and milestone 71 owns round discipline; 70 makes the
  numbers legible and stops there (ADR-008). A reviewer can refuse any change here that makes the
  loop *act* on this verdict.

  **The target's value is deliberately not fixed at refine.** It wants one measured run under
  70/01's flags to be chosen honestly rather than guessed — recorded as open in STATE. This task
  ships the mechanism, and a configuration that states no target must be a first-class, silent case
  rather than a degraded one.

  ADR-008. Builds on task 00's ratio.

  Scenario: a stated target produces a verdict per phase
    Given a configured cache-ratio target
    And runs recorded across more than one phase
    When the report is produced
    Then each measured phase carries a met-or-missed verdict against that target
    And the target it was judged against is stated in the report

  Scenario: no target means no verdict, not a default one
    Given no configured cache-ratio target
    When the report is produced
    Then the ratio is still reported for each phase
    And no verdict is stated
    And no target is invented

  Scenario: an unmeasured phase gets no verdict
    Given a configured target
    And a phase whose runs carry no spend
    When the report is produced
    Then that phase is reported as unmeasured
    And it is not judged missed

  Scenario: the verdict changes nothing about the run
    Given a phase whose ratio misses the configured target
    When the report is produced
    Then the verdict is recorded in the report
    And no run is failed, retried, capped or killed as a result

  Scenario Outline: verdicts against a stated target
    Given a configured target
    And a phase whose measured ratio is <ratio>
    When the report is produced
    Then the verdict is <verdict>

    Examples: at the target is met — the same strictly-worse convention the doc budgets use
      | ratio                        | verdict    |
      | above the target             | met        |
      | exactly at the target        | met        |
      | below the target             | missed     |
      | zero, with creations recorded| missed     |
      | unmeasured                   | none       |

  Scenario Outline: target configuration that cannot be honoured
    Given a cache-ratio target configured as <input>
    When the report is produced
    Then the outcome is <outcome>

    Examples: a bad target must not take the measurement down with it
      | input                    | outcome                                       |
      | a number in range        | verdicts are stated against it                |
      | not a number             | no verdict, and the ratio is still reported   |
      | a negative number        | no verdict, and the ratio is still reported   |
      | absent entirely          | no verdict, and the ratio is still reported   |
