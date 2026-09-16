@executable @cli @work @validate
Feature: The drift check — a committed projection of a deterministic function is a thing CI can check

  This is the payoff, and it is the reason committing the artefact is worth more than piping the
  command to a file. The Mermaid output is byte-deterministic and frozen by 52/FF-5208. A committed
  projection of a deterministic function can be regenerated and compared: a non-empty difference means
  somebody edited a loop record and did not regenerate the graph. That check cannot exist until the
  artefact does, which is why it lands with it and not later.

  THE CHECK IS A CONTROL IN THE RUNNABLE TEST TREE, not a work-item gate. Story 79's scope excludes
  making the graph gate anything: no item transition, no acceptor, no doctor severity depends on it.
  What it gates is the test suite — the same way every other structural invariant in this repository
  is held.

  IT MUST FAIL LOUDLY AND USEFULLY. A guard that reds with "files differ" teaches nothing; the reader
  is one command away from green and the message has to say so. And it must never repair the file
  itself: a check that regenerates on failure is not a check.

  Scenario: the check passes when the committed document matches a fresh render
    Given a committed loop document generated from the current registry
    When the check runs
    Then it passes

  Scenario: a registry edit without regeneration reds the check
    Given a committed loop document
    And a loop record edited without regenerating the document
    When the check runs
    Then it fails
    And the failure names the committed document
    And the failure names the command that regenerates it

  Scenario Outline: every kind of registry drift is caught
    Given a committed loop document
    And the registry drifts by <drift>
    When the check runs
    Then it fails

    Examples: drift a reviewer would otherwise not see
      | drift                                       |
      | a record added                              |
      | a record removed                            |
      | an edge added between declared nodes        |
      | an edge removed                             |
      | a record's title changed                    |
      | a record's ceiling changed                  |
      | a finding-raising edge introduced           |

  Scenario: the check reads and renders, and writes nothing
    Given a committed loop document that is stale
    When the check runs and fails
    Then the committed document is left byte-identical
    And no file anywhere is created or modified by the check

  Scenario: an absent document is reported, not silently passed
    Given a project with a loop registry and no committed loop document
    When the check runs
    Then it fails
    And the failure states that the document is absent rather than that it matched

  Scenario: the check renders through the same door the writer uses
    Given the check and the writer
    Then both obtain the document's bytes from the registered command's composition
    And the check restates no part of the document's shape of its own

  Scenario: the check gates the suite and nothing in the work lifecycle
    Given the committed loop document is stale
    When a work item's status is moved, its doctor snapshot is taken, and the stream is validated
    Then none of the three reports a finding sourced from the stale document
    And no acceptor door reads the document

  Scenario: the check is registered in a runner and reachable by the project's own test command
    Given the project's declared test command
    When the suite is selected for the check's file
    Then the check runs
    And it is not discoverable only by being named by hand
