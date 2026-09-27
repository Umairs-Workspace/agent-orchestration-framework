@executable @cli @work @validate
Feature: Not every node may set another loop's reference

  A loop is owned when something else sets its reference, and the check that looks for that asks only
  whether an inbound supervising edge exists. Any node may declare one, so any node may confer
  ownership — which means the cheapest way to clear an unowned loop is to point at it from whatever
  record is nearest to hand.

  Three sources are admissible and they are the three the hierarchy is made of. A slower loop, whose
  output is the inner loop's setpoint. An actor, who owns what is worth controlling at all. And an
  anchor grounded on a frozen rule — a rule no cycle is permitted to revise — which is the only
  ground that is an authority rather than an observation. Every other source is reported at the
  record that declared the edge, and two of the exclusions carry weight of their own: a watcher that
  sets a target is acting on what it watches, and an arbiter that sets a target has stopped
  arbitrating and become a supervisor.

  The restraint is that refusing a source is not a substitute for finding an owner. An inadmissible
  edge confers nothing, so a loop whose only inbound supervising edge comes from one is still an
  unowned loop, and both facts are reported. They do not cancel.

  ADR-001 §1, §5. FF-5804.

  Scenario: a reference set by a slower loop is ownership
    Given a target-setting edge from a management-layer loop to an operational-layer loop
    When the checks are run
    Then no unowned-reference finding names the operational-layer loop
    And no not-admitted finding is raised

  Scenario: a reference set by an actor is ownership
    Given a target-setting edge from an actor to a loop
    When the checks are run
    Then no unowned-reference finding names that loop
    And no not-admitted finding is raised

  Scenario: a reference set by an anchor on a frozen rule is ownership
    Given a target-setting edge from an anchor grounded on a frozen rule to a loop
    When the checks are run
    Then no unowned-reference finding names that loop
    And no not-admitted finding is raised

  Scenario: a watcher setting a target is refused
    Given a target-setting edge from a watcher to the loop it monitors
    When the checks are run
    Then the not-admitted finding names the watcher
    And it names the loop whose reference it tried to set

  Scenario: an arbiter setting a target is refused
    Given a target-setting edge from an arbiter to a loop it vetoes
    When the checks are run
    Then the not-admitted finding names the arbiter

  Scenario: an anchor grounded on anything but a frozen rule is refused
    Given a target-setting edge from an anchor grounded on a process exit to a loop
    When the checks are run
    Then the not-admitted finding names the anchor
    And it names the ground it declared

  Scenario: the refusal is reported at the record that declared the edge
    Given a target-setting edge from a watcher to a loop
    When the checks are run
    Then the not-admitted finding is reported at the watcher's own record

  Scenario: an inadmissible source leaves the loop unowned, and the two findings do not cancel
    Given a loop whose only inbound target-setting edge comes from a watcher
    When the checks are run
    Then the not-admitted finding names the watcher
    And the unowned-reference finding names the loop

  Scenario: one admissible source is enough alongside an inadmissible one
    Given a loop with inbound target-setting edges from an actor and from a watcher
    When the checks are run
    Then the not-admitted finding names the watcher
    And no unowned-reference finding names that loop

  Scenario: admissibility is a question about the kind, not about the layer
    Given a target-setting edge from an operational-layer loop to a management-layer loop
    When the checks are run
    Then no not-admitted finding is raised
    And the layer-inversion finding names that edge

  Scenario: a loop setting its own target is refused as it always was
    Given a loop declaring a target-setting edge to itself
    When the checks are run
    Then the existing self-referential finding names it
    And the unowned-reference finding names it

  Scenario Outline: which sources may set a reference
    Given a target-setting edge to a loop from a node of kind <kind> declaring ground <ground>
    When the checks are run
    Then the source is <outcome>

    Examples: the hierarchy has three admissible sources, and the anchor branch is narrowed to one ground
      | kind    | ground        | outcome                    |
      | loop    | none admitted | admitted as ownership      |
      | actor   | exogenous     | admitted as ownership      |
      | actor   | none declared | admitted as ownership      |
      | anchor  | frozen-rule   | admitted as ownership      |
      | anchor  | process-exit  | reported as not admitted   |
      | anchor  | build-stamp   | reported as not admitted   |
      | anchor  | landed-commit | reported as not admitted   |
      | anchor  | live-soak     | reported as not admitted   |
      | anchor  | exogenous     | reported as not admitted   |
      | watcher | none admitted | reported as not admitted   |
      | arbiter | none admitted | reported as not admitted   |
