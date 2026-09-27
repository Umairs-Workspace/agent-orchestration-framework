@executable @cli @work @validate
Feature: What is being compared is declared, must resolve, and says when it could not look

  The metric decides the tie rate, the tie rate decides the price of every trial, and the spread
  across plausible metrics is tenfold. A machinery that names its own metric hides that choice where
  nobody can revise it, and makes the price of the choice invisible. So the criterion declares the
  metric, and declares a counter-metric beside it: fewer rounds bought by accepting worse work is not
  an improvement, and a criterion that cannot tell those apart is refused before it can rule.

  Both declarations are pointers, and a pointer that resolves to nothing is a criterion that would
  rule on a comparison nobody can perform. That is refused when the criterion is built, not discovered
  at the moment a ruling was due.

  The distinction worth arguing is the third outcome. An arm nobody can measure is neither a tie nor a
  favourable pair: calling it a tie discards evidence that was never gathered, and calling it
  favourable fabricates it. Today every arm is unmeasurable, and the machinery must say exactly that
  rather than report zero pairs as though it had looked.

  ADR-002 §2, §5, §6. FF-6102.

  Scenario Outline: a criterion whose declarations do not hold up is refused when it is built
    Given a criterion that <defect>
    When it is constructed
    Then it is refused
    And the refusal names <named>
    And no criterion is produced

    Examples:
      | defect                                             | named                        |
      | declares a metric that resolves to nothing         | the metric it could not find |
      | declares a metric and no counter-metric at all     | the missing counter-metric   |
      | declares a counter-metric that resolves to nothing | the counter-metric it could not find |

  Scenario Outline: how a pair of arm readings is counted
    Given an arm whose reading is <a> and an arm whose reading is <b>
    When the pair is counted
    Then it is counted as <counted>

    Examples:
      | a               | b               | counted                                  |
      | measured better | measured worse  | a favourable pair                        |
      | measured worse  | measured better | an unfavourable pair                     |
      | measured equal  | measured equal  | a tie, and discarded                     |
      | unmeasurable    | measured        | unmeasurable, in neither total           |
      | measured        | unmeasurable    | unmeasurable, in neither total           |
      | unmeasurable    | unmeasurable    | unmeasurable, in neither total           |

  Scenario: an unmeasurable pair moves nothing
    Given a run whose recorded pairs are all unmeasurable
    When it is evaluated
    Then its wealth is unchanged from what it held before them
    And its favourable total and its tie total are both zero
    And the unmeasurable pairs are reported with their own count

  Scenario: a population that cannot be measured is reported as such, not as zero evidence
    Given recorded runs none of which carries the attribution the declared metric needs
    When the acceptor reports
    Then it reports every arm as unmeasurable
    And it names the reading it was unable to take
    And it does not report zero favourable pairs as though a comparison had been made

  Scenario: swapping the declared metric changes what the same two arms mean
    Given two criteria differing only in the metric they declare
    And two arms whose recorded outcomes are fixed
    When the pair is counted under each criterion
    Then the two criteria may count the same pair differently
    And neither result required the arms to be re-recorded

  Scenario: a ruling carries the counter-metric reading beside the trial result
    Given a step whose recorded pairs are all favourable on the declared metric
    And whose counter-metric reads worse after the change than before
    When the ruling is rendered
    Then the ruling reports the counter-metric reading and the direction it moved
    And that reading is present whether or not the trial result was favourable

  Scenario: the first ruling records the tie rate that was observed
    Given a criterion declaring an assumed tie rate
    When the first ruling under it is rendered
    Then the ruling records the tie rate actually observed
    And the declared rate is reported beside the observed one thereafter
