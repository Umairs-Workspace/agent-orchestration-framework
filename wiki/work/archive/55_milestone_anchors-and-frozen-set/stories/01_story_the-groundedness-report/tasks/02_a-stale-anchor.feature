@executable @cli @work @validate
Feature: An anchor whose authority has decayed reports stale, which is neither anchored nor floating free

  The previous milestone validated pointer syntax and deliberately never resolved one, recording the
  cost in its own words: a pointer can rot when a symbol is renamed, and nothing would notice. It
  named this milestone as the discharge.

  Stale is a third state and it has to stay a third state. An anchor that resolved when it was
  written and does not resolve now is a different fact from a loop that never had an anchor: the
  first says a pointer needs fixing, the second says an anchor needs building. Collapsing them would
  repeat, one milestone later, exactly the mistake the schema refused when it kept "we found no
  evidence" and "we looked and there is provably no bound" as separate tokens.

  ADR-002. FF-5502, FF-5503.

  Scenario: an anchor whose authority no longer resolves reports stale
    Given an anchor naming a module symbol that no longer exists
    When the report is produced
    Then its component is reported as stale
    And the message names the pointer that failed to resolve

  Scenario: stale is not the same verdict as having no anchor
    Given one component anchored by a decayed pointer and another with no anchor at all
    When the report is produced
    Then the first is reported as stale
    And the second is reported as self-referential
    And the two verdicts are distinguishable without reading the message text

  Scenario: an anchor that resolves does not report stale
    Given an anchor naming a symbol that this repository exports
    When the report is produced
    Then its component is reported as anchored
    And no staleness is reported for it

  Scenario Outline: what makes an authority resolve
    Given an anchor observing <authority>
    When the report is produced
    Then the anchor is <verdict>

    Examples: the three pointer schemes, resolved rather than merely parsed
      | authority                                | verdict   |
      | a module symbol this repository exports  | resolved  |
      | a module symbol nothing exports          | stale     |
      | a module path that is not a file         | stale     |
      | a command the registry has registered    | resolved  |
      | a command id nothing registers           | stale     |
      | a config key the workspace declares      | resolved  |
      | a config key nothing declares            | stale     |

  Scenario: staleness is reported, never recorded
    Given a registry with a decayed anchor
    When the report is produced
    Then the verdict is returned to the caller
    And nothing is written to disk

  Scenario: one decayed anchor does not make the whole report unreadable
    Given a registry with one decayed anchor and several sound ones
    When the report is produced
    Then every other component still carries its own verdict
