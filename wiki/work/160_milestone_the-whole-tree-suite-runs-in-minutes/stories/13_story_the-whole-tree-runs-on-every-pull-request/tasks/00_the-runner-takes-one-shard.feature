Feature: The runner takes one shard of the plan
  A pull request's suite runs as several jobs. Each job asks the sharded runner for one shard of the
  same plan, runs it, and reports what it ran in JSON, so the jobs together run every registered case
  once and a summary can judge them.

  @executable @cli @work @work-stream
  Scenario Outline: The shards of a plan
    Given a plan of <units> units with estimates <estimates>
    When it is split into <count> shards
    Then every unit is in exactly one shard
    And no shard's estimated time exceeds the lightest shard's by more than its heaviest unit

    Examples:
      | units | estimates                | count |
      | 1     | 90                       | 4     |
      | 7     | 90, 60, 50, 40, 30, 20, 10 | 3     |
      | 40    | 1 to 40                  | 8     |

  @executable @cli @work @work-stream
  Scenario: Every job computes the same split
    Given the same plan and the same timings
    When it is split into 4 shards twice
    Then both splits put every unit in the same shard

  @executable @cli @work @work-stream
  Scenario Outline: A shard argument the runner refuses
    When the runner is given --shard <argument>
    Then it refuses before any unit starts, naming the argument

    Examples:
      | argument |
      | 0/4      |
      | 5/4      |
      | 2        |
      | a/b      |

  @executable @cli @work @work-stream
  Scenario: A shard counts only its own cases
    Given a shard whose units hold 30 of the plan's 100 registered cases
    When all 30 run green
    Then the shard's report reads 30 of 30 cases executed, with no lost case

  @executable @cli @work @work-stream
  Scenario: A shard reports in JSON
    Given a shard run with --report-json
    Then the file names the shard, the shard count, and the executed and registered case counts
    And it names every failing, not isolated, not finished and not started unit
    And it carries the wall and summed seconds, and the per-file timings
