Feature: The tune corpus lists the stream once
  Assembling the tune corpus lists the work stream once and hands each item's folder to the reads
  that need it. Nothing inside the per-item loop lists the stream again, and the corpus it returns is
  unchanged.

  @executable @cli @work @work-stream
  Scenario Outline: One assembly lists the stream once, whatever its size
    Given a work stream of <items> items, each with an observability snapshot
    When the corpus is assembled with the stream listing counted
    Then the stream was listed exactly once

    Examples:
      | items |
      | 1     |
      | 12    |
      | 60    |

  @executable @cli @work @work-stream
  Scenario: The corpus is unchanged
    Given a fixture stream with lessons, runs, snapshots and findings
    When the corpus is assembled, and assembled again with every snapshot read by its ref
    Then the two corpora are deep-equal

  @executable @cli @work @work-stream
  Scenario Outline: A snapshot is read by ref or by folder with the same answer
    Given <item> with a latest snapshot
    When the snapshot is read by its ref and by its resolved folder
    Then both reads return the same snapshot

    Examples:
      | item                   |
      | milestone 53           |
      | story 53/01            |
      | an archived milestone  |

  @executable @cli @work @work-stream
  Scenario: A ref that resolves to nothing is still refused by name
    Given a stream with no item 99
    When the latest snapshot of "99" is read by its ref
    Then the read is refused naming "99", as today

  @manual @cli @work @work-stream
  Scenario: The corpus over this repository on the control node
    Given AOF_GLOBAL_HOME isolated
    When the corpus over this repository is assembled, and "acd-candidate-formation-is-lossless" and "acd-tune-is-non-vacuous-over-this-repo" are run alone through the shard entry, before and after this story
    Then VERIFICATION records each time and the corpus is deep-equal before and after
