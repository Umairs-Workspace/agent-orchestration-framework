Feature: Archiving preserves item identity and the links that cross its move

  Rule: R1 · Archiving preserves item identity and the links that cross its move

    @executable @cli @work @work-stream
    Scenario: E1 · Archiving a single item preserves identity across the move
      Given a live document links to done chore 19
      When work archive 19 runs
      Then 19 resolves in the archive, its incoming relative link resolves to the same document, and the live listing omits it
      And the complete delta includes the moved contents and the crossing link

    @executable @cli @work @work-stream
    Scenario: E2 · Bulk archive uses the delivered set from a fresh seed
      When work archive --done --yes runs
      Then done prototype 17 and done chore 19 move together, and previously archived 30 stays in place
      And the complete delta matches its baseline

    @executable @cli @work @work-stream
    Scenario: E3 · An unfinished item cannot be archived
      When work archive 13 runs in each format on separate copies
      Then each exits 1, the refusal names the in-review item, and the JSON code is archive-not-done
      And both outputs match their baselines with no stream changes

    @executable @cli @work @work-stream
    Scenario Outline: Archive refusals retain their diagnostics and before-image
      When work <argv> runs in each output format against its own seed
      Then <code> is the JSON refusal code and each full channel and exit matches its baseline
      And the stream delta is empty

      Examples:
        | argv | code |
        | archive --done | archive-confirm-required |
        | archive 30 | archive-already-archived |
        | archive queued | archive-backlog-ref |
        | archive 10/00 | archive-not-a-driver |
