@executable @cli @work @validate
Feature: The oracle is the failure message, never the pass or fail count

  Nine of this repository's three hundred and forty-one gates are standing red. On a gate that is
  already red, breaking the thing it protects changes nothing a counter can see: the count before is
  one failure, the count after is one failure, and the instrument reports that nothing happened.

  Spike 56 made this a binding constraint on anything built on it, and it is the difference between an
  audit that would have caught the last outage and one that would have watched it happen. The verdict
  this lane reaches comes from the failure message the control produced, compared with the message the
  register recorded. Where the messages differ, something changed, whether or not the count did.

  ADR-004 §3. FF-5906.

  Scenario: a standing-red control whose failure changes is reported as changed
    Given a control that was already failing when its result was recorded
    And it now fails with a different message
    When the evidence lane runs
    Then the row is reported as changed
    And the report quotes both the recorded message and the observed one

  Scenario: a standing-red control failing the same way is reported as unchanged
    Given a control that was already failing when its result was recorded
    And it now fails with the same message
    When the evidence lane runs
    Then the row is reported as unchanged
    And it is still reported as failing

  Scenario: the count alone cannot produce a verdict
    Given a control whose pass and fail counts are identical before and after a real break
    When the evidence lane runs
    Then the break is still reported
    And the report is derived from the message rather than from the counts

  Scenario: a control that turns from failing to passing is reported as repaired
    Given a control that was failing when its result was recorded
    And it now passes
    When the evidence lane runs
    Then the row is reported as repaired
    And the report says that the recorded result is now out of date

  Scenario: a control that turns from passing to failing is reported with what it says
    Given a control that was passing when its result was recorded
    And it now fails
    When the evidence lane runs
    Then the row is reported as contradicted
    And the observed failure message is carried on the finding

  Scenario: message comparison survives a message that moves
    Given a control whose failure message differs only in a line number or a path separator
    When the evidence lane runs
    Then the row is not reported as changed on that difference alone
    And the report says which parts of the message it compared
