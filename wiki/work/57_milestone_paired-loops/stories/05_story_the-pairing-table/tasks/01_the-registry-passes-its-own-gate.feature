@executable @cli @work @validate
Feature: The shipped registry passes the gate the milestone imposes on everyone else

  A framework that ships a gate its own artifacts fail is a framework whose gate gets disabled in the
  first project that installs it. This task is the proof that does not happen: run the milestone's
  own checks over the registry aof ships, and require a clean result.

  Clean means more than "every loop has an edge". Each of the independence legs has to pass on merit
  — the watcher must read a different artifact than the loop it watches, count a different quantity
  than the loop controls, and back its deterministic claim with a pointer at something that runs. A
  table that satisfied the pairing check while failing the independence legs would be exactly the
  decoration this milestone was written to catch.

  ADR-002, ADR-003, ADR-007. FF-5708.

  Scenario: the shipped registry produces no gating findings
    Given the registry as it ships
    When the validate run completes
    Then it reports no errors

  Scenario: no optimizing loop is unpaired
    Given the registry as it ships
    When the checks are run
    Then no unpaired-optimizer finding is raised

  Scenario: no watcher shares its loop's measurement
    Given the registry as it ships
    When the checks are run
    Then no shared-measurement finding is raised

  Scenario: no watcher shares its loop's actuator
    Given the registry as it ships
    When the checks are run
    Then no shared-actuator finding is raised

  Scenario: no counter restates the loop's controlled variable
    Given the registry as it ships
    When the checks are run
    Then no counter-equals-controlled finding is raised

  Scenario: no watcher claims determinism it does not have
    Given the registry as it ships
    When the checks are run
    Then no not-deterministic finding is raised

  Scenario: no watcher in the shipped table is a judge
    Given the registry as it ships
    When the checks are run
    Then no judge report names a shipped watcher

  Scenario: no loop or watcher declares an arch-failure count as its metric
    Given the registry as it ships
    When each loop's controlled variable and each watcher's counter are read
    Then none of them is a count of failing fitness functions

  Scenario: the warnings that were there before are still only warnings
    Given the registry as it ships
    When the validate run completes
    Then the findings inherited from earlier milestones are reported as warnings
