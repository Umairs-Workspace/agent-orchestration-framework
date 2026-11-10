@cli @work @work-stream
Feature: the run says where its time went, and measures itself against the budget

  A whole-tree sign-off may take at most 15 minutes on the operator's machine (144 Q1). Making the
  slow suites faster is another item's work (144 Q4), so this story does not make the run fit the
  budget. It makes every run say how it ran and how long it took, and it logs an overrun as a
  defect on the row. An overrun does not turn a green row red.

  The budget is declared as `work.test.gate.budgetMinutes`; this repo declares `15`. The gate
  times the run itself, from launch to exit, through an injected clock.

  @executable
  Scenario Outline: the row says how the run ran and how long it took
    Given `work.test.gate.budgetMinutes` is `15`
    And the gate program runs for <minutes> minutes and passes
    When `aof work regression-gate 134 <flags>` runs
    Then the row is `green` and its detail reads `<detail>`

    Examples:
      | flags     | minutes | detail                                         |
      |           | 13.8    | sharded · 13.8 min                             |
      | --jobs 8  | 14.9    | sharded --jobs 8 · 14.9 min                    |
      |           | 24.1    | sharded · 24.1 min · over budget (15 min)      |
      | --serial  | 104.0   | serial · 104.0 min · over budget (15 min)      |

  @executable
  Scenario: a red row keeps its failing cases first
    Given `work.test.gate.budgetMinutes` is `15`
    And the gate program runs for 22.0 minutes and the case `loop wave merges home` fails twice
    When `aof work regression-gate 134` runs
    Then the row's detail reads `loop wave merges home · sharded · 22.0 min · over budget (15 min)`

  @executable
  Scenario: a not-isolated case sits between the failures and the run line
    Given `work.test.gate.budgetMinutes` is `15`
    And the gate program runs for 12.5 minutes, every case passes, and `core workspace` was red in the pool and green alone
    When `aof work regression-gate 134` runs
    Then the row is `green` and its detail reads `not isolated: core workspace · sharded · 12.5 min`

  @executable
  Scenario: with no budget declared nothing is called over budget
    Given `work.test.gate` declares no `budgetMinutes`
    And the gate program runs for 40.0 minutes and passes
    When `aof work regression-gate 134` runs
    Then the row's detail reads `sharded · 40.0 min`

  @executable
  Scenario Outline: a budget that is not a positive number is refused before anything runs
    Given `work.test.gate.budgetMinutes` is <budget>
    When `aof work regression-gate 134 --json` runs
    Then no program was launched
    And the row it appends is `red` and its detail names `work.test.gate.budgetMinutes`

    Examples:
      | budget |
      | `0`    |
      | `"15"` |

  @executable
  Scenario: the gate prints where the time went
    Given the sharded program's report ends with its `# slowest files` block
    When `aof work regression-gate 134` runs
    Then after its verdict line it prints that block unchanged, each line giving the summed seconds, the case count and the file
    And it prints `Logs: <the run's log directory>` from the program's `# logs:` line

  @executable
  Scenario: the slowest-files block sums each file's seconds across its chunks
    Given `test/loop/loop-command-wave.test.mjs` ran as two chunks of 300 s and 435 s holding 47 cases
    When `node scripts/test-sharded.mjs` writes its report
    Then its `# slowest files` block has the line `    735s  47 cases  test/loop/loop-command-wave.test.mjs`
    And `.tmp/test-timings.json` records `{ "seconds": 735, "cases": 47 }` for that file

  @manual
  Scenario: the real gate over this repository records its wall time and loses no case
    Given a clean detached worktree of this repository at the story's merge commit, with `AOF_GLOBAL_HOME` isolated
    When the operator runs `aof work regression-gate 144` there
    Then the runner's report says every registered case executed
    And the appended row's detail records the run mode and its wall time in minutes
    And the measured wall time and any `over budget` or `not isolated` entry are copied into `VERIFICATION.md`
