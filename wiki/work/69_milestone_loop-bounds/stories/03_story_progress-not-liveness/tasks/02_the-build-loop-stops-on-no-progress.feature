@executable @cli @work @work-stream
Feature: The build loop's ceiling is failure to progress, not a round count

  The build loop's stop condition was the one claim in the diagnosis that split on inspection.
  Build *has* a terminator — "until every scenario is green" — and it is correct. What it has never
  had is a FAILURE bound: a rule for the case where the scenarios are not going to become green.

  An arbitrary N is the wrong shape for that. Capping build at five rounds caps correct work that
  happens to need six, and permits five rounds of work that stopped being work after the first. The
  right bound is the derivative: **two consecutive rounds with no reduction in the failing-scenario
  count.** That is Claude Code's own documented workflow pattern — *"or two rounds in a row make no
  progress"* — and it requires picking no arbitrary number at all.

  This is the rule the loop registry's `build-to-green` ceiling points at, which is how it stops
  reading `uncapped`.

  ADR-001, ADR-005.

  Scenario: a build round that reduces the failing count continues
    Given a build round that ends with fewer failing scenarios than it started with
    When the loop decides what to do next
    Then the build continues

  Scenario: one round with no reduction continues
    Given a build round that ends with the same failing count it started with
    When the loop decides what to do next
    Then the build continues

  Scenario: two consecutive rounds with no reduction stop the build
    Given two consecutive build rounds with no reduction in the failing count
    When the loop decides what to do next
    Then the build halts
    And the halt reports the failing count that did not move

  Scenario: a reduction between them clears the count
    Given a round with no reduction followed by a round with a reduction
    When a third round ends with no reduction
    Then the build continues

  Scenario: reaching zero failing scenarios terminates successfully
    Given a build round that ends with no failing scenarios
    When the loop decides what to do next
    Then the build terminates successfully
    And the progress bound was never consulted

  Scenario Outline: the failing-count sequence and what the loop does
    Given a build whose failing counts across rounds were <sequence>
    When the loop decides what to do next
    Then it <action>

    Examples: the derivative, not the count
      | sequence      | action                     |
      | 9, 6, 3       | continues                  |
      | 9, 9          | continues                  |
      | 9, 9, 9       | halts on no progress       |
      | 9, 9, 6, 6    | continues                  |
      | 9, 9, 6, 6, 6 | halts on no progress       |
      | 9, 12, 12     | halts on no progress       |
      | 9, 3, 0       | terminates successfully    |

  Scenario: the registry's declared ceiling names this rule
    Given the build-to-green loop record
    When its ceiling is read
    Then it points at this progress authority
    And it declares no numeric round count of its own
