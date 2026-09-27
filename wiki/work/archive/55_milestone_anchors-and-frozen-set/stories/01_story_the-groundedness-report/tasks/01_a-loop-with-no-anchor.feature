@executable @cli @work @validate
Feature: A loop with no anchor is named, and absence is the finding rather than a missing key

  The milestone asks for an anchor edge from every declared loop. The obvious implementation — a
  required key on each loop record — is the wrong one, and for a reason the registry has already
  paid to learn: a required field is satisfiable by fabrication, and the last milestone's own
  closing note warned authors off declaring an edge to every loop just to clear a check.

  So the requirement is computed, not demanded. Edges are declared outbound from the anchor, in one
  direction only, so there is no second place for a loop to claim an anchor it does not have. A loop
  nothing points at is simply a loop nothing points at, and the report says which ones those are.
  Absence is the finding.

  ADR-002. FF-5502.

  Scenario: a loop that no anchor feeds is named
    Given a registry where one declared loop has no inbound anchor edge
    When the report is produced
    Then that loop is named as having no anchor
    And the loops that do have one are not

  Scenario: the loop record has no key with which to claim an anchor
    Given a loop record attempting to declare its own anchor as a field
    When the registry is loaded
    Then the key is refused as outside the schema

  Scenario: an anchor pointing at a node that does not exist is a dangling edge
    Given an anchor declaring an edge to a loop that is not in the registry
    When the report is produced
    Then the edge is reported as dangling
    And it does not ground anything

  Scenario: an anchor feeding several loops grounds each of them
    Given one anchor declaring edges into three loops
    When the report is produced
    Then none of the three is reported as having no anchor

  Scenario Outline: what counts as an anchor edge
    Given an anchor declaring a <type> edge into a loop
    When the report is produced
    Then the loop <result>

    Examples: an anchor's output being an input is what anchoring means
      | type             | result                       |
      | data-feed        | has an anchor                |
      | monitoring       | has no anchor                |
      | target-setting   | has no anchor                |

  Scenario: the count of unanchored loops is reported, not only the names
    Given a registry with several loops and one anchor
    When the report is produced
    Then it states how many declared loops have no anchor
