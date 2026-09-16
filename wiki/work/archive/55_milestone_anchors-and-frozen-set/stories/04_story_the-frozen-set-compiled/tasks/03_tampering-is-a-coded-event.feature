@executable @cli @assets @distribution
Feature: Editing a frozen rule is a tamper with a name, and the human's way out still works

  The settings writer already notices when one of its own entries has been edited and restores it
  with a warning. That is the right behaviour for a preference. It is not sufficient for a frozen
  rule, because the whole point of the frozen set is that these are the rules an optimizer is not
  permitted to touch — so an edit to one is a different event from an edit to a preference, and it
  needs a name that something downstream can act on.

  What must not change is the way out. Removing the ownership marker makes an entry the operator's,
  permanently and completely, and the warning text says so. A frozen set a human cannot opt out of
  is a frozen set that owns the human, which inverts the one thing this whole arc treats as
  exogenous: the person decides what is worth controlling.

  ADR-004. FF-5506.

  Scenario: an edited frozen rule is reported as a tamper carrying its member id
    Given a compiled frozen rule whose on-disk entry has been edited
    When the frozen set is compiled again
    Then a tamper event is reported naming the member

  Scenario: a tamper is distinguishable from ordinary drift
    Given an edited frozen rule and an edited non-frozen aof entry
    When the frozen set is compiled
    Then the frozen one is reported as a tamper
    And the other is reported as drift

  Scenario: an edited frozen rule is restored to its declared value
    Given a compiled frozen rule that has been edited
    When the frozen set is compiled again
    Then the entry matches the declaration

  Scenario: removing the ownership marker hands the entry to the operator
    Given a compiled frozen rule whose ownership marker has been removed
    When the frozen set is compiled again
    Then the entry is not edited
    And it is not retracted
    And it is not re-marked as aof's

  Scenario: an entry the operator has taken is not reported as a tamper
    Given an entry whose ownership marker has been removed
    When the frozen set is compiled
    Then no tamper is reported for it

  Scenario: the way out is stated where the person will see it
    Given a tamper has been reported
    When the report is read
    Then it names how to keep the edit
