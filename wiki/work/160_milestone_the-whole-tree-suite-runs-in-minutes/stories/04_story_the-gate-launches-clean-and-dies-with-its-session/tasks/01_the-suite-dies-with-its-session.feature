Feature: The suite dies with its session
  The sharded runner stops its own pool when its stdin ends, and the gate ends that stdin when the
  run that launched it stops. A drain lets the gate finish, and a gate run by hand watches nothing.

  Rule: R2 · A stopped loop leaves no suite running

    @executable @cli @work @work-stream
    Scenario: E4 · a cancelled session's gate stops its suite and writes no row
      Given a driven gate whose suite is running, and its run record is "running"
      When the run record is settled as cancelled
      And the gate's next keep-alive beat reads it
      Then the gate aborts the launch and the runner's stdin ends
      And the gate answers "regression-gate-stopped"
      And REGRESSION.md is byte-identical to before the gate started

    @executable @cli @work @work-stream
    Scenario: E5 · a drained session's gate finishes and writes its row
      Given a driven gate whose suite is running, and its run record stays "running" until the suite exits
      When the suite exits green
      Then the gate appends a green row

    @executable @cli @work @work-stream
    Scenario: E6 · a gate run by hand watches nothing
      Given the gate runs with no AOF_RUN_ID
      When its suite runs to the end
      Then no run record was read and the row is appended as before

    @executable @cli @work @work-stream
    Scenario: The pool stops when its stdin ends
      Given a pool of 2 workers over 5 fake units that each take 60 s
      When the pool's stdin ends 1 s after it starts
      Then both in-flight units are killed and no further unit starts
      And no alone-retry runs
      And the pool resolves with 2 stopped units and 3 not started

    @executable @cli @work @work-stream
    Scenario: The pool stops when its parent dies
      Given the sharded runner launched as a child of a process that is then killed
      When the runner's stdin pipe closes
      Then no unit process remains after the runner has exited

    @executable @cli @work @work-stream
    Scenario: A stopped run never reads as green
      Given a pool stopped by its stdin with no failing case
      When the runner reports
      Then it exits non-zero

    @manual @cli @work @work-stream
    Scenario: A stopped gate leaves no process on the control node
      Given a gate started from a shell with GIT_ASKPASS set and a temp driven run
      When the run is settled a minute into the suite
      Then within a minute no test-shard process remains, and VERIFICATION records the process listing before and after
