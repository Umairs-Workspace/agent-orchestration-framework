@executable @cli @work @validate
Feature: A target-setting edge crosses exactly one layer boundary

  A supervision hierarchy is legible when each supervising edge steps down exactly one layer. An edge
  that reaches two layers down is a governance cycle setting an operational setpoint over the head of
  the management cycle between them — sometimes right, and never silent. An edge inside a single
  layer is not supervision at all: it is one loop setting the target of a peer that turns at its own
  speed, which is the thing this milestone exists to refuse.

  So sparseness and inversion are reported as the different kinds of wrong they are. A skipped layer
  names both ends and stays legible, because a reviewer may judge it right. A same-layer or upward
  edge is a break in the relation itself, and the finding says which loop set which.

  The rule governs the supervising edge and nothing else. The other four edge keys carry data,
  monitoring, vetoes and knob ownership across whatever distance they need, and this rule has nothing
  to say about any of them. Nor does it reach an edge whose ends are not both layered loops — an
  actor has no layer, and a loop that declares none is reported for that instead of being guessed at.

  ADR-002 §4, §5. FF-5802.

  Scenario: an edge that steps down exactly one layer is clean
    Given a target-setting edge from a governance-layer loop to a management-layer loop
    When the checks are run
    Then no layer finding is raised for that edge

  Scenario: an edge reaching two layers down is reported as skipping a layer
    Given a target-setting edge from a governance-layer loop to an operational-layer loop
    When the checks are run
    Then the skipped-layer finding names the loop that sets the reference
    And it names the loop whose reference is set

  Scenario: an edge between two loops in one layer is reported as an inversion
    Given a target-setting edge between two operational-layer loops
    When the checks are run
    Then the layer-inversion finding is raised
    And no skipped-layer finding is raised

  Scenario: a loop that sets its own target is not a boundary crossing
    Given a loop declaring a target-setting edge to itself
    When the checks are run
    Then the existing self-referential finding names it
    And no layer finding is raised for that edge

  Scenario: an actor setting a loop's reference crosses no boundary
    Given a target-setting edge from an actor to an operational-layer loop
    When the checks are run
    Then no layer finding is raised for that edge

  Scenario: an edge to an endpoint that is not a declared node is outside the rule
    Given a target-setting edge naming an endpoint no record declares
    When the checks are run
    Then no layer finding is raised for that edge

  Scenario: each crossing is judged on its own edge
    Given a governance-layer loop with target-setting edges to a management-layer loop and to an operational-layer loop
    When the checks are run
    Then exactly one skipped-layer finding is raised
    And it names the operational-layer loop

  Scenario: the boundary rule reads only the parsed records
    Given a registry whose pointers name files that do not exist
    When the checks are run
    Then the boundary answers are unchanged
    And nothing on disk is read to produce them

  Scenario Outline: which crossings the boundary rule admits
    Given a target-setting edge between loops whose layers are <source layer> and <target layer>
    When the checks are run
    Then the edge is reported as <outcome>

    Examples: exactly one step down is the supervision relation; every other crossing is named
      | source layer | target layer | outcome           |
      | governance   | management   | clean             |
      | governance   | operational  | a skipped layer   |
      | governance   | governance   | a layer inversion |
      | management   | operational  | clean             |
      | management   | management   | a layer inversion |
      | management   | governance   | a layer inversion |
      | operational  | operational  | a layer inversion |
      | operational  | management   | a layer inversion |
      | operational  | governance   | a layer inversion |

    Examples: the rule needs both ends, and an end that declares no layer is reported for that instead
      | source layer | target layer | outcome                                          |
      | governance   | (undeclared) | no crossing finding; the target reports no layer |
      | (undeclared) | operational  | no crossing finding; the source reports no layer |
      | (undeclared) | (undeclared) | no crossing finding; both ends report no layer   |

  Scenario Outline: which edge key the boundary rule governs
    Given a <edge key> edge from a governance-layer loop to an operational-layer loop
    When the checks are run
    Then the crossing is <outcome>

    Examples: supervision is one of five declared relations and the only one with a layer rule
      | edge key         | outcome                      |
      | target-setting   | reported as skipping a layer |
      | data-feed        | not reported                 |
      | monitoring       | not reported                 |
      | veto             | not reported                 |
      | parameter-tuning | not reported                 |
