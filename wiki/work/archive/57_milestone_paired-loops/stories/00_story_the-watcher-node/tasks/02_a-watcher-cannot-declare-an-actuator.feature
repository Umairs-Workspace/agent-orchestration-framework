@executable @cli @work @validate
Feature: A watcher has no vocabulary in which to say it also acts

  Independence could have been a field. A watcher could have declared `independent: true`, and a
  check could have believed it. That is the shape this milestone exists to refuse: a claim the node
  makes about itself, in the artifact the thing being watched can reach.

  So the rule is expressed as an absence instead. An actuator is how a node says it changes the
  world. A watcher is not admitted that key at all — not rejected by a special check, but simply
  outside the grammar. A record that tries is refused by the loader that already refuses keys not
  admitted for a kind, which means this costs no new code and cannot drift out of step with the rest
  of the schema.

  ADR-001. FF-5701.

  Scenario: a watcher declaring an actuator is refused
    Given a watcher record declaring an actuator
    When the registry is loaded
    Then the existing key-not-admitted-for-kind finding names the actuator key
    And it is the only finding raised for the actuator key

  Scenario: the refusal is the loader's, not a check's
    Given a watcher record declaring an actuator
    When the registry is loaded without running any check
    Then the finding is already present

  Scenario: a loop may still declare an actuator
    Given a loop record declaring an actuator
    When the registry is loaded
    Then no finding is raised against the actuator key

  Scenario Outline: which control keys a watcher may carry
    Given a watcher record declaring <key>
    When the registry is loaded
    Then the record <outcome>

    Examples: a watcher observes; it does not control
      | key         | outcome                              |
      | counter     | parses without a finding             |
      | measurement | parses without a finding             |
      | actuator    | reports a key not admitted for kind  |
      | controlled  | reports a key not admitted for kind  |
      | ceiling     | reports a key not admitted for kind  |
      | optimizing  | reports a key not admitted for kind  |
