@executable @cli @work @work-stream
Feature: The taxonomy widens, and nothing that was valid stops being valid

  The registry's notion of ground is a set of one. Everything reachable from the operator reports
  grounded-by-exogenous-only, which milestone 52 made a warn rather than a pass precisely because
  exogenous is the weakest ground there is. The stronger classes — an observed process exit, the
  build stamp on the running binary, a landed commit, a live-soak observation, a frozen rule — have
  no spelling at all.

  This gives them one. Two closed sets gain members and a third node kind appears beside loop and
  actor. The hard part is not the widening; it is that milestone 52 delivered nine records through
  the bundle and every one of them must still parse, unedited, emitting exactly the findings it
  emitted before. A widening that invalidates a delivered record is not a widening.

  ADR-001. FF-5501.

  Scenario: an anchor node parses and carries its class
    Given a record declaring an anchor with a ground class and an authority it observes
    When the registry is loaded
    Then the node is admitted as an anchor
    And its ground class is readable as a typed value rather than free text

  Scenario: every record the previous milestone delivered still parses
    Given the registry exactly as the bundle delivers it
    When it is loaded before and after the taxonomy widens
    Then every record is admitted in both cases
    And the findings reported are the same in both cases

  Scenario: the operator's exogenous ground survives as a member of the taxonomy
    Given the actor record declaring exogenous ground
    When the registry is loaded
    Then it is admitted unchanged
    And exogenous is one of the taxonomy's classes rather than a value awaiting removal

  Scenario Outline: which ground classes the registry admits, and on what
    Given a record of kind <kind> declaring ground <value>
    When the registry is loaded
    Then the record is <outcome>

    Examples: the widened enum — five new classes beside the one 52 shipped
      | kind   | value         | outcome  |
      | anchor | process-exit  | admitted |
      | anchor | build-stamp   | admitted |
      | anchor | landed-commit | admitted |
      | anchor | live-soak     | admitted |
      | anchor | frozen-rule   | admitted |
      | anchor | exogenous     | admitted |
      | actor  | exogenous     | admitted |
      | anchor | verified      | refused  |
      | anchor | true          | refused  |
      | anchor | an empty value | refused  |

  Scenario: an anchor's id must agree with the file that carries it
    Given an anchor record whose declared id does not match its filename stem
    When the registry is loaded
    Then the mismatch is a schema error naming both spellings

  Scenario: the closed sets are literals in the loader, not derived from the records
    Given a record declaring a ground class outside the taxonomy
    When the registry is loaded
    Then the class is refused
    And the admitted set is unchanged by the record's presence
