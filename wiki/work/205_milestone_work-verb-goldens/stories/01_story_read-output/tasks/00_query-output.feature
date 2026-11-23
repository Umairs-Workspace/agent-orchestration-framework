Feature: The read verbs keep their two output formats and exit codes

  Rule: R1 · The read verbs keep their two output formats and exit codes

    @executable @cli @work @work-stream
    Scenario: E1 · A find miss differs across the two CLI formats
      Given the orchard fixture has no item matching nonsense
      When work find nonsense runs in text and JSON modes
      Then the text run exits 1 with the miss on stdout and the JSON run exits 0 with []
      And each complete channel and the exit match the corresponding baseline

    @executable @cli @work @work-stream
    Scenario: E2 · List exposes the archive on request and keeps nested parents
      When work list and work list --all run in each output format
      Then both show queued and both nested stories under 10
      And only the all-items view includes archived 30
      And both ordered listings match their complete baselines

    @executable @cli @work @work-stream
    Scenario: E3 · A missing document is an answer
      When work doc 10/00 OUTCOME runs in both formats
      Then the text says it is absent and JSON has present false and an empty body
      And both runs exit 0 and match their output baselines

    @executable @cli @work @work-stream
    Scenario Outline: Each query keeps all of its output in both formats
      Given a fresh orchard seed for each invocation
      When work <query> runs once in text and once with --json
      Then the complete stdout, stderr and exit for each face match their committed baseline
      And <witness> is observable and the stream export remains equal to its before-image

      Examples:
        | query | witness |
        | list 10 | the scoped text listing |
        | find 10/00 | the nested story |
        | find queued | the unnumbered backlog item |
        | find 30 | the archived item |
        | doc 10 SPEC | the full body including the checklist |
        | doc 10/00 TASKS 00_pick.feature | the named task body |
