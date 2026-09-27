@executable @cli @work @validate
Feature: A loss costs a run half its wealth, and only the budget can end it

  Two ways of handling a loss both look like rigour and both are wrong. Resetting the run throws away
  every pair already paid for. Killing the proposal on its first loss drives the rate at which
  anything ever commits towards zero, which rebuilds the off switch this milestone exists to refuse —
  and truncating so early that no crossing remains reachable after a loss is that same kill with a
  delay, which is why the budget runs to eleven pairs rather than eight.

  So a loss multiplies. Wealth carries as the product of every pair so far, and the recovery it leaves
  open is a real one: ten favourable against that one unfavourable pair crosses at eleven pairs, and
  eleven pairs is what the budget funds.

  The distinction worth arguing is that a proposal can still be killed — not by a loss, but by
  arithmetic. Once two pairs are lost the earliest crossing lies beyond the budget, and nothing
  reachable inside it crosses. That state is its own name. Reporting it as short of evidence would be
  the machine lying about its own evidence, because no amount of further evidence can reach it.

  ADR-001 §1a, §2a, §3, §3a. ADR-010 §2a. FF-6101.

  Scenario Outline: what a record of wins and losses does under the day-one budget
    Given a criterion whose commit level is 20, whose bet multiplies a win by 1.5, and whose budget is 11
    And a run of <wins> favourable pairs and <losses> unfavourable pairs
    When the run is evaluated
    Then the attained wealth is approximately <wealth>
    And whether it commits is <commits>
    And if it does not commit its reported state is <state>

    Examples:
      | wins | losses | wealth | commits | state             |
      | 8    | 0      | 25.63  | yes     | —                 |
      | 7    | 1      | 8.54   | no      | evidence-short    |
      | 8    | 1      | 12.81  | no      | evidence-short    |
      | 9    | 1      | 19.22  | no      | evidence-short    |
      | 10   | 1      | 28.83  | yes     | —                 |
      | 0    | 1      | 0.50   | no      | evidence-short    |
      | 5    | 2      | 1.90   | no      | budget-exhausted  |
      | 0    | 2      | 0.25   | no      | budget-exhausted  |
      | 9    | 2      | 9.61   | no      | budget-exhausted  |

  Scenario: a loss leaves the pairs already won in place
    Given a run of four favourable pairs
    When an unfavourable pair is recorded
    Then the run still reports four favourable pairs
    And its wealth is reported as a positive value rather than as nothing

  Scenario: a proposal one loss down is told exactly what would rescue it
    Given a proposal whose record is eight favourable pairs against one unfavourable pair
    When the acceptor reports
    Then it reports the record as eight against one
    And it reports the attained wealth against the commit level
    And it names ten favourable against one as the next record that would cross, at eleven pairs
    And it reports how many pairs of the budget remain

  Scenario: a proposal the budget can no longer rescue says so by name
    Given a proposal whose record is five favourable pairs against two unfavourable pairs
    And a criterion whose budget is eleven pairs
    When the acceptor reports
    Then the proposal is reported as budget-exhausted
    And it names eleven favourable against two as the record that would have crossed, at thirteen pairs
    And it names the budget that ran out
    And it is not reported as short of evidence

  Scenario: short of evidence and out of budget are never interchangeable
    Given one proposal still able to reach a crossing inside its budget
    And one proposal for which no reachable record crosses
    When both are reported
    Then the two carry different states
    And neither is reported under the other's state

  Scenario: a losing proposal is still a proposal
    Given a proposal that has recorded an unfavourable pair
    When the acceptor reports
    Then the proposal is listed with its ledger
    And it is not reported as dropped

  Scenario: the order pairs arrived in does not change what they attained
    Given two runs holding the same favourable and unfavourable pairs in different orders
    When both are evaluated
    Then both attain the same wealth
    And each reports its own sequence in the order that sequence was recorded

  Scenario: a run that has lost every pair is reported, not deleted
    Given a run of ten unfavourable pairs and no favourable pair
    When it is evaluated
    Then its wealth is reported as a positive value below the commit level
    And it is reported as budget-exhausted
    And it is still listed rather than dropped

  Scenario: nothing recorded is not the same as everything lost
    Given a proposal with no pairs recorded at all
    When it is evaluated
    Then its wealth is reported as the level it started from
    And it is distinguished from a proposal that has recorded losses
