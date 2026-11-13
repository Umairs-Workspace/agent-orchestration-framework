@executable @cli @assets @validate
Feature: A check that read the moved prose still reads it

  WHY. Suites and controls read core's command sources by path. A passage that moves out of a
  source moves out of their sight, and a check that finds nothing to judge passes. Each check
  that covered the moved prose must cover it where it now is, and prove it can still fail
  (ADR-005 §7).

  Scenario: the discovery prose suite reads what a project with discovery on is given
    When the discovery prose suite reads the refine command and the three briefs
    Then it reads them from a render with "work.examples.enabled" on
    And it still reads this checkout's committed copies beside them

  Scenario Outline: a deleted sentence still turns its suite red
    Given the sentence <sentence> is deleted from its fragment file
    When <suite> runs
    Then it fails

    Examples:
      | sentence                                                          | suite                           |
      | "A business question is never given a default in a driven session" | the discovery prose suite       |
      | "The PO drafts the example map"                                   | the discovery prose suite       |
      | "It restates no declared path."                                   | the build plan's document suite |

  Scenario: a number in a fragment is still held to its home in code
    Given a fragment states a number that no code declares
    When the control that holds every prompt bound to its home runs
    Then it fails and names the fragment file

  Scenario: the plan's restatement ban still covers the build brief's prose
    When the control that the build plan restates no declared path runs
    Then it reads the build brief from its fragment file
    And it still reads the shipped plan template

  Scenario: a control that sweeps the bundle's prose sweeps the fragments
    When the controls that sweep core's command and agent sources are listed
    Then each one that judged a moved passage now also reads the fragment files of core and of every registered practice

  Scenario: the Codex refine check asserts the map only where discovery is on
    When the Codex runtime-variant suite renders the refine skill
    Then it expects the example map in a render with discovery on
    And it expects no example map in the canonical render

  Scenario: the one-way dependency controls still pass
    When the controls that the practice packages are depended on one way run
    Then each passes with the practices registry as an admitted importer in core
