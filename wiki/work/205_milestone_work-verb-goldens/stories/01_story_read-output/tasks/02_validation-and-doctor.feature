Feature: Validation and stream diagnostics retain each finding and exit

  Rule: R3 · Validation and stream diagnostics retain each finding and exit

    @executable @cli @work @work-stream
    Scenario: E6 · Validation records both a clean and a failing item
      Given a clean dated chore 11 and a separate copy missing its created and updated dates
      When work validate 11 runs on each copy in each format
      Then the first JSON array is empty at exit 0 and the second has both date findings at exit 1
      And both faces retain the complete ordered output and unchanged input stream

    @executable @cli @work @work-stream
    Scenario: E7 · A duplicate number is visible as a stream-level error
      Given two live drivers numbered 11
      When work doctor runs in both formats
      Then duplicate-driver-number names both drivers and both runs exit 1
      And all findings, severities, paths, text and the JSON summary match the committed output

    @executable @cli @work @work-stream
    Scenario: E8 · Strict mode changes the exit for a warning-only stream
      Given a stream with a numbering-gap warning and zero errors
      When work doctor runs with and without --strict in both formats
      Then ordinary mode exits 0 and strict mode exits 1 for the same findings
      And the full reports, including the JSON health and strict flags, match their respective baselines

    @executable @cli @work @work-stream
    Scenario Outline: Each stream-reading diagnostic group has a nonempty witness
      Given a disposable fixture variation with <input>
      When work doctor runs against it in both formats
      Then the entire output and exit of each face match its baseline
      And the report contains <finding> and the compared stream is unchanged

      Examples:
        | input | finding |
        | an orphan numbered folder | orphan-folder |
        | a done milestone with an open story | lying-parent |
        | a started story with no tasks | started-story-no-tasks |
        | an updated date earlier than creation | updated-before-created |
        | a numbered gap | numbering-gap |
        | an oversized governed document | doc-over-budget |
        | a declared control with a missing target | control-unresolved |
        | an executable scenario with a valid empty case report | scenario-unjoined |
        | a malformed committed execution record | loop-record-malformed |
        | a resolved dependency without a contract witness | depends-edge-unwitnessed |
        | an archived retrospective with invalid lesson metadata | lesson-meta-archived |
        | two retrospectives recording a recurring lesson | memory-lesson-recurs |
        | a diagram reference whose target is missing | diagram-link-missing |
        | a story example map with an open business question and discovery enabled | example-question-open |

    @executable @cli @work @work-stream
    Scenario Outline: Scope and content errors have their own reports
      When work <query> runs over <fixture> in each format
      Then the exit and both channels match each baseline including <witness>

      Examples:
        | query | fixture | witness |
        | validate 999 | the standard stream | scope-not-found |
        | validate | a document whose slug disagrees with its item | the offending record |
        | doctor 11 | two drivers numbered 11 and a bad date on a different item | the stream-wide duplicate and scoped item findings |
