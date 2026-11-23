Feature: Status moves follow the lifecycle of the requested item

  Rule: R2 · Status moves follow the lifecycle of the requested item

    @executable @cli @work @work-stream
    Scenario: E4 · A legal governed move updates the item record
      When work status 11 in-progress runs
      Then 11 moves from not-started to in-progress and a subsequent find reports its new status
      And every byte of the resulting stream matches the reviewed delta

    @executable @cli @work @work-stream
    Scenario: E5 · A paused prototype can return to active
      When work status 16 active runs
      Then 16 records active and the complete stream delta matches its baseline

    @executable @cli @work @work-stream
    Scenario: E6 · Skipping from not-started to done is refused
      When work status 11 done runs on separate copies in each format
      Then both return exit 1 and the JSON refusal is status-edge-not-applicable
      And the output names the legal moves, both complete channels match, and the before-image is preserved

    @executable @cli @work @work-stream
    Scenario Outline: Repeated, invalid and guarded moves keep their distinct results
      Given <precondition>
      When work <argv> runs on a fresh copy
      Then the observed result is <result> and the complete stream delta is empty
      And a refusal has a full output and exit baseline in each format

      Examples:
        | precondition | argv | result |
        | prototype 16 is paused | status 16 blocked | status-edge-not-applicable |
        | chore 11 is not-started | status 11 not-started --if-applicable | successful skipped move |
        | milestone 10 is eligible for its acceptance gate but has no regression record and its configured gate is required | status 10 done | regression-gate-missing |
        | chore 11 is not-started | status 11 banana | invalid-status |
