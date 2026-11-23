Feature: Promotion mints a tail number or opens the requested slot

  Rule: R1 · Promotion mints a tail number or opens the requested slot

    @executable @cli @work @work-stream
    Scenario: E1 · A tail promotion rewrites the waiting edge
      Given archived 30 is the highest number and waiting depends on queued
      When work promote queued runs on a fresh stream
      Then queued has ref 31 and waiting depends on 31
      And the complete delta matches its baseline including the removed backlog location

    @executable @cli @work @work-stream
    Scenario: E2 · An explicit slot preserves archived numbers
      When work promote queued --at 11 --yes runs on a fresh stream
      Then queued occupies 11, nine live items shift, and 30 remains archived
      And all changed references, moved documents, and untouched attachment bytes match the baseline

    @executable @cli @work @work-stream
    Scenario: E3 · A backlog dependency refuses promotion
      When work promote waiting runs before queued has been promoted
      Then it exits 1 with promote-depends-backlog naming queued
      And both refusal formats match their complete baselines and each stream delta is empty

    @executable @cli @work @work-stream
    Scenario Outline: Preconditions refuse before any stream change
      Given <precondition>
      When work <argv> runs independently in each format
      Then each exit is nonzero and its two channels match the refusal baseline for <code>
      And no file, attachment or directory differs from the before-image

      Examples:
        | precondition | argv | code |
        | 30 is archived | promote queued --at 30 --yes | promote-number-archived |
        | nine live rows would shift | promote queued --at 11 | insert-confirm-required |
        | queued depends on absent 99 | promote queued | promote-depends-unresolved |
        | there is no such backlog item | promote missing | promote-not-found |
