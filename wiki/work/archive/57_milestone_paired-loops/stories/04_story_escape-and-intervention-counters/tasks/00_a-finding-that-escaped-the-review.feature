@executable @cli @work @validate
Feature: A finding recorded after the item was accepted is one the review let through

  The review loop drives open findings toward zero, and the agent that fixes the findings is the
  agent whose work produced them. Its counter-metric has to be the thing that gets worse when
  findings are closed too eagerly: findings that came back after everyone agreed there were none.

  The moment that defines an escape is acceptance, not the end of a review pass. An item can go back
  to the bench and be reviewed again — that is the loop working. What makes a finding an escape is
  that it arrived after the item was signed off as finished, which is a single unambiguous point on
  the record rather than a phase that can repeat.

  Everything this counter needs is already written down. Feedback entries carry the moment they were
  raised; the item's record carries when it was accepted. The counter is the subtraction, and it
  names the item so the number leads somewhere.

  ADR-002. FF-5707.

  Scenario: a finding raised after acceptance is an escape
    Given an accepted item with a feedback entry timestamped after its acceptance
    When the escape counter runs
    Then the entry is counted as an escape
    And the item it escaped from is named

  Scenario: a finding raised before acceptance is not an escape
    Given an accepted item with a feedback entry timestamped before its acceptance
    When the escape counter runs
    Then the entry is not counted as an escape

  Scenario: an item that has not been accepted contributes no escapes
    Given an item still in progress with several feedback entries
    When the escape counter runs
    Then it contributes no escapes

  Scenario: a finding raised during a second review pass is not an escape
    Given an item that returned to the bench and was reviewed again before acceptance
    When the escape counter runs
    Then the findings from that pass are not counted as escapes

  Scenario: escapes are counted per item and reported per item
    Given two accepted items with one escaped finding each
    When the escape counter runs
    Then each item is reported with its own count

  Scenario: the counter reports the total across the scope it was asked for
    Given a milestone whose stories carry three escapes between them
    When the escape counter runs over that milestone
    Then the total is three

  Scenario: the counter reads records and writes nothing
    Given a work stream with escapes
    When the escape counter runs
    Then no record is modified
