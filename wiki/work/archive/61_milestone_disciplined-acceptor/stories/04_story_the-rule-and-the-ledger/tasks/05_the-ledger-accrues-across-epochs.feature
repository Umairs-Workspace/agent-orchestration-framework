@executable @cli @work @validate
Feature: Evidence carries forward while the criterion stands, and stops dead where it moved

  A ledger scoped to one milestone would be the off switch wearing a discipline's clothes. At the
  yield this system actually produces — under one discordant pair per milestone — such a counter could
  never exceed one, so the acceptor could never fire and nobody would be able to see why. Evidence
  therefore carries forward across milestones. The milestone is recorded on every ruling and reported,
  but it is not a filter on the total.

  What the total must never do is span a change to the criterion, because pairs collected under two
  different rules are pairs from two different experiments. That is arithmetic rather than a rule
  somebody remembers to apply: the total is the run of rulings back to the last criterion change, so a
  straddling total is not refused — it cannot be expressed.

  The distinction worth arguing is when an incomplete ruling is caught. A ruling missing part of its
  record is refused at the moment it is made, and again when the ledger is assembled — never rendered
  as a blank. A blank in the record justifying a configuration change is exactly the missing "why"
  this ledger exists to supply.

  ADR-006 §1, §3. ADR-005 §1. FF-6106.

  Scenario: evidence recorded in earlier milestones counts in a later one
    Given rulings recorded across three milestones under one unchanged criterion
    When the accrual is read
    Then it totals the rulings from all three
    And it is not limited to the milestone currently open

  Scenario: the milestone is reported and is not a filter
    Given rulings recorded across several milestones
    When the accrual is read
    Then each ruling names the milestone it was rendered in
    And the total is the same whichever milestone is open

  Scenario Outline: a ledger that spans a criterion change totals only the run since the change
    Given <before> rulings rendered under earlier criteria and <after> rendered under the current one
    When the accrual is read
    Then the total counted is <counted>
    And the report says the criterion moved

    Examples:
      | before | after | counted |
      | 6      | 2     | 2       |
      | 6      | 0     | 0       |
      | 0      | 8     | 8       |
      | 9      | 4     | 4       |

  Scenario: a criterion that did not move is stated as unchanged rather than assumed
    Given rulings spanning two milestones under one criterion that never changed
    When the accrual is read
    Then the report states that the criterion was unchanged
    And the carried-forward total is reported alongside that statement

  Scenario Outline: a ruling missing any part of its record is refused when it is made
    Given a ruling missing only <part>
    When it is constructed
    Then it is refused naming <part>
    And no ruling is produced with that part left blank

    Examples:
      | part                          |
      | the knob it names             |
      | the value it moved from       |
      | the value it moved to         |
      | the milestone it was rendered in |
      | the criterion it was rendered under |
      | the win, loss and tie sequence |
      | the wealth it attained        |
      | the counter-metric reading    |
      | the dwell expiry              |
      | its provenance                |
      | its verdict                   |
      | the refusals it reports       |

  Scenario: an incomplete ruling already recorded is refused at assembly too
    Given a recorded ruling missing part of its record
    When the ledger is assembled
    Then the assembly is refused naming that ruling and the missing part
    And the ruling is not rendered with a blank in it

  Scenario: the sequence is reported in the order it happened
    Given a ledger whose favourable and unfavourable pairs alternate
    When it is read
    Then the sequence is reported in the order it was recorded
    And it is not reported sorted

  Scenario: an accrual short of a crossing reports how short it is
    Given a ledger holding four favourable pairs under a criterion whose earliest crossing is eight
    When the accrual is read
    Then it reports four pairs held against the eight that would cross
    And it reports how many pairs of the budget remain
    And no commit is reported

  Scenario: an empty ledger totals nothing and says so
    Given a ledger holding no rulings at all
    When the accrual is read
    Then the total is zero
    And it is reported as an empty ledger rather than as a failure to read one

  Scenario: the answer does not depend on when it is asked
    Given one ledger read at two different supplied moments
    When the two accruals are compared
    Then the totals are identical
    And the totals do not change when the supplied moment changes
