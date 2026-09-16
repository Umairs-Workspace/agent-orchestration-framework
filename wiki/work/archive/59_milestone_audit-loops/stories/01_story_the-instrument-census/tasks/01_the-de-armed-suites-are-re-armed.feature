@executable @cli @work @validate
Feature: The de-armed suites are re-armed, and a suite that rots red on the way back says so

  Twenty-six fitness suites were switched off in a single commit and nothing said a word for a month.
  Building the detector without re-arming them would leave this milestone shipping an instrument that
  reports a defect it declined to fix, which is the same species of dishonesty it exists to catch.

  Two of the twenty-six have gone red while dead. That is expected and it is the price of turning them
  back on. What is refused is the move that would make the price disappear: leaving a suite de-armed
  because arming it is inconvenient. A suite that fails on re-arming is repaired, or it is recorded in
  the shrink-only list with its reason and its origin — and recording it is a visible edit somebody has
  to justify, not a number quietly ticking.

  ADR-003 §3. FF-5903.

  Scenario: every previously de-armed suite is part of what the runner assembles
    Given the suites this repository imported and never spread
    When the runner assembles its suite
    Then each of them contributes its tests to what CI will execute

  Scenario: the count of imported-but-never-spread bindings is zero
    Given the runner's imports and what it assembles
    When they are compared
    Then no imported suite binding is absent from the assembled suite

  Scenario: a re-armed suite that fails is reported as failing, not as absent
    Given a re-armed suite whose tests do not pass
    When the suite is run
    Then it is reported as a failing gate
    And it is not reported as unregistered

  Scenario: a re-armed suite that cannot be repaired is carried with its reason
    Given a re-armed suite recorded in the shrink-only list with its reason and its origin
    When the census reports
    Then the entry names why it is carried
    And an entry without a reason is refused

  Scenario: turning a suite back off is refused
    Given a suite that is part of what the runner assembles
    When a change removes it from what the runner assembles without recording a reason
    Then the census reports it by name
    And the report distinguishes it from a suite that was never registered

  Scenario: the re-arming is visible in what CI executes
    Given the assembled suite before and after this story
    When the two are compared
    Then the later one contains every test the earlier one contained
    And it additionally contains the tests the de-armed suites export
