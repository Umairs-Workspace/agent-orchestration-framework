@executable @cli @work @validate
Feature: A watcher must say what it counts, and whether a machine or a model produces the number

  A watcher whose counter-metric is left implicit is decoration with a kind attached. The whole value
  of declaring the pairing is that a reader can see, without running anything, that the number being
  watched is a different quantity from the number being optimised — and that is only legible if the
  record says what it counts.

  The second required field is the one that keeps this milestone honest about its own limits.
  "Counters beat judges" cannot be enforced by demanding a counter, because whether a metric admits a
  deterministic computation is not decidable from a record. What this grammar can enforce is that the
  record says which it is. Whether that declaration agrees with its authorities is a pairing check,
  owned and contracted by 57/01 rather than by this loader story.

  There is deliberately no default. A missing determinism is a missing field, not an assumed judge —
  because an assumed value is a value nobody chose, and this is exactly the field where an unchosen
  value would be a lie about how a number was made.

  ADR-001. FF-5701.

  Scenario: a complete watcher declares its counter, its determinism and its measurement
    Given a watcher declaring all three fields
    When the registry is loaded
    Then it is parsed without a finding
    And the counter-metric it declares is readable off the node

  Scenario: an absent determinism is a missing field, not a default
    Given a watcher declaring a counter and a measurement but no determinism
    When the registry is loaded
    Then a missing-field finding names the determinism key
    And the parsed node carries no determinism value

  Scenario: a prose-backed measurement is named as prose-backed, as it is for a loop
    Given a watcher whose measurement is backed only by prose
    When the registry is loaded
    Then the existing prose-only finding names the measurement field
    And no watcher-specific variant of that finding is emitted

  Scenario Outline: which fields a watcher must carry
    Given a watcher record omitting <field>
    When the registry is loaded
    Then the record <outcome>

    Examples: identity and the three declarations are all required
      | field       | outcome                        |
      | id          | reports a missing field        |
      | kind        | reports a missing field        |
      | title       | reports a missing field        |
      | counter     | reports a missing field        |
      | determinism | reports a missing field        |
      | measurement | reports a missing field        |

  Scenario Outline: what determinism admits
    Given a watcher declaring determinism as <value>
    When the registry is loaded
    Then the record <outcome>

    Examples: two literals, no third, no default
      | value       | outcome                   |
      | counter     | parses without a finding  |
      | judge       | parses without a finding  |
      | deterministic | is refused as a bad value |
      | unknown     | is refused as a bad value |
      | true        | is refused as a bad value |
