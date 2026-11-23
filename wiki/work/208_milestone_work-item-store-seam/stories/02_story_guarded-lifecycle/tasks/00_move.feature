Feature: The item type and current state govern the move

  Rule: R1 · The item type and current state govern the move

    @executable @cli @work @work-stream
    Scenario: E1 · A governed chore moves once
      Given chore 11 is not-started with a user-authored body
      When the operator moves it to in-progress
      Then a subsequent find returns in-progress and the body and unrelated fields are preserved

    @executable @cli @work @work-stream
    Scenario: E2 · A prototype uses its own vocabulary
      Given prototype 16 is paused
      When the operator moves it to active
      Then the move succeeds and the file delta matches the accepted prototype baseline

    @executable @cli @work @work-stream
    Scenario Outline: Rejected transitions preserve the starting record
      Given a fresh workspace and the fixture specified by the row
      When the operator requests <move>
      Then the result is <outcome> and the stream remains byte-identical

      Examples:
        | move | outcome |
        | 11 from not-started to done | status-edge-not-applicable |
        | 16 from paused to blocked | status-edge-not-applicable |
        | 11 to banana | invalid-status |
        | 11 to not-started with --if-applicable | a successful skipped move |
