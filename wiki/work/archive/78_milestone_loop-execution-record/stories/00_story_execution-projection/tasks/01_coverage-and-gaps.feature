@executable @cli @work @work-stream
Feature: Join coverage, and the three gaps that are the finding

  MEASURED AT REFINE, 2026-09-03: of 61 run records under `wiki/work`, **0** carried `brief.loop`,
  58 carried an empty `brief` and 61 carried `sessionId: null`. Milestone 53 is `done` and its writer
  exists; what does not exist is a single run in this repository's history that was driven through the
  loop shell. So an empty answer is what this projection returns for every item here today.

  THAT MAKES THE EMPTY ANSWER THE PRIMARY CASE (ADR-003), and it must be distinguishable from a broken
  projection. A model that renders nothing without saying why is the observability report over again —
  the failure `SPEC.md` opens by naming. So the model ALWAYS carries its own join coverage: how many
  run records were found for the item, how many carried a loop declaration, and the ratio. Zero is a
  measurement here, never an absence.

  THE GAPS ARE THREE, NOT ONE (ADR-005), because they have three different remedies: instrument the
  loop, drive it, or fix the registry. A single bucket would erase that distinction, which is the
  whole value of naming them.

  Scenario: coverage is stated even when nothing joined
    Given 14 run records for the item, none carrying a `brief.loop` declaration
    When the execution model is projected
    Then it reports 14 runs found and 0 carrying a loop declaration
    And it reports the coverage ratio as zero
    And it reports no engagements

  Scenario: a zero-coverage model is not the same object as a model built from no runs at all
    Given an item with 14 runs, none carrying a declaration
    And an item with no run records at all
    When the execution model is projected for each
    Then the first reports 14 runs found and the second reports 0
    And the two models are not equal

  Scenario: coverage counts records, not engagements
    Given 10 run records for the item, of which 6 carry declarations across 2 `loopRunId` values
    When the execution model is projected
    Then it reports 10 runs found and 6 carrying a loop declaration
    And it reports 2 engagements

  Scenario Outline: each gap class is produced by its own cause and named separately
    Given <fixture>
    When the execution model is projected
    Then a <gap> gap is reported, naming <subject>

    Examples: the three classes of ADR-005
      | gap                  | fixture                                                                        | subject                       |
      | ran-undeclared       | a run declaring `loop:not-in-the-registry`                                      | the unresolved loop id        |
      | declared-never-ran   | a registry loop with no run carrying its id                                     | the loop that never ran       |
      | authority-unresolved | a run of a loop whose registry record cites an actuator the grammar cannot resolve | the unresolved endpoint    |

  Scenario: the three gap classes are reported separately, never merged into one list
    Given a fixture producing one gap of each class at once
    When the execution model is projected
    Then the model reports each class under its own name
    And no gap appears in more than one class

  Scenario: `declared-never-ran` is bounded by the registry, not by the work stream
    Given a registry of 17 loop records and an item with no engagements
    When the execution model is projected
    Then every declared loop is reported as `declared-never-ran`
    And the count of that class does not exceed the number of registry loop records

  Scenario: a resolved authority produces no gap
    Given an engagement of a loop whose registry record cites an actuator the grammar resolves
    When the execution model is projected
    Then no `authority-unresolved` gap is reported for that loop

  Scenario: gaps are ordered canonically so the rendered record is stable
    Given a fixture producing several gaps within one class
    When the execution model is projected twice
    Then the gaps appear in the same order both times
    And that order is by the subject's code-unit sort
