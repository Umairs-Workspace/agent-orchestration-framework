@executable @cli @adapter @validate
Feature: One bounded launch, one expansion rule, and a run that produced no verdict is a failure

  Every child process this milestone starts comes from the bounded spawn seam that already exists —
  argument vector, no shell, deadline armed, kill on expiry, observed exit code handed back. A second
  seam is not a second implementation, it is a second set of defaults, and the defaults are the whole
  value: the shell that is not used, the deadline that is armed, the argv that is never a string.

  That seam's door refuses a shell string, but it lets a bare name through to the operating system —
  the two conditions are conjoined, so a program that simply does not exist is not refused there and
  comes back as a failure to start, far from its cause. The temptation is to relax the door
  so a bare `npm` gets through. The decision runs the other way: the resolver goes in FRONT of the
  door, so the door keeps refusing exactly what it refused before and a program that resolves nowhere
  is a refusal rather than a spawn that fails later and further away.

  Selection reaches the runner through ONE rule. A `style` enum with `positional` and `flag` members
  invites a third, and the third is always the one that does not fit; an argv template with a single
  expanded token has no third case to grow. A positional runner falls out as one shape and a flag
  runner as another, from the same rule.

  The failure this feature exists to prevent is a timeout that reads as a pass. A run killed at its
  deadline produced no verdict, and no verdict is not a green one — a suite that never finished tells
  you nothing about the code, and an agent that reads it as success ships on it.

  ADR-001 §3, §5, §6. FF-7201.

  Scenario: the launch goes through the one bounded seam, with an argument vector and no shell
    Given a resolved toolchain whose invariant prefix holds an argument containing a space
    When the runner is launched
    Then the launch went through the shared bounded spawn seam
    And the program and each argument reached the seam as separate elements of one vector
    And the argument containing a space arrived as a single element, unsplit and unquoted
    And no shell option was passed to the seam
    And the deadline handed to the seam is the one the declaration states, not the seam's own default

  Scenario Outline: the selection template expands once per selected file, and nothing else expands
    Given a resolved toolchain whose selection template is <template>
    When an argument vector is assembled for <files>
    Then the arguments after the invariant prefix are <vector>
    And no element of the vector is an empty string
    And no flag is left standing without the operand it introduces

    Examples: a positional runner — the template is the token alone
      | template     | files                                | vector                       |
      | ["{file}"]   | no files                             | []                           |
      | ["{file}"]   | one file a.test.mjs                  | ["a.test.mjs"]               |
      | ["{file}"]   | three files a, b and c               | ["a", "b", "c"]              |
      | ["{file}"]   | one file whose path contains a space | ["a suite.test.mjs"]         |

    Examples: a flag runner — the flag is stated once and the token expands beside it; zero files is the row that catches a dangling flag
      | template               | files                  | vector                        |
      | ["--only", "{file}"]   | no files               | []                            |
      | ["--only", "{file}"]   | one file a.test.mjs    | ["--only", "a.test.mjs"]      |
      | ["--only", "{file}"]   | three files a, b and c | ["--only", "a", "b", "c"]     |

    Examples: a token that is not the file token is not a placeholder — it is neither expanded nor dropped
      | template                        | files               | vector                              |
      | ["{root}"]                      | one file a.test.mjs | ["{root}"]                          |
      | ["--only", "{file}", "{suite}"] | one file a.test.mjs | ["--only", "a.test.mjs", "{suite}"] |
      | ["{files}"]                     | three files a, b, c | ["{files}"]                         |
      | ["{root}"]                      | no files            | []                                  |

  Scenario Outline: what the seam observed decides what is reported and what the status is
    Given a bounded seam that returns the outcome <outcome> with exit code <code>
    When the runner is launched
    Then what is reported is <reported>
    And the exit status is <status>
    And a run that finished no suite is never reported as a passing one

    Examples: the seam's three outcomes and the two shapes of a completed run — this module MAPS the status, 72/02 spends it
      | outcome          | code | reported                                                      | status   |
      | exited           | 0    | the run's own verdict, a pass                                 | zero     |
      | exited           | 1    | the run's own verdict, a failure carrying the code observed   | non-zero |
      | deadline-expired | none | the deadline expiry named as itself, with the bound applied   | non-zero |
      | not-started      | none | the failure to start named as itself, with what was attempted | non-zero |

  Scenario: an expiry and a failure to start are not test failures wearing another name
    Given a bounded seam that returns a deadline expiry
    And a bounded seam that returns a failure to start
    When each is launched
    Then neither is reported as a test failure, and neither is reported as a pass
    And each is distinguishable from the other, and from a run that exited non-zero

  Scenario Outline: a second way to start a child process fails the census
    Given <planted> planted in a module this story adds
    When the modules this story adds are read for a way to start a child process
    Then the census fails naming that module

    Examples: the forms 59/FF-5904 forbids over the audit family, censused here over this one
      | planted                             |
      | an import of node:child_process     |
      | a use of exec                       |
      | a use of execFile                   |
      | a use of execSync                   |
      | a use of spawnSync                  |
      | a use of fork                       |
      | a spawn option requesting a shell   |
      | a spawn option naming a shell path  |

  Scenario: the seam this story reuses is not itself the finding
    Given the modules this story adds, unaltered
    When they are read for a way to start a child process
    Then the census passes
    And the shared seam's own import of the process module is not reported, because that seam is not a module this story adds
    And importing the seam's bounded entry point is not reported as a spawn of its own
