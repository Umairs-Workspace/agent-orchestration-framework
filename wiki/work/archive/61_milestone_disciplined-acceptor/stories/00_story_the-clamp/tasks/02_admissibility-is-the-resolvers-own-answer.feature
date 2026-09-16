@executable @cli @work @validate
Feature: A proposed step is in range exactly when the knob returns it unchanged

  A tuning proposal moves one knob by one notch, and something has to say whether the proposed value
  is allowed. The tempting answer is a table of floors and ceilings the proposer reads. That table
  would be a second home for a bound that already exists where the knob is resolved, and two homes
  for one number become two different numbers the first time either is edited.

  So admissibility is asked, not looked up: a proposed value is in range exactly when resolving it
  returns it unchanged. The knob answers for itself. Two consequences follow and are the reason this
  is worth a task. The answer is per knob rather than shared, so the same number can be admissible
  for one knob and refused for another. And nothing written down anywhere can widen a range, because
  there is nothing written down to edit — a record claiming a wider range simply loses.

  The distinction worth arguing about is why this probe cannot come first. Over a knob with no
  ceiling it admits every value, including one that is absurd: an unbounded resolution returns
  whatever it is handed, so the probe reports "in range" for anything and is a bound-shaped nothing.
  It becomes a bound only once the ranges exist, which is why the clamp and this probe are the same
  story.

  There is one more way to answer nothing while looking like an answer. A key that declares no range
  has nothing to ask, and the one thing the probe must never do with it is report it admissible by
  default. Silence and "in range" are different answers, and they are kept apart below.

  ADR-009 §2, §5. FF-6111.

  Scenario Outline: a proposed value is admissible exactly when it resolves to itself
    Given a proposed value of <proposed> for <knob>
    When the proposal is tested for admissibility
    Then it is <verdict>

    Examples: the same number is admissible for one knob and refused for another
      | knob                            | proposed | verdict    |
      | work.loop.reviewRounds          | 1        | admissible |
      | work.loop.reviewRounds          | 3        | admissible |
      | work.loop.reviewRounds          | 4        | refused    |
      | work.loop.reviewRounds          | 0        | refused    |
      | work.loop.buildNoProgressRounds | 1        | admissible |
      | work.loop.buildNoProgressRounds | 4        | admissible |
      | work.loop.buildNoProgressRounds | 5        | refused    |
      | work.loop.buildNoProgressRounds | 0        | refused    |
      | work.loop.buildNoProgressRounds | 99       | refused    |

  Scenario Outline: a one-notch step at the boundary is where the ratchet stops
    Given <knob> with a value in effect of <current>
    When a step of <step> is proposed for it
    Then it is <verdict>

    Examples: one step in and one step out at each end of each steppable knob
      | knob                            | current | step | verdict    |
      | work.loop.reviewRounds          | 2       | +1   | admissible |
      | work.loop.reviewRounds          | 3       | +1   | refused    |
      | work.loop.reviewRounds          | 3       | -1   | admissible |
      | work.loop.reviewRounds          | 1       | -1   | refused    |
      | work.loop.buildNoProgressRounds | 3       | +1   | admissible |
      | work.loop.buildNoProgressRounds | 4       | +1   | refused    |
      | work.loop.buildNoProgressRounds | 2       | -1   | admissible |
      | work.loop.buildNoProgressRounds | 1       | -1   | refused    |

  Scenario: the verdict and the value in effect never disagree
    Given any steppable knob and any proposed value for it
    When the proposal is tested and the value that proposal would put in effect is resolved
    Then it is admissible only where that value is the proposed one
    And it is refused only where that value is something else

  Scenario: every knob that resolves a configured value can also be asked about a proposed one
    Given the knobs whose values are resolved from configuration
    When each is asked whether a proposed value is in range
    Then every one of them answers
    And nothing answers that has no configured value of its own

  Scenario: a key that declares no range is never answered admissible
    Given an admitted key for which no floor and no ceiling are declared
    When a value is proposed for it
    Then it is not reported admissible
    And that answer is distinguishable from a value refused for falling outside a range

  Scenario: over a knob with no ceiling the probe admits anything, which is why the range comes first
    Given a knob whose values are bounded below and not above
    When an absurdly large value is proposed for it
    Then it is admissible
    And the same value proposed for a knob that has a ceiling is refused

  Scenario: a refusal reports what the knob answered instead
    Given a proposed value outside a steppable knob's range
    When the proposal is refused
    Then the refusal reports the value that would take effect instead of the proposed one
    And it names the knob the answer came from

  Scenario: a record declaring a wider range does not widen it
    Given a record that declares a range for a steppable knob wider than the knob's own
    And a proposed value inside the declared range and outside the knob's own
    When the proposal is tested for admissibility
    Then it is refused
    And the answer is the same as it is with no such record present

  Scenario: a step is taken from the value in effect, never from what the config file says
    Given a steppable knob whose configured value is above its ceiling
    When a one-notch step up from that knob's value in effect is proposed
    Then it is refused
    And a one-notch step down is a proposal of one below the ceiling, not one below the configured value

  Scenario: asking is a read
    Given a steppable knob with a value in effect
    When proposals are tested against it, admissible and refused alike
    Then the value in effect for that knob is unchanged
    And no configuration is written
