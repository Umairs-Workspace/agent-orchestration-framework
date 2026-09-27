@executable @cli @work @validate
Feature: A selected suite that CI never runs is reported as such, by the decider that already knows

  Green on a suite nobody registered says nothing about CI. That is not a hypothetical: it is
  59/FF-5903's finding, and it cost twenty-six suites that were imported and never spread into the
  assembled array — on disk, passing when run by hand, invisible to every gate.

  A selection command makes that failure cheaper to reach, not harder: it runs suite files by name, so
  a file that no runner assembles is exactly as runnable here as one that is. An agent that selects it,
  sees it green, and concludes the change is safe has been misled by a tool built to reassure it.

  The answer is not a new check. Which suite file contributed which entries is already decided, once,
  by the census this project audits registration with. A second derivation — a regex over an import
  line, a spread matcher, a fresh baseline of unregistered suites — is a second answer that agrees
  until the day it does not, and the day it does not is the day someone changes the assembly and only
  one of the two notices.

  So the decider is imported, and the report is this story's. The two are asserted separately: by the
  import, so the reuse is real; and by the absence of the equivalent literals, so a re-home that
  reaches only one half is caught rather than passing on the strength of the surviving edge.

  ADR-004 §4. FF-7203.

  Scenario Outline: what the runner assembles decides what is reported
    Given a suite file that is <state>
    When it is among the selected files
    Then it is reported as <verdict>

    Examples: the registration states a selection can meet
      | state                                                       | verdict                                 |
      | on disk and every test it exports is in the assembled array | registered                              |
      | on disk and its tests are absent from the assembled array   | unregistered                            |
      | imported by the runner and never spread into the array      | unregistered, and imported-never-spread |
      | on disk with the names it exports unreadable                | unregistered, and not decided           |
      | carried in the shrink-only baseline                         | unregistered, with its carried reason   |

  Scenario: a changed file that is not a suite is never reported as one
    Given a changed file that is not a suite file
    When the selection is computed for it
    Then it does not appear among the selected suites
    And it is not reported as unregistered

  Scenario Outline: the unregistered verdict is the census's own, not a re-phrasing
    Given a suite the census decides against with <code>
    When the selection reports it
    Then the reason reported is that code and the message the census gave
    And no reason is reported that the census did not emit

    Examples: the census's own verdict vocabulary
      | code                                 |
      | audit-suite-unregistered             |
      | audit-suite-imported-never-spread    |
      | audit-runtime-membership-unavailable |

  Scenario: the registration decider is reached by import
    Given every module this story adds
    When they are read for how registration is decided
    Then the decision comes from the shared census module by import
    And a module that decides registration without that import is reported

  Scenario Outline: no second registration derivation is authored
    Given <derivation> planted in a module this story adds
    When the modules are read for a second answer to which file contributed which entries
    Then the planted derivation is reported by the file that holds it and by what it duplicates
    And with nothing planted none is found

    Examples: the re-derivations that must not exist
      | derivation                                 |
      | a pattern over a suite import line         |
      | a matcher over a spread row                |
      | a second baseline of unregistered suites   |
      | a second read of the assembled suite array |
