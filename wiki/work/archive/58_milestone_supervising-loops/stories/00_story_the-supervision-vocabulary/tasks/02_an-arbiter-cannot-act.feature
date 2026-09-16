@executable @cli @work @validate
Feature: An arbiter has no vocabulary in which to say it also acts, measures, cycles or grounds itself

  Milestone 57 closed this door once, for the watcher, and closed it as an absence rather than a
  check: a node that cannot declare an actuator cannot declare that it acts on what it watches. The
  same door is closed here and it is wider. A node that resolves a conflict between loops must not be
  able to declare that it also pulls one of the actuators it is arbitrating over, must not report a
  measurement of the contest it is judging, has no place on the timescale axis because it is not a
  cycle, and may not issue itself the authority that grounds the graph.

  Four keys are therefore outside the grammar for this kind, and the restriction is per kind rather
  than global. A loop declares all of the first three today and will keep declaring them; an actor
  and an anchor keep their ground. What changes is only that one kind admits none of them, so the
  arbiter cannot say it acts even by accident.

  It costs no new code and cannot drift out of step with the rest of the schema, because the refusal
  is the one the loader already issues for a key not admitted for a kind. This story adds no check
  and no finding code: what refuses these records is the reader, before anything is asked to judge
  them.

  ADR-003 §3. ADR-004 §5. FF-5801, FF-5804.

  Scenario: an arbiter declaring an actuator is refused
    Given an arbiter record declaring an actuator
    When the registry is loaded
    Then the existing key-not-admitted-for-kind finding names the actuator key
    And it is the only finding raised for the actuator key

  Scenario: the refusal names both the key and the kind
    Given an arbiter record declaring an actuator
    When the registry is loaded
    Then the finding's message names the actuator key and the arbiter kind
    And the value it declared is not parsed onto the node

  Scenario: the refusal is the loader's, not a check's
    Given an arbiter record declaring a measurement
    When the registry is loaded without running any check
    Then the finding is already present

  Scenario: a loop may still declare all four keys
    Given a loop record declaring an actuator, a measurement and a cadence
    And an actor record declaring a ground
    When the registry is loaded
    Then no finding is raised against any of those keys

  Scenario: a key no kind admits is refused as unknown, not as a key admitted elsewhere
    Given an arbiter record declaring a dead-band
    When the registry is loaded
    Then the existing unknown-key finding names it
    And no kind admits that key

  Scenario Outline: which of the four keys each kind may carry
    Given a record of kind <kind> declaring <key>
    When the registry is loaded
    Then the record <outcome>

    Examples: the four keys by which a node acts, measures, cycles or grounds itself, across every declared kind
      | key         | kind    | outcome                             |
      | actuator    | loop    | admits the key                      |
      | actuator    | actor   | reports a key not admitted for kind |
      | actuator    | anchor  | reports a key not admitted for kind |
      | actuator    | watcher | reports a key not admitted for kind |
      | actuator    | arbiter | reports a key not admitted for kind |
      | measurement | loop    | admits the key                      |
      | measurement | actor   | reports a key not admitted for kind |
      | measurement | anchor  | reports a key not admitted for kind |
      | measurement | watcher | admits the key                      |
      | measurement | arbiter | reports a key not admitted for kind |
      | cadence     | loop    | admits the key                      |
      | cadence     | actor   | reports a key not admitted for kind |
      | cadence     | anchor  | reports a key not admitted for kind |
      | cadence     | watcher | reports a key not admitted for kind |
      | cadence     | arbiter | reports a key not admitted for kind |
      | ground      | loop    | reports a key not admitted for kind |
      | ground      | actor   | admits the key                      |
      | ground      | anchor  | admits the key                      |
      | ground      | watcher | reports a key not admitted for kind |
      | ground      | arbiter | reports a key not admitted for kind |
