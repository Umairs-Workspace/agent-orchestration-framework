@executable @cli @work @validate
Feature: An anchor nobody refreshed stops being ground, without stopping being an anchor

  The groundedness report can already say that an anchor's cited authority no longer resolves. That is
  a structural fact and it is not the one an operator most often needs. The commoner failure is an
  anchor that resolves perfectly and was last observed four months ago: it is still wired, still
  correct, and no longer evidence of anything about today.

  Three answers, not two. An anchor past its window is stale. An anchor that has never declared a date
  is undated — which is a real and different state, and the one every anchor shipped before this
  milestone is in. An anchor inside its window is fresh.

  A loop grounded only through stale anchors degrades rather than disappearing. It is not
  ungrounded: the edge is declared and the authority resolves. Collapsing the two would lose the
  difference between never having been grounded and having been grounded a while ago, which is the
  difference the operator acts on.

  ADR-005 §1, §2, §4. FF-5907.

  Scenario Outline: an anchor's freshness has three answers
    Given an anchor <situation>
    And a staleness window
    When the groundedness report is produced
    Then the anchor is reported as <verdict>

    Examples:
      | situation                                 | verdict |
      | checked inside the window                 | fresh   |
      | checked longer ago than the window allows | stale   |
      | that has never declared a checked date    | undated |

  Scenario: an anchor exactly at the window boundary is not yet stale
    Given an anchor checked exactly as long ago as the window allows
    When the groundedness report is produced
    Then the anchor is reported as fresh

  Scenario: every anchor shipped before this milestone is undated, and none of them is stale
    Given the anchor records that shipped before this milestone
    When the groundedness report is produced
    Then each is reported as undated
    And none of them is reported as stale

  Scenario: a loop grounded only through stale anchors degrades
    Given a loop whose only anchor edges come from stale anchors
    When the groundedness report is produced
    Then the loop's ground is reported as stale
    And the loop is not reported as unanchored

  Scenario: a loop with one fresh anchor is not degraded by a stale sibling
    Given a loop with one fresh anchor edge and one stale anchor edge
    When the groundedness report is produced
    Then the loop is reported as grounded
    And the stale anchor is still reported as stale

  Scenario: a loop with no anchor edge at all is still unanchored
    Given a loop with no inbound anchor edge
    When the groundedness report is produced
    Then the loop is reported as unanchored
    And it is not reported as stale

  Scenario: the report reads no clock of its own
    Given a groundedness report produced twice with the same time and window handed in
    When the two results are compared
    Then they are identical
    And neither depended on the time at which it ran
