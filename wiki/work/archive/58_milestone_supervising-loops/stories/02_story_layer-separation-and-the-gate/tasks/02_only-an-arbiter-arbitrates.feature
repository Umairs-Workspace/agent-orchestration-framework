@executable @cli @work @validate
Feature: A shared actuator is cleared only by a node entitled to arbitrate

  Two loops that drive the same actuator are in a standing conflict, and the check that finds them
  clears on any non-contending node that happens to veto all of them — of any kind. So the finding
  can be answered by adding a list of loop ids to a record that says nothing about the trade-off: no
  ordering, no owned knobs, no statement of what is being traded against what. The check is satisfied
  and the conflict is exactly where it was.

  Entitlement is what changes. Only a node of the arbiter kind clears a shared actuator, because the
  arbiter is the kind that must record the trade-off to exist at all — and a node that merely goes
  through the motions of vetoing every contender is not entitled to resolve anything. The two
  standing exclusions survive untouched: a party to the conflict never clears it, and a veto over
  some but not all of the contenders clears nothing.

  The recorded ordering is bound to the veto set so the two cannot drift apart. An arbiter's priority
  list must be a permutation of the contenders it vetoes — no omission, no extra, no repeat — and the
  order within it is the policy, so any order over the right set is admitted. One slip stays one
  finding: an unarbitrated actuator and an incomplete order are separate facts about separate
  records, and each is reported once.

  ADR-003 §5, §6, §9. FF-5805.

  Scenario: an arbiter vetoing every contender clears the shared actuator
    Given an actuator driven by two loops
    And an arbiter vetoing both of them whose priority names exactly those two
    When the checks are run
    Then no unarbitrated finding names that actuator

  Scenario: a node of another kind vetoing every contender clears nothing
    Given an actuator driven by two loops
    And an actor, itself no contender, vetoing both of them
    When the checks are run
    Then the unarbitrated finding names that actuator
    And it names both contenders

  Scenario: a party to the conflict clears nothing, however complete its veto
    Given an actuator driven by three loops
    And one of those loops vetoing all three of them, itself included
    When the checks are run
    Then the unarbitrated finding names that actuator
    And it names all three contenders

  Scenario: a veto over some but not all contenders clears nothing
    Given an actuator driven by three loops
    And an arbiter vetoing two of them
    When the checks are run
    Then the unarbitrated finding names that actuator

  Scenario: an actuator driven by one loop needs no arbiter
    Given an actuator driven by exactly one loop
    When the checks are run
    Then no unarbitrated finding names that actuator
    And no arbitration is required for it

  Scenario: one arbiter can clear several actuators
    Given two actuators whose contenders are drawn from the same four loops
    And an arbiter vetoing all four whose priority names exactly those four
    When the checks are run
    Then no unarbitrated finding is raised

  Scenario: an arbiter whose priority omits a loop it vetoes is reported
    Given an arbiter vetoing three loops whose priority names two of them
    When the checks are run
    Then the priority-incomplete finding names the arbiter
    And it names the loop the order omits

  Scenario: an incomplete order does not un-clear the actuator it arbitrates
    Given an actuator driven by two loops
    And an arbiter vetoing both whose priority repeats one of them
    When the checks are run
    Then the priority-incomplete finding names the arbiter
    And no unarbitrated finding names that actuator

  Scenario: an arbiter that vetoes nothing has recorded an order over nothing
    Given an arbiter declaring a priority over two loops and no veto edge
    When the checks are run
    Then the priority-incomplete finding names the arbiter

  Scenario Outline: who may clear a shared actuator, and on what coverage
    Given an actuator driven by two loops
    And a node of kind <kind>, itself no contender, vetoing <coverage>
    When the checks are run
    Then the actuator is <outcome>

    Examples: entitlement is a property of the kind, and coverage never substitutes for it
      | kind    | coverage             | outcome              |
      | arbiter | both contenders      | cleared              |
      | arbiter | one contender        | reported             |
      | arbiter | neither contender    | reported             |
      | actor   | both contenders      | reported             |
      | actor   | one contender        | reported             |
      | actor   | neither contender    | reported             |
      | loop    | both contenders      | reported             |
      | loop    | one contender        | reported             |
      | loop    | neither contender    | reported             |
      | anchor  | both contenders      | reported             |
      | anchor  | one contender        | reported             |
      | anchor  | neither contender    | reported             |
      | watcher | both contenders      | reported             |
      | watcher | one contender        | reported             |
      | watcher | neither contender    | reported             |

  Scenario Outline: an arbiter's recorded order against the contenders it vetoes
    Given an arbiter vetoing three loops whose priority <order>
    When the checks are run
    Then it is <outcome>

    Examples: the order is the policy, the set is the contract, and the two may never disagree
      | order                                                | outcome                |
      | names those three loops, most important first        | not reported           |
      | names those three loops in some other order          | not reported           |
      | names two of the three                               | reported as incomplete |
      | names those three and a loop it does not veto        | reported as incomplete |
      | names a loop it does not veto instead of one it does | reported as incomplete |
      | names one of the three twice and omits another       | reported as incomplete |
      | names all three and repeats one                      | reported as incomplete |
