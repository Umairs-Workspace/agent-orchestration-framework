@executable @cli @work @validate
Feature: A supervisor runs at a slower layer than the loop it supervises

  The timescale check has decided nothing since the day it shipped. It compares two clocks, and six
  of this system's seven loops have no clock at all — so the moment a loop declares that it sets
  another loop's reference, the only answer available is that the pair cannot be compared. A
  milestone about timescale separation cannot ship a check whose every answer is that it has none.

  A duration and an ordinal are different things. The records now carry both the layer a loop
  declares and the scope ordinal its own cadence implies, so a second axis decides where the clocks
  cannot. Where both ends carry a layer, the layer decides; where both carry a clock, the separation
  ratio decides exactly as it did before; where a declared layer disagrees with the cadence that
  would corroborate it, the declaration is a fabrication and is named as one; and where neither axis
  can answer, the check says so and invents nothing.

  The restraint is the compatibility claim, and it is asserted rather than promised: no duration is
  derived from an event trigger to manufacture a ratio, the separation ratio does not move, and over
  a registry that declares no layer the cadence comparison yields the verdicts it yielded before this
  milestone. The layer axis is added beside the clock, never over it.

  ADR-002 §1, §3, §4, §5, §6. FF-5802, FF-5804.

  Scenario: a supervisor one layer slower than what it supervises is clean
    Given a target-setting edge from a management-layer loop to an operational-layer loop
    When the checks are run
    Then no layer finding is raised for that edge
    And no timescale finding is raised for that edge

  Scenario: a supervisor at the same layer as what it supervises is an inversion
    Given a target-setting edge between two loops that declare the same layer
    When the checks are run
    Then the layer-inversion finding names the loop that sets the reference
    And it names the loop whose reference is set

  Scenario: a supervisor at a faster layer than what it supervises is an inversion
    Given a target-setting edge from an operational-layer loop to a management-layer loop
    When the checks are run
    Then the layer-inversion finding is raised

  Scenario: a periodic pair at exactly the required separation is not reported
    Given two loops declaring no layer whose periods stand at exactly the required separation ratio
    When the checks are run
    Then no timescale-inversion finding is raised

  Scenario: a periodic pair just under the required separation is reported
    Given two loops declaring no layer whose periods stand just under the required separation ratio
    When the checks are run
    Then the timescale-inversion finding names both loops
    And it states the ratio it computed

  Scenario: an edge inverted on both axes is reported once on each
    Given a target-setting edge whose ends share a layer and whose periods stand under the required ratio
    When the checks are run
    Then the layer-inversion finding is raised
    And the timescale-inversion finding is raised
    And neither finding restates the other

  Scenario: neither axis can answer, so the pair is not comparable
    Given a target-setting edge between an event-cadenced loop and a clocked loop, neither declaring a layer
    When the checks are run
    Then the not-comparable finding names the side with no clock
    And no ratio is computed for that pair

  Scenario: an event trigger is never converted into a duration
    Given a registry whose loops are cadenced only by event triggers
    When the checks are run
    Then no finding states a period ratio
    And no timescale-inversion finding is raised

  Scenario: with no layer declared anywhere, the cadence comparison does not move
    Given a registry in which no loop declares a layer
    When the checks are run
    Then every target-setting pair yields the comparison verdict it yielded before this milestone
    And the ratio at which a periodic pair stops being reported is unchanged
    And a pair joined by any edge other than target-setting still yields nothing

  Scenario Outline: which axis decides a supervising edge
    Given a loop cadenced <source cadence> whose layer is <source layer>
    And a target-setting edge from it to a loop cadenced <target cadence> whose layer is <target layer>
    When the checks are run
    Then the edge is reported as <outcome>

    Examples: both ends carry a layer, so the layer decides whatever the clocks can or cannot say
      | source cadence      | source layer | target cadence  | target layer | outcome                                     |
      | event:per-item      | management   | event:per-phase | operational  | clean                                       |
      | event:per-milestone | governance   | event:per-item  | management   | clean                                       |
      | event:per-milestone | governance   | event:per-phase | operational  | a skipped layer                             |
      | event:per-phase     | operational  | event:per-phase | operational  | a layer inversion                           |
      | event:per-phase     | operational  | event:per-item  | management   | a layer inversion                           |
      | periodic:60s        | management   | periodic:15s    | operational  | clean                                       |
      | periodic:45s        | management   | periodic:15s    | operational  | clean                                       |
      | periodic:30s        | management   | periodic:15s    | operational  | a timescale inversion                       |
      | periodic:30s        | operational  | periodic:15s    | operational  | a layer inversion and a timescale inversion |
      | periodic:15s        | management   | periodic:60s    | operational  | a timescale inversion                       |
      | periodic:60s        | management   | event:per-phase | operational  | clean                                       |
      | event:per-item      | management   | periodic:15s    | operational  | clean                                       |

    Examples: neither end carries a layer, so the clock decides alone and every verdict here is 52's
      | source cadence  | source layer | target cadence  | target layer | outcome               |
      | periodic:60s    | (undeclared) | periodic:15s    | (undeclared) | clean                 |
      | periodic:45s    | (undeclared) | periodic:15s    | (undeclared) | clean                 |
      | periodic:30s    | (undeclared) | periodic:15s    | (undeclared) | a timescale inversion |
      | periodic:15s    | (undeclared) | event:per-phase | (undeclared) | not comparable        |
      | event:per-phase | (undeclared) | periodic:15s    | (undeclared) | not comparable        |
      | event:per-item  | (undeclared) | event:per-phase | (undeclared) | not comparable        |

    Examples: one end carries a layer, which is not enough — the layer axis never guesses the other end
      | source cadence | source layer | target cadence  | target layer | outcome               |
      | event:per-item | management   | event:per-phase | (undeclared) | not comparable        |
      | event:per-item | (undeclared) | event:per-phase | operational  | not comparable        |
      | periodic:30s   | management   | periodic:15s    | (undeclared) | a timescale inversion |
      | periodic:60s   | (undeclared) | periodic:15s    | operational  | clean                 |
      | periodic:15s   | management   | event:per-phase | (undeclared) | not comparable        |

  Scenario Outline: a declared layer is read against the cadence that would corroborate it
    Given a loop cadenced <cadence> whose layer is <layer>
    When the checks are run
    Then the layer check reports <outcome>

    Examples: the four triggers place a loop on the axis, so a declaration disagreeing with one is caught
      | cadence             | layer       | outcome                          |
      | event:per-run-start | operational | nothing                          |
      | event:per-run-start | management  | a contradiction with its cadence |
      | event:per-run-start | governance  | a contradiction with its cadence |
      | event:per-phase     | operational | nothing                          |
      | event:per-phase     | management  | a contradiction with its cadence |
      | event:per-phase     | governance  | a contradiction with its cadence |
      | event:per-item      | operational | a contradiction with its cadence |
      | event:per-item      | management  | nothing                          |
      | event:per-item      | governance  | a contradiction with its cadence |
      | event:per-milestone | operational | a contradiction with its cadence |
      | event:per-milestone | management  | a contradiction with its cadence |
      | event:per-milestone | governance  | nothing                          |

    Examples: a clock implies no scope, so a layer beside one stands uncorroborated rather than refused
      | cadence         | layer        | outcome                   |
      | periodic:15s    | operational  | nothing                   |
      | periodic:15s    | governance   | nothing                   |
      | unknown         | management   | nothing                   |
      | event:per-phase | (undeclared) | that it declares no layer |
      | periodic:15s    | (undeclared) | that it declares no layer |
