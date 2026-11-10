Feature: The shard entry runs a named selection
  The light entry takes the files it is given, runs every case they export through the runner's
  one loop, reports an unusable file by path, loads nothing it was not given, and is guarded like
  the runner.

  @executable @cli @work @work-stream
  Scenario: Several files run as one selection
    Given two suite files exporting 3 and 2 cases
    When the shard entry runs with both files
    Then 5 cases ran, each printed "ok - <name>", under one "# executed 5 cases; failures 0" line
    And it exits 0

  @executable @cli @work @work-stream
  Scenario: The sharded runner's unit form still works
    Given one suite file exporting 4 cases
    When the shard entry runs with that file and the positions "1,3"
    Then exactly the cases at positions 1 and 3 ran

  @executable @cli @work @work-stream
  Scenario Outline: An unusable file is reported by path and fails the run
    Given a selection of one good suite and <bad>
    When the shard entry runs with both
    Then it prints "not ok - <path> <reason>" and still runs the good suite's cases
    And it exits non-zero

    Examples:
      | bad                                       | path              | reason                         |
      | a path that does not exist                | missing.test.mjs  | could not be loaded            |
      | a file exporting no { name, run } array   | plain.mjs         | exports no array of { name, run } entries |

  @executable @cli @work @work-stream
  Scenario: A focused run evaluates nothing it was not named
    Given a resolve hook that records every module evaluated
    When the shard entry runs one small suite that does not import the runner
    Then no "index.mjs" under "test/" and no other suite file was evaluated
    And the runner's registry was not evaluated

  @executable @cli @work @work-stream
  Scenario: A suite on the runner's import ring still enters through the runner
    Given a suite file that imports the runner
    When the shard entry runs it
    Then its cases run and none of them reads an uninitialised array

  @executable @cli @work @work-stream
  Scenario Outline: The isolation hook guards the shard entry as it guards the runner
    Given the test-isolation guard hook
    When it inspects the command "<command>"
    Then it <verdict>

    Examples:
      | command                                                              | verdict  |
      | node scripts/test-shard.mjs test/run/regression-gate.test.mjs        | blocks   |
      | AOF_GLOBAL_HOME=/tmp/x node scripts/test-shard.mjs test/a.test.mjs   | allows   |
      | node scripts/test.mjs --only test/a.test.mjs                         | blocks   |

  @manual @cli @work @work-stream
  Scenario: The focused run's start-up on the control node
    Given AOF_GLOBAL_HOME isolated
    When "aof test --story 160/02" and a hand-typed shard-entry run of one suite are timed before and after this story
    Then VERIFICATION records each time, and the after times carry no 15 s registry import
