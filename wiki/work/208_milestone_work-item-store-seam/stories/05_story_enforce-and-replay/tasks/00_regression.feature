Feature: The accepted stream captures replay through the selected provider

  Rule: R1 · The accepted stream captures replay through the selected provider

    @executable @cli @work @work-stream
    Scenario: E1 · An unconfigured checkout reproduces the accepted stream
      Given the accepted 205 seed and baseline tree are available
      When all four work-stream lanes run in ordinary comparison mode
      Then all 150 scenarios match and the baseline tree remains byte-identical

    @executable @cli @work @work-stream
    Scenario: E2 · Explicit files reproduces both channels on a find miss
      Given the same fixture selects files explicitly
      When the operator asks for a nonexistent item in text and JSON
      Then text reports the miss at exit 1 and JSON returns the empty array at exit 0, matching the same oracle

    @executable @cli @work @work-stream
    Scenario Outline: The explicit selector passes each accepted family
      Given a fresh workspace and the fixture specified by the row
      When the runner compares <family> with work.store set to files
      Then all <count> accepted captures match and the compare writes no baseline

      Examples:
        | family | count |
        | work-stream-fixture | 10 |
        | work-stream-read | 76 |
        | work-stream-place | 26 |
        | work-stream-life | 38 |
