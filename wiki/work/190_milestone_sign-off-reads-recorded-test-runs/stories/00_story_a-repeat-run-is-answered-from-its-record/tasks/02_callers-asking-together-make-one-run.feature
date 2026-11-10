@executable @cli @work @validate
Feature: callers asking together make one run

  WHY. The review lanes start together on one diff, so without coordination three runners start
  before any record exists (ADR-002 §4). A caller that finds a run already in flight that would
  answer its question waits for that run's record instead of starting a second runner. The wait is
  bounded by the toolchain's `deadlineMs`. A lock whose owner has gone is reclaimed, and neither a
  reclaim nor a timeout is ever reported as a pass. The shape is m167/ADR-003's single-flight read.
  The cases drive two `runTest` calls in one process against a gated fake runner, and plant a lock
  file for the dead-owner rows.

  Rule: R3 · Asking together costs one run

    Scenario: E9 · three callers, one runner
      Given a fake runner that holds until it is released, then exits 0
      When three `aof test --scope impacted --story 190/00` calls start on the same content before it is released
      And the runner is released
      Then the runner was launched once
      And two of the three results carry `reused` naming the third's record
      And all three exit 0

    Scenario: a caller whose question the in-flight run would not answer does not wait
      Given a run in flight for `a.test.mjs` on the current content
      When `aof test` is asked for `a.test.mjs` and `b.test.mjs`
      Then a second runner is launched without waiting

    Scenario Outline: a lock nobody will release is reclaimed, never trusted
      Given a lock for the question on the current content whose <owner>
      When the question is asked
      Then the runner is launched once
      And the result does not carry `reused`
      And the summary line says `reclaimed a stale lock`

      Examples:
        | example | owner                                               |
        | E10     | process id names no running process                 |
        |         | start instant is older than the toolchain's `deadlineMs` |

    Scenario: a waiter that outlives the deadline runs the suite itself
      Given a run in flight that will not finish inside the toolchain's `deadlineMs`
      When a second caller has waited that long
      Then the second caller launches the runner itself
      And neither result is reported green on the strength of the other
