Feature: A packed unit fits its command line
  A packed unit names every file it holds on its command line, and Windows refuses a command line over
  about 32,000 characters. A quieter run records shorter timings, so the next plan packs more files into
  a unit. A pack is therefore bounded by its argument length as well as its target time, and a unit
  that cannot start is a failed unit, never the end of the run.

  @executable @bug @finding-F-06 @cli @work @work-stream
  Scenario: F-06 · a pack closes when its command line would pass the bound
    Given 400 short files whose estimates sum to well under one pack's target time
    When the runner packs them with an argument bound of 4,000 characters
    Then no packed unit's arguments exceed 4,000 characters
    And every file is in exactly one unit

  @executable @bug @finding-F-06 @cli @work @work-stream
  Scenario: F-06 · the runner's default bound fits a Windows command line
    Given the runner's default argument bound
    Then it leaves room under 32,767 characters for the node path and the shard entry's path

  @executable @bug @finding-F-06 @cli @work @work-stream
  Scenario Outline: F-06 · a unit that cannot start is a failed unit, not a crashed pool
    Given a pool of three units whose second unit's start <fails>
    When the pool runs them
    Then the pool resolves with three results
    And the second unit is a failure whose output names the error
    And the other two units pass

    Examples:
      | fails                                  |
      | throws ENAMETOOLONG                    |
      | emits an error event instead of a close |
