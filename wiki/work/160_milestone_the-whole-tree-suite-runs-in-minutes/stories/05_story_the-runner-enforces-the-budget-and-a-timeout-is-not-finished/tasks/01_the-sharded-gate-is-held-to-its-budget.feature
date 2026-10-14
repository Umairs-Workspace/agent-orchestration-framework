Feature: The sharded gate is held to its budget
  The gate tells the runner its budget, and the runner stops at it: units in flight are not
  finished and the rest are not started. A program that cannot be told is stopped by the gate's own
  deadline. A serial run is not held to the budget.

  Rule: R2 · The whole-tree run is held to its 10-minute budget

    @executable @cli @work @work-stream
    Scenario: E4 · a run inside the budget is green
      Given a sharded gate with budgetMinutes 10 whose units all pass in 8.4 minutes
      When the gate records its row
      Then the result is "green" and the detail reads "sharded · 8.4 min"

    @executable @cli @work @work-stream
    Scenario: E5 · a run that reaches the budget stops there
      Given a pool of 16 workers with 40 units still queued when 10 minutes pass
      When the budget deadline fires
      Then the 16 in-flight units are killed and reported "# not finished - <unit>"
      And the runner prints "# not started: 24 units" and starts none of them
      And no alone-retry runs, and the row is "not-finished"

    @executable @cli @work @work-stream
    Scenario: E6 · a program that cannot be told is stopped by the gate's own deadline
      Given a gate declaration with budgetMinutes 10 and no budgetArgs
      When the program is still running at 12 minutes
      Then the launch ends "deadline-expired" and the row is "not-finished", never "red"

    @executable @cli @work @work-stream
    Scenario Outline: The budget reaches the program
      Given a gate declaration with budgetMinutes <minutes>, budgetArgs <budgetArgs> and the operator's setting <setting>
      When the gate composes its launch
      Then the argument vector ends with <tail>
      And the launch deadline is <deadline>

      Examples:
        | minutes | budgetArgs                     | setting  | tail                                | deadline                      |
        | 10      | ["--budget-min", "{minutes}"]  | none     | ["--budget-min", "10"]              | 12 minutes                    |
        | 10      | ["--budget-min", "{minutes}"]  | --jobs 8 | ["--jobs", "8", "--budget-min", "10"] | 12 minutes                  |
        | 10      | absent                         | none     | the gate's own args                 | 12 minutes                    |
        | 10      | ["--budget-min", "{minutes}"]  | --serial | the test runner's args              | work.test.deadlineMs          |

    @executable @cli @work @work-stream
    Scenario Outline: A malformed budget template is the toolchain's own refusal
      Given a gate declaration with budgetArgs <value>
      When the gate resolves its declaration
      Then it refuses with "test-runner-declaration-invalid" keyed "work.test.gate.budgetArgs"

      Examples:
        | value                                       |
        | "--budget-min 10"                           |
        | ["--budget-min"]                            |
        | ["--budget-min", "{minutes}", "{minutes}"]  |

    @executable @cli @work @work-stream
    Scenario: This repository declares a 10-minute budget the runner is told
      When the repository's own .aof/aof.config.json is read
      Then work.test.gate.budgetMinutes is 10 and work.test.gate.budgetArgs is ["--budget-min", "{minutes}"]

  Rule: R3 · Only a green row signs a milestone off

    @executable @cli @work @work-stream
    Scenario: E7 · a not-finished row is refused at the door with its own repair
      Given a milestone whose newest regression row is "not-finished"
      When it is moved to done
      Then the door refuses with "regression-gate-not-finished"
      And the message says to re-run the gate or speed the run up, and does not say the suite is failing

    @executable @cli @work @work-stream
    Scenario: E8 · a long serial run that passes still signs off
      Given a --serial gate that took 104 minutes with every case passing
      When the gate records its row
      Then the result is "green" and the row satisfies the door

    @executable @cli @work @work-stream
    Scenario: The verify prose names the word
      When the verify command's bundle prose is read
      Then it says a not-finished row is re-run or sped up, and is never routed to a code repair
      And the shipped bundle manifest matches the rendered bundle

    @manual @cli @work @work-stream
    Scenario: The budget stop on the control node
      Given a clean detached worktree whose config sets budgetMinutes 1, and AOF_GLOBAL_HOME isolated
      When the regression gate runs there
      Then the row is not-finished, names the in-flight units, and no unit process remains
      And VERIFICATION records that row and the row of a run at the real budget with its wall time
