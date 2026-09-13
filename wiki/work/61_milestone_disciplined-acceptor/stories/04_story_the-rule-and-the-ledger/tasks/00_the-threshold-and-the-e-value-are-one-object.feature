@executable @cli @work @validate
Feature: The records that commit are derived from the criterion, and eight is only the top row

  The commit condition has one leg: the wealth clears the commit level. It is tested after every pair
  and the run is truncated at a declared pair budget. What the criterion derives is therefore not a
  single pair count but the whole set of earliest crossing records — one for a clean run, one for a
  run that has lost a pair, one for a run that has lost two.

  Eight is the top row of that set: the earliest crossing any path can reach. That is why a run
  committing at eight pairs is necessarily unbroken, and why a seven-and-one record is not a near miss
  but a different row. The distinction worth arguing is that "all favourable" describes the top row
  and is not a second condition — a machine that enforces it as one promises a recovery at eleven
  pairs that it could never grant.

  The budget is the one number here that is chosen rather than derived, which is why it is declared,
  checked against the earliest crossing, and frozen: extending a budget mid-flight to reach for a
  crossing is optional stopping in the budget dimension.

  ADR-001 §1, §1a, §2, §2a, §6. FF-6101.

  Scenario Outline: the crossing records follow the criterion's own inputs
    Given a criterion declaring a confidence level of <confidence> and a bet size of <bet>
    When the records at which a run would commit are derived
    Then the commit level is <level>
    And a favourable pair multiplies the wealth by <multiplier>
    And the earliest crossing is <clean> at <cn> pairs
    And the earliest crossing after one unfavourable pair is <lost> at <ln> pairs

    Examples:
      | confidence | bet  | level | multiplier | clean | cn | lost | ln |
      | 0.05       | 0.5  | 20    | 1.5        | 8-0   | 8  | 10-1 | 11 |
      | 0.05       | 0.25 | 20    | 1.25       | 14-0  | 14 | 15-1 | 16 |
      | 0.05       | 0.75 | 20    | 1.75       | 6-0   | 6  | 8-1  | 9  |
      | 0.01       | 0.5  | 100   | 1.5        | 12-0  | 12 | 14-1 | 15 |
      | 0.10       | 0.5  | 10    | 1.5        | 6-0   | 6  | 8-1  | 9  |

  Scenario: the shipped criterion crosses at eight, then not again until eleven
    Given a criterion whose confidence level is 0.05 and whose bet size is 0.5
    When the records at which a run would commit are derived
    Then the earliest crossing is eight favourable pairs and no unfavourable pair
    And no record of nine pairs crosses
    And no record of ten pairs crosses
    And the next crossing is ten favourable against one unfavourable pair, at eleven pairs

  Scenario: revising the bet moves the whole set of crossings
    Given a criterion whose crossing records have been derived
    When its bet size is revised and the records are derived again
    Then the earliest crossing falls at a different number of pairs than before
    And the earliest crossing after one unfavourable pair changes with it

  Scenario: a record that clears the commit level commits whatever its shape
    Given a run of ten favourable pairs and one unfavourable pair under the shipped criterion
    When the commit condition is evaluated
    Then it commits
    And no condition beyond the commit level is applied to it

  Scenario: the wealth is tested after every pair, not only at the earliest crossing
    Given a run that reaches the commit level at its eleventh pair
    When the run is evaluated pair by pair
    Then it commits at the pair that carried it over the commit level
    And it is not held back until any fixed number of pairs has been reached

  Scenario: every derived crossing clears the level it was derived from
    Given the shipped criterion
    When its crossing records are derived
    Then each of them attains at least the commit level
    And the earliest attains approximately 25.63 at eight pairs
    And the next attains approximately 28.83 at eleven pairs

  Scenario: the budget is declared, and a budget below the earliest crossing is refused
    Given a criterion whose declared pair budget is smaller than its earliest crossing
    When it is constructed
    Then it is refused
    And the refusal names the declared budget and the earliest crossing it falls below

  Scenario: a run may take as many pairs as the budget declares and no more
    Given a criterion declaring a pair budget of eleven
    When a run is evaluated
    Then it may be evaluated over up to eleven pairs
    And no twelfth pair is admitted to it

  Scenario Outline: what a ledger of that size can say at all
    Given a proposal whose ledger holds <held> all-favourable pairs and no unfavourable pair
    When the ruling is rendered
    Then it reports <reading>

    Examples:
      | held | reading                                                       |
      | 4    | that no test in the family could commit on this, ever         |
      | 5    | that this is sufficient only under a maximally aggressive bet |
      | 7    | that this is sufficient only under a maximally aggressive bet |
      | 8    | that the shipped bet's commit level is cleared                |
