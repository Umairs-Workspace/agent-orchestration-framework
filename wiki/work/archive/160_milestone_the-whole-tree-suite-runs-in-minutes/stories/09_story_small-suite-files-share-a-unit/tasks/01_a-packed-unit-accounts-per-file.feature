Feature: A packed unit accounts per file
  A packed unit is one process, but its timings, its lost cases, its failures and its not-finished
  report still name each file, so the next schedule and the person reading the report see files,
  not batches.

  @executable @cli @work @work-stream
  Scenario: The shard entry reports each file it ran
    Given a unit naming two files
    When the shard entry runs it
    Then it prints one "# file <path> <seconds> <executed>" line for each file

  @executable @cli @work @work-stream
  Scenario: Timings stay per file
    Given a green run in which three files ran in one packed unit, for 2, 3 and 4 seconds
    When the runner writes its timings
    Then the timings hold one entry for each of the three files, with those seconds
    And no entry names the packed unit

  @executable @cli @work @work-stream
  Scenario: A lost case is named by its file
    Given a packed unit of two files assigned 3 and 2 cases
    When the second file executes only 1 case
    Then the report names the second file as having lost a case
    And the first file is not named

  @executable @cli @work @work-stream
  Scenario: A failure in a packed unit names its case and is retried with its unit
    Given a packed unit of three files in which one case fails
    When the pool drains and the failed unit is retried alone
    Then the report names the failing case by its name, as for any unit
    And a case that passes when the unit runs alone is reported "# not isolated - <case>", not as a failure

  @executable @cli @work @work-stream
  Scenario: A packed unit stopped at the budget names every file it held
    Given a packed unit of three files in flight when the run's budget passes
    When the run stops
    Then the report prints "# not finished - <file>" for each of the three files
    And it writes no timings

  @manual @cli @work @work-stream
  Scenario: The unit count and the summed time on the control node
    Given AOF_GLOBAL_HOME isolated and the timings of the last whole-tree run
    When "node scripts/test-sharded.mjs --plan" runs before and after this story, and twenty short arch suites are timed as separate units and as one packed unit
    Then VERIFICATION records both plans' unit counts and both timings
