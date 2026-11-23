Feature: Readiness distinguishes a ready story from unsatisfied dependencies

  Rule: R2 · Readiness distinguishes a ready story from unsatisfied dependencies

    @executable @cli @work @work-stream
    Scenario: E4 · Readiness includes the ready story in the wave
      When work next 10 runs in text and JSON modes
      Then both complete outputs match their baselines and only 10/00 is in the JSON ready wave
      And both exits are 0 and the stream is unchanged

    @executable @cli @work @work-stream
    Scenario: E5 · The scoped answer retains the unmet dependency
      When work next 10/01 and work next 13 run in each format
      Then the first JSON answer waits on 10/00 and the second waits on 12
      And each text and JSON result including both channels and its exit matches its baseline

    @executable @cli @work @work-stream
    Scenario Outline: Other readiness boundaries stay visible
      When work next <scope> runs in each format
      Then both faces match their baselines for <boundary> and leave the stream unchanged

      Examples:
        | scope | boundary |
        | 11 | ready standalone chore |
        | 19 | a delivered scope |
        | 15 | a prototype outside scheduling |
