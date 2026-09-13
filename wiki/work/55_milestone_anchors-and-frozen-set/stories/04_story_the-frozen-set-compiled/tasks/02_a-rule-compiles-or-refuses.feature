@executable @cli @assets @distribution
Feature: A declared rule reaches its enforcement point, or the compile refuses

  The failure this exists to prevent is not a rule that blocks the wrong thing — it is a rule that
  blocks nothing while reporting as enforced. A frozen set with a member that silently failed to
  compile is strictly worse than no frozen set, because the operator now believes something is
  guarding them.

  So the compile is all-or-nothing per member and loud about it. A member that cannot reach its
  enforcement point produces a refusal with a code, not a warning line in a wall of output and not a
  skip. This is the same reasoning that made the autonomy ladder's lock structural rather than a
  sentence in a document: a guarantee that degrades quietly is not a guarantee.

  ADR-004. FF-5505.

  Scenario: a member that cannot reach its enforcement point refuses the compile
    Given a declared member whose enforcement point cannot be written
    When the frozen set is compiled
    Then the compile is refused with a code naming the member

  Scenario: a refused compile does not partially apply
    Given a frozen set of several members where one cannot compile
    When the compile is attempted
    Then no member's rule is written

  Scenario: a successful compile reports what it installed
    Given a frozen set that compiles cleanly
    When it is compiled
    Then each installed member is reported by id

  Scenario: a blocked call carries the reason a person can act on
    Given a compiled rule and an action it forbids
    When the action is attempted
    Then it is blocked
    And the reason names the member and what it protects

  Scenario: an action the rule does not forbid is not blocked
    Given a compiled rule and an action outside what it protects
    When the action is attempted
    Then it proceeds

  Scenario: a rule that cannot decide gets out of the way
    Given a compiled rule handed input it cannot interpret
    When it evaluates
    Then it does not block
