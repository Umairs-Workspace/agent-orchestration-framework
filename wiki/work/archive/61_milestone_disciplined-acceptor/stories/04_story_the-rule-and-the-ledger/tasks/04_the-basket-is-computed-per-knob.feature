@executable @cli @work @validate
Feature: One threshold, many baskets — every knob is priced in the smallest unit it can move

  The same evidence costs wildly different money depending on what has to be re-run to produce one
  pair of it. Lowering the pair count for cheap knobs would buy affordability by weakening the
  guarantee exactly where evidence is cheapest, so the crossing records do not move. What moves is the
  basket: the pairs are the same, the unit they are collected in is not.

  A basket funds the budget, never the earliest crossing. A trial has to be paid for over the longest
  run it may legitimately take; a run that crosses early simply costs less than it was funded for.
  Funding only the earliest crossing would buy a trial that cannot reach its own second crossing,
  which is the same error one axis over.

  Which unit a knob gets is not a preference either. It is the smallest measured unit whose outcome
  that knob's change can alter, and for an orchestration knob that nothing below a whole milestone
  build responds to, that unit is the milestone build — which prices it out. That is the honest
  answer, not a defect in the sizing, and the knob stays on the report with the price it would cost.

  ADR-003 §2, §3, §4, §5, §6. FF-6103.

  Scenario Outline: each knob's basket is computed from its own trial unit
    Given a criterion budgeting 11 pairs, assuming half its pairs tie, and capping a trial at 1500
    And a knob whose trial unit is a <unit> priced at a mean of <mean>
    When its basket is computed
    Then 22 raw pairs are to be collected
    And the basket is <basket>
    And the knob is <verdict>

    Examples:
      | unit                 | mean   | basket | verdict                                      |
      | review round         | 5.61   | 247    | admitted, and accrues against the crossing   |
      | developer task build | 22.82  | 1004   | admitted, and accrues against the crossing   |
      | milestone build      | 137.30 | 6041   | refused as unaffordable, and accrues nothing |

  Scenario Outline: the tie rate moves the raw pairs and never the crossing
    Given a criterion budgeting 11 pairs and assuming a tie rate of <ties>
    When the raw pairs to be collected are computed
    Then <raw> raw pairs must be collected
    And the records at which the run would commit are unchanged

    Examples:
      | ties   | raw |
      | 50%    | 22  |
      | 65%    | 32  |
      | 95.08% | 224 |

  Scenario: a basket funds the budget, not the earliest crossing
    Given a criterion whose earliest crossing is eight pairs and whose budget is eleven
    When a basket is computed
    Then it funds eleven pairs of discordant evidence
    And it does not fund only eight

  Scenario: a basket prices both arms of the trial
    Given a knob whose trial unit has a known mean price
    When its basket is computed
    Then the basket is the raw pairs to be collected, times two arms, times that mean
    And it is not the price of running one arm

  Scenario: the evidence required is the same for every knob whatever it costs
    Given three knobs whose trial units differ in price
    When each is asked what a commit requires
    Then each requires the same crossing records
    And each is funded for the same number of pairs
    And only their baskets differ

  Scenario: the spread between the cheapest and the dearest knob survives every assumption
    Given the criterion's three admitted knobs
    When their baskets are computed under two different budgets and two different tie rates
    Then the ratio between the dearest basket and the cheapest is the same in all four cases
    And that ratio is between twenty-four and twenty-five

  Scenario: the trial ceiling leaves margin for a worse tie rate than the one assumed
    Given a criterion capping a trial at 1500 and assuming half its pairs tie
    When the knobs are priced again at a tie rate of 65%
    Then both agent-round knobs are still admitted
    And the milestone-unit knob is still refused by about four times the cap

  Scenario: an unaffordable knob stays on the report with its price
    Given a knob whose computed basket exceeds the criterion's trial ceiling
    When the acceptor reports
    Then the knob is listed
    And it is reported with its computed basket and the ceiling it exceeded
    And it contributes no pairs to any accrual

  Scenario: raising the ceiling above a basket admits the knob it had refused
    Given a knob refused because its basket exceeded the ceiling
    When the same knob is priced under a criterion whose ceiling exceeds that basket
    Then it is no longer refused on price
    And its basket is unchanged

  Scenario: a knob with no declared trial unit is refused rather than priced by default
    Given a knob admitted with no trial unit declared beside it
    When its basket is computed
    Then it is refused naming the missing trial unit
    And no price is assumed on its behalf
