Feature: A unit out of time is not finished
  A unit the runner kills at its time limit is reported as not finished, apart from the failures,
  and is never retried. Only a failing case makes a run red.

  Rule: R1 · A unit that runs out of time is not finished, never failed

    @executable @cli @work @work-stream
    Scenario: E1 · a killed integration lane is not finished, and nothing is red
      Given a sharded run where every case passes and the unit "integration lifecycle" is killed at its 20-minute limit
      When the run reports
      Then it prints "# not finished - integration lifecycle" and no "not ok" line
      And the gate's row is "not-finished", its detail names "integration lifecycle", and it lists no failures

    @executable @cli @work @work-stream
    Scenario: E2 · a failing case and a killed unit make a red row with both named apart
      Given a sharded run where the case "work/x: 01 refuses" fails twice and the unit "test/loop/loop-command-wave.test.mjs" is killed at its limit
      When the run reports
      Then the gate's row is "red"
      And its detail lists "work/x: 01 refuses" as a failure and names the killed unit under "not finished"

    @executable @cli @work @work-stream
    Scenario: E3 · a killed unit is not retried alone
      Given a pool whose unit is killed at its time limit
      When the pool drains
      Then no alone-retry of that unit runs

    @executable @cli @work @work-stream
    Scenario Outline: The row's result, by precedence
      Given a run with <failures> failing cases, <killed> units not finished, ending by <end>
      When the gate composes its row
      Then the result is "<result>"

      Examples:
        | failures | killed | end                         | result       |
        | 0        | 0      | the program exiting 0       | green        |
        | 1        | 0      | the program exiting 1       | red          |
        | 1        | 2      | the program exiting 1       | red          |
        | 0        | 1      | the program exiting 1       | not-finished |
        | 0        | 0      | the gate's deadline expiring | not-finished |

    @executable @cli @work @work-stream
    Scenario: The TAP reader counts no failure for a not-finished unit
      Given a report holding "# not finished - integration lifecycle" and no "not ok" line
      When aof test reads it
      Then it counts no failure

    @executable @cli @work @work-stream
    Scenario: The word has one home
      Then "not-finished" is a member of GATE_RESULTS
      And no comparison site in packages/work/src spells "not-finished" outside regression-record.mjs
