@executable @cli @work @validate
Feature: The item's acceptance criteria may not get smaller while its code is made to pass

  This is the leg that names the build loop's most direct cheat: the scenario that would not go green
  is deleted, and the loop reports success. Counting executable scenarios across the item's task
  features catches it, and it costs about a second.

  Counting only scenarios would leave the hole spike 56 measured. A fifth of the scenarios in this
  tree are Outlines, and an Outline's rows are its acceptance criteria — so deleting rows from a
  table shrinks the contract without changing the scenario count at all. The leg counts both, which
  is why the parser had to learn to see rows first.

  A criterion moving between files inside the same item is not a shrink. The count is the item's
  total, not any single file's, because reorganising task features is ordinary work and a counter
  that fired on it would be switched off within a week.

  ADR-004. FF-5705.

  Scenario: a deleted executable scenario fires the leg
    Given an item whose task features lose an executable scenario between base and head
    When the ratchet runs
    Then the contract leg fires
    And it reports the count before and after

  Scenario: deleted examples rows fire the leg
    Given an item whose outline loses two rows from its examples table
    When the ratchet runs
    Then the contract leg fires

  Scenario: an added scenario does not fire the leg
    Given an item whose task features gain an executable scenario
    When the ratchet runs
    Then the contract leg does not fire

  Scenario: an unchanged contract does not fire the leg
    Given an item whose task features are byte-identical between base and head
    When the ratchet runs
    Then the contract leg does not fire

  Scenario: a scenario moved between task features is not a shrink
    Given an item whose scenario moves from one task feature to another
    When the ratchet runs
    Then the contract leg does not fire

  Scenario: a scenario retagged away from executable is a shrink
    Given an item whose executable scenario is retagged as manual
    When the ratchet runs
    Then the contract leg fires

  Scenario: a new task feature added to the item counts toward the total
    Given an item that gains a task feature carrying three executable scenarios
    When the ratchet runs
    Then the contract leg does not fire

  Scenario: the leg counts the item's own tasks and nothing else
    Given an item whose sibling story loses a scenario
    When the ratchet runs for the first item
    Then the contract leg does not fire

  Scenario Outline: what counts as the contract getting smaller
    Given an item whose head differs from its base by <change>
    When the ratchet runs
    Then the contract leg <outcome>

    Examples: scenarios and rows are both criteria
      | change                              | outcome        |
      | one executable scenario deleted     | fires          |
      | one examples row deleted            | fires          |
      | one executable scenario added       | does not fire  |
      | one examples row added              | does not fire  |
      | a scenario renamed                  | does not fire  |
      | a scenario moved between task files | does not fire  |
      | an executable scenario made manual  | fires          |
