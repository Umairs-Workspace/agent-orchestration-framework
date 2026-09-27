@executable @cli @work @validate
Feature: A loop nobody consults is named as a prune candidate, and is never removed

  A declared loop that nothing feeds, nothing watches and nothing has ever run is graph weight. It
  makes every report longer, every traversal slower and every "we have loops for that" claim weaker,
  and because it is declared it looks like coverage.

  The audit names it. It does not remove it. Removing a node is an edit to a governed declaration, and
  the kind that produces this finding has no vocabulary in which to act — which is the point of that
  omission rather than an inconvenience around it. The operator, or whoever owns the declaration,
  decides whether an unconsulted loop is dead weight or a loop that has simply not been needed yet.

  ADR-004 §4. FF-5907.

  Scenario: a loop with a consumer is not a prune candidate
    Given a declared loop with at least one inbound edge from another node
    When consultation is assessed
    Then the loop is not reported as a prune candidate

  Scenario: a loop with no inbound edge and no observed execution is a prune candidate
    Given a declared loop with no inbound edge from any node
    And no record of it ever having run
    When consultation is assessed
    Then the loop is reported as a prune candidate
    And the finding names the loop and says why it is a candidate

  Scenario: a loop with no inbound edge that has run is not a prune candidate
    Given a declared loop with no inbound edge from any node
    And a record of it having run
    When consultation is assessed
    Then the loop is not reported as a prune candidate

  Scenario: the report never removes anything
    Given a registry containing a prune candidate
    When consultation is assessed
    Then the registry on disk is unchanged
    And the candidate is still declared afterwards

  Scenario: an unconsulted node that is not a loop is not offered for pruning
    Given a declared anchor with no inbound edge
    When consultation is assessed
    Then it is not reported as a prune candidate

  Scenario: the assessment says how many loops it considered
    Given a registry of declared loops
    When consultation is assessed
    Then the result reports the number of loops it considered
    And an assessment that considered none is reported as having run on nothing
