@executable @cli @work @validate
Feature: Every sweep says what it read, and a sweep that read nothing is a finding

  A sweep that found no problems and a sweep that looked at nothing produce the same output: silence.
  The second is the failure this milestone exists to catch, and it has already happened here — a
  renamed fixture root turned a probe into a comparison of nothing with nothing, and it passed.

  So a clean result is not something this census can express on its own. Every sweep reports the size
  of the population it considered together with the floor it expected, and a sweep whose count falls
  below its floor reports that it ran on nothing, naming the sweep, the root it walked and the floor
  it missed. Absence is a finding, not an omission.

  ADR-004 §1. FF-5908.

  Scenario: a clean sweep still says how much it read
    Given a test tree in which every suite is registered
    When the census runs
    Then it reports no registration failures
    And it reports the number of suites it considered
    And it reports the floor that number had to clear

  Scenario: a sweep whose root has moved reports that it ran on nothing
    Given a census sweep pointed at a root that holds no suites
    When the census runs
    Then it reports that the sweep ran on nothing
    And the finding names the sweep, the root it walked and the floor it missed
    And it does not report the sweep as clean

  Scenario: a population below the floor is a finding even when it is not zero
    Given a census sweep that considered fewer suites than its floor
    When the census runs
    Then it reports that the sweep ran on nothing
    And the finding quotes both the count and the floor

  Scenario: a truncated read is caught by the same rule
    Given a runner whose assembled suite could not be obtained in full
    When the census runs
    Then it reports what it was able to read
    And it does not report registration as clean over the part it could not see

  Scenario: every sweep the census registers carries a floor
    Given the sweeps the census registers
    When each is inspected
    Then every one of them declares a floor
    And a sweep that declares no floor is refused rather than defaulted

  Scenario: the read count survives the finding list being empty
    Given a census run that produced no findings at all
    When its result is read
    Then the population it considered is still readable from the result
