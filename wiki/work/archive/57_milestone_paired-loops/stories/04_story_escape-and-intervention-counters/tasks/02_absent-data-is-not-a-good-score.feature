@executable @cli @work @validate
Feature: A counter with nothing to count says so, and never says zero

  This is the failure that would quietly undo the whole milestone. A counter that reports zero when
  it has no data reports a perfect score for a loop nobody has ever measured — and the pairing gate,
  seeing a watcher with a number, would be satisfied. The instrument would be decoration wearing a
  result.

  The registry already draws this distinction and froze it deliberately: nothing declared and nothing
  present are different facts, and neither of them equals a filled field. These counters inherit that
  rule. No runs recorded is not zero interventions. No feedback file is not zero escapes. No accepted
  item in scope is not a clean review record.

  ADR-002. FF-5707.

  Scenario: no runs recorded is not zero interventions
    Given a scope whose items have no run records
    When the intervention counter runs
    Then it reports that it cannot measure
    And it does not report a count

  Scenario: no feedback recorded is not zero escapes
    Given a scope whose items have no feedback records
    When the escape counter runs
    Then it reports that it cannot measure
    And it does not report a count

  Scenario: no accepted item is not a clean review record
    Given a scope in which no item has been accepted
    When the escape counter runs
    Then it reports that it cannot measure

  Scenario: a real zero is reported as a zero
    Given a scope with accepted items and feedback records, none raised after acceptance
    When the escape counter runs
    Then it reports zero escapes
    And it does not report that it cannot measure

  Scenario: a real zero is distinguishable from an unmeasurable one in the output
    Given one scope with no data and one scope with data and no escapes
    When the escape counter runs over each
    Then the two results are distinguishable

  Scenario: an unmeasurable counter does not satisfy the pairing gate on its own
    Given a watcher whose counter reports that it cannot measure
    When the validate run completes
    Then the loop is still reported as watched
    And the unmeasurable result is visible in the counter's own output

  Scenario: a partially measurable scope reports what it measured
    Given a scope where some items carry run records and some do not
    When the intervention counter runs
    Then it reports the count over the items it could measure
    And it names how many items it could not measure
