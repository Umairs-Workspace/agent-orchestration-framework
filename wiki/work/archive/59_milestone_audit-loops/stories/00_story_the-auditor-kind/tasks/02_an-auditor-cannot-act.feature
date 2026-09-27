@executable @cli @work @validate
Feature: An auditor cannot act, cannot optimise, cannot hold a setpoint and cannot ground itself

  The watcher's absent actuator is the strongest thing milestone 57 shipped: a node with no vocabulary
  for acting cannot claim to act on what it watches, and it costs nothing to enforce because the key
  is simply not admitted for the kind. The arbiter repeated it for four keys. The auditor repeats it
  for ten, and every one of them names a specific way the audit could stop being independent.

  An auditor that could fix what it found would be the maker of what it audits. One that could
  optimise would need a watcher of its own, and the regress has to stop. One that could hold a
  setpoint would be supervising rather than reporting. One that could ground itself would be issuing
  itself the authority the whole graph settles against — the arbiter's rule, verbatim.

  None of this needs a new finding code, and that is the point: the loader already refuses a key that
  a kind does not admit.

  ADR-001 §2. FF-5901.

  Scenario Outline: a key the kind does not admit is refused, with no new finding code
    Given an auditor record that also declares <key>
    When the registry is loaded
    Then the existing not-admitted-for-kind finding names <key>
    And no finding code that did not exist before this milestone is emitted

    Examples:
      | key        |
      | actuator   |
      | optimizing |
      | controlled |
      | reference  |
      | ground     |
      | counter    |
      | determinism|
      | layer      |
      | owner      |
      | ceiling    |

  Scenario: the kinds that do admit those keys are unaffected
    Given a loop declaring an actuator, a reference, a layer, an owner and a ceiling
    And a watcher declaring a counter and a determinism
    And an anchor declaring a ground
    When the registry is loaded
    Then each key is accepted on the kind that admits it
    And none of them gains a finding from this milestone's widening

  Scenario: an auditor cannot declare a target-setting edge
    Given an auditor declaring a target-setting edge to a loop
    When the registry is loaded
    Then the edge is reported rather than accepted
    And the auditor is not treated as an owner of any loop's reference

  Scenario: the refusal survives being written in a different order
    Given an auditor record that declares an actuator before its required keys
    When the registry is loaded
    Then the not-admitted-for-kind finding still names the actuator
    And the required-key findings are unchanged by the ordering
