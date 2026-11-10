Feature: The CI summary judges the shards
  After every shard has run, one summary merges their reports. It fails the run for a red shard, for
  a registered case no shard ran or two shards both ran, and for a suite over its budget. It reports
  each file's drift against main's timings, and drift alone never fails a run.

  @executable @cli @work @work-stream
  Scenario Outline: The summary's verdict
    Given shard reports in which <condition>
    When the summary judges them with a 10-minute budget
    Then the run <verdict>
    And the summary names <named>

    Examples:
      | condition                                              | verdict | named                         |
      | every shard is green and the slowest took 8 minutes    | passes  | the suite wall of 8 minutes   |
      | one shard has a failing case                           | fails   | the failing case and its shard |
      | the shards executed 99 of 100 registered cases         | fails   | 1 case that no shard ran      |
      | the shards executed 101 of 100 registered cases        | fails   | the file whose case ran twice |
      | every shard is green and the slowest took 11 minutes   | fails   | the budget and the slowest shard |
      | a shard report is missing                              | fails   | the shard with no report      |
      | a unit did not finish                                  | fails   | the unit as not finished, not as a failure |

  @executable @cli @work @work-stream
  Scenario: Drift is reported and never fails the run
    Given green shard reports in which one file took 30 seconds against main's 10, and another 5 against main's 20
    When the summary judges them
    Then the run passes
    And the drift table lists the first file as slower and the second as faster, each with both times

  @executable @cli @work @work-stream
  Scenario: The merged timings are the union of the shards'
    Given two shards that each recorded their own files' timings
    When the summary merges them
    Then the merged timings hold every file of both shards, each with its own shard's seconds

  @manual
  Scenario: A pull request's checks show the suite inside its budget
    Given the branch's pull request
    When its test workflow completes
    Then every shard is green, the summary's suite wall is under 10 minutes, and its drift table is in the job summary
