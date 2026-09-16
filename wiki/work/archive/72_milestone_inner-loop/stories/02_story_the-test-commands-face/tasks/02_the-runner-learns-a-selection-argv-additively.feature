@executable @cli @work @validate
Feature: This repo's runner learns to run named suites, without disturbing the array it already assembles

  aof's own runner is an ordinary consumer of the declaration, not a special case — which means this
  repo has to teach `scripts/test.mjs` a selection argv like any other project would.

  The obvious implementation is the wrong one. The exported suite array is flat: an entry records its
  name and how to run it, and nothing records which file produced it. So selection cannot be a filter
  over that array, and an attempt to make it one ends in a second registry keyed by filename — the
  duplication this milestone exists to indict. Selection is a SEPARATE PATH that imports the named
  suite files and takes what they export, using the same runner-shaped detection the audit probe
  already uses.

  The array must also be left completely alone. The file's own comment at the array's foot says
  appending after the terminal comma-less row mints a new registration digest; measured at HEAD the
  control's spread matcher now tolerates a comma-less row, so that hazard no longer reproduces and the
  comment is stale. The rule outlives its rationale — nothing here appends, reorders or restructures
  the array — but the check that says so has to be one an append would actually fail, and a digest
  that legitimately moves when the runner's own logic changes cannot be that check. The array is read
  by the existing path and by nothing this change adds.

  The subtle one is isolation. Every test runs under its own isolated global home, and that isolation
  lives inside the existing execution loop along with the pass/fail printing and the failure count. A
  selected path with its own copy of that loop is a path where isolation quietly stops applying — the
  suite writing into the real global home, which this repo has already been bitten by hard enough to
  install a hook against. One loop, called by both paths.

  ADR-004 §1, §2, §3.

  Scenario Outline: what the runner does with the files a selection names
    Given the runner invoked with <named files>
    When it runs
    Then <what runs>
    And the exit status is <status>

    Examples: every shape the selection argv can be handed
      | named files                                                     | what runs                                                                                    | status        |
      | one suite file                                                  | only the tests that file exports                                                             | the run's own |
      | three suite files                                               | only the tests those three files export                                                      | the run's own |
      | no file at all                                                  | nothing runs, and the runner refuses, naming the option                                      | non-zero      |
      | a file that exports no runnable tests                           | nothing from it runs, and it is reported unusable                                            | non-zero      |
      | a file that is not on disk                                      | nothing from it runs, and it is reported unusable, naming the path                           | non-zero      |
      | two files, one usable and one not                               | the usable file's tests run, and the unusable one is still reported                          | non-zero      |
      | a suite file on disk that the assembled array does not register | its tests run, an unregistered suite being the command's report to make and not the runner's | the run's own |

  Scenario: named suite files are run without reading the assembled array
    Given the runner invoked with two named suite files
    When it runs
    Then only the tests those two files export are run
    And no test the assembled array registers but the named files do not export is run

  Scenario Outline: a change to the assembled array is detected
    Given the ordered rows between a runner FIXTURE's exported array brackets
    When they are compared against <mutation>
    Then the comparison <verdict>
    And nothing in the comparison read this repository's own runner, whose array four sibling stories also append to

    Examples: the mutations it must catch, and the one diff it must admit
      | mutation                                                                                          | verdict          |
      | a row appended after the terminal row, which commas the row before it                             | reports a change |
      | a row appended above the terminal row                                                             | reports a change |
      | two rows swapped                                                                                  | reports a change |
      | a row removed                                                                                     | reports a change |
      | a trailing comma added to the terminal row                                                        | reports a change |
      | this story's own transform applied to that fixture, which adds an argv reader and parameterises one execution loop and leaves the rows alone | reports no change |

  Scenario: the control that freezes the runner outside its registration blocks is green
    Given the runner as this story leaves it
    When the registration control is run against it
    Then it reports no problem

  Scenario: both paths run through one execution loop
    Given the runner's source
    When it is read for the loop that prints results and counts failures
    Then exactly one such loop exists
    And both the full path and the selected path call it

  Scenario Outline: a selected test runs isolated, driven rather than stated
    Given a suite file of two tests, each recording the global home it ran under
    When the runner is invoked with that file named as the selection
    Then <observation>

    Examples: what a second copy of the execution loop would silently stop doing
      | observation                                                |
      | neither test ran under the machine's real global home      |
      | the two tests ran under different global homes             |
      | each test's global home was empty when its test began      |
      | the ambient global home is what it was before the run      |

  Scenario Outline: importing the runner runs nothing, whatever the importing process's argv holds
    Given a process whose argv is <argv>, importing the runner for its assembled array
    When the import completes
    Then the assembled array is available to the importer
    And no test was run and no exit status was set

    Examples: an importer's argv is not the runner's argv
      | argv                           |
      | no argument beyond the module  |
      | a selection naming a suite file |
