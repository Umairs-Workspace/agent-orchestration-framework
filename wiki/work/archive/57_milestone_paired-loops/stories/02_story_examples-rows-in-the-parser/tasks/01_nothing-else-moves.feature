@executable @cli @work @validate
Feature: Nothing else the parser reports changes

  This parser is read by the work stream validator, by the task lister, and by the rubric lane —
  and the first of those lives in a module with 262 dependents. A change here that shifted any
  existing answer would surface as a failure somewhere with no obvious connection to feature parsing
  at all.

  So the contract of this task is a comparison rather than a behaviour: run the parser over every
  feature this repository contains, before and after, and require that everything it reported before
  it reports identically now. The new key is the only difference. That is a stronger statement than
  any set of hand-written cases could make, because the corpus contains shapes nobody would think to
  write down.

  ADR-005. FF-5704.

  Scenario: every feature in the tree parses to the same five keys
    Given every feature file in the work stream
    When each is parsed before and after the widening
    Then the name, outline, lane, verification and line of every scenario are identical

  Scenario: the litmus answers are unchanged
    Given every feature file in the work stream
    When each is parsed before and after the widening
    Then the first violation and the free-text count are identical

  Scenario: prose after an examples table is still not a violation
    Given a feature with a prose paragraph following an examples table
    When it is parsed
    Then no violation is reported

  Scenario: a step after an examples table is still in step position
    Given a feature with a scenario following an examples table
    When it is parsed
    Then its steps are recognised as steps

  Scenario: feature-level and scenario-level tags are unchanged
    Given a feature carrying tags at both levels
    When it is parsed before and after the widening
    Then the effective tags of every scenario are identical

  Scenario: no consumer of the parser is edited by this milestone
    Given the modules that import the feature parser
    When the milestone's change set is examined
    Then none of them is modified
