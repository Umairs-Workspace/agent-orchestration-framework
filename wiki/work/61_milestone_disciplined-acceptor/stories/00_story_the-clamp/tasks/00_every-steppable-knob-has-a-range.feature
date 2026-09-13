@executable @cli @work @validate
Feature: Every steppable knob resolves inside a declared range, and a value past either end comes back

  Two of the three admitted knobs can be stepped. One of them has always had an upper bound; the
  other has a floor and no ceiling at all. A rule that moves an integer by one notch needs something
  to be bounded against — applied to a knob with no ceiling it is a ratchet that walks upward until
  somebody notices, which is the exact failure the rest of this milestone exists to prevent,
  arriving through the one door nobody thought to close.

  So the knob that is missing a ceiling gets one, where its value is already worked out. A value
  past either end is corrected rather than refused: a config file is edited by hand, and a harness
  that will not start over a mistyped number is worse than one that keeps the number it can defend.
  What it must never do is honour the mistyped number.

  The distinction worth arguing about is that "comes back inside" is not the same as "comes back to
  the boundary". A value the knob cannot make sense of at all — below its floor, fractional, or not
  a number — falls back to the default that knob has always had, which is not necessarily its floor;
  only a value above the ceiling comes back to the boundary itself. Both landings are pinned below,
  because a knob answering something else would still be "inside the range" and still be wrong.

  The third admitted key is absent here, and its absence is the finding rather than an omission: no
  range is declarable for a key that is not one bound. That is the next task's subject.

  ADR-009 §1, §3. FF-6111.

  Scenario Outline: a value inside the range takes effect exactly as configured
    Given a workspace that configures <knob> to <configured>
    When the value in effect for that knob is resolved
    Then it is <configured>

    Examples: the floor, an interior value and the ceiling of each steppable knob
      | knob                            | configured | where it sits |
      | work.loop.reviewRounds          | 1          | the floor     |
      | work.loop.reviewRounds          | 2          | interior      |
      | work.loop.reviewRounds          | 3          | the ceiling   |
      | work.loop.buildNoProgressRounds | 1          | the floor     |
      | work.loop.buildNoProgressRounds | 3          | interior      |
      | work.loop.buildNoProgressRounds | 4          | the ceiling   |

  Scenario Outline: a value past either end is not honoured, and what takes effect is inside the range
    Given a workspace that configures <knob> to <configured>
    When the value in effect for that knob is resolved
    Then it is not <configured>
    And it is <in effect>
    And that is no lower than <floor> and no higher than <ceiling>

    Examples: one step past each end, and the runaway an unbounded ratchet produces
      | knob                            | configured | where it sits     | in effect | floor | ceiling |
      | work.loop.reviewRounds          | 0          | below the floor   | 1         | 1     | 3       |
      | work.loop.reviewRounds          | 4          | above the ceiling | 3         | 1     | 3       |
      | work.loop.reviewRounds          | 99         | runaway           | 3         | 1     | 3       |
      | work.loop.buildNoProgressRounds | 0          | below the floor   | 2         | 1     | 4       |
      | work.loop.buildNoProgressRounds | 5          | above the ceiling | 4         | 1     | 4       |
      | work.loop.buildNoProgressRounds | 99         | runaway           | 4         | 1     | 4       |

  Scenario Outline: a setting that is not a whole positive number is not honoured either
    Given a workspace that configures <knob> to <configured>
    When the value in effect for that knob is resolved
    Then it is not <configured>
    And it is <in effect>, the default that knob has always had

    Examples: the malformed values a hand-edited config produces
      | knob                            | configured | why it is not a value | in effect |
      | work.loop.reviewRounds          | 2.5        | not a whole number    | 1         |
      | work.loop.reviewRounds          | three      | not a number at all   | 1         |
      | work.loop.buildNoProgressRounds | -1         | not a positive number | 2         |
      | work.loop.buildNoProgressRounds | [4]        | not a number at all   | 2         |

  Scenario Outline: a knob nobody configured keeps the default it has always had
    Given a workspace that configures nothing for <knob>
    When the value in effect for that knob is resolved
    Then it is <default>
    And that value is inside the knob's range

    Examples: this task adds a ceiling and moves no default
      | knob                            | default |
      | work.loop.reviewRounds          | 1       |
      | work.loop.buildNoProgressRounds | 2       |

  Scenario: a value above the ceiling comes back to the ceiling rather than to the default
    Given a workspace that configures a steppable knob above its ceiling
    When the value in effect for that knob is resolved
    Then it is that knob's ceiling
    And it is not that knob's default

  Scenario: the two steppable knobs do not share one range
    Given a workspace that configures both steppable knobs to 4
    When the value in effect for each of them is resolved
    Then the knob whose ceiling is 4 is in effect at 4
    And the knob whose ceiling is 3 is in effect at 3

  Scenario: a ceiling bounds a knob without raising it
    Given a workspace that configures a steppable knob below its ceiling
    When the value in effect for that knob is resolved
    Then it is the configured value and not the ceiling

  Scenario: the ceiling holds wherever the bounded value is asked for
    Given a workspace that configures work.loop.buildNoProgressRounds to 99
    When each decision about how many rounds without progress may pass reads that knob
    Then every one of them is bounded at 4
    And none of them sees 99

  Scenario: a key that is not a single bound is given no range here
    Given the admitted key that resolves to more than one bound
    When the declared ranges are read
    Then no floor and no ceiling are declared for it
    And no range is invented so that it has one
