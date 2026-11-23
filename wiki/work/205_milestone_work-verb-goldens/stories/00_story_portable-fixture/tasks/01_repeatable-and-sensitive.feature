Feature: A comparison detects the smallest observable drift and can be replayed

  Rule: R2 · A comparison detects the smallest observable drift and can be replayed

    @executable @cli @work @work-stream
    Scenario: E4 · An unchanged capture reproduces the same baseline
      Given a reviewed case for a text read
      When the case runs twice in independent temp projects and homes
      Then argv, exit, stdout including its last newline, stderr and the exported stream compare cleanly
      And the committed baseline and original seed retain their bytes

    @executable @cli @work @work-stream
    Scenario: E5 · A single changed byte identifies the affected artifact
      Given a scratch copy of the expected capture
      When one trailing space in a document is removed from the expectation
      Then ordinary comparison fails with the case, path and changed line
      And a one-byte change in an attachment also fails with its path

    @executable @cli @work @work-stream
    Scenario: E6 · Replaying a mutation under a different work root preserves its delta
      Given two copies with different configured work directories and identical logical seeds
      When each runs work promote queued
      Then the stream-relative added, removed and changed entries and their payloads match
      And neither original seed was modified

    @executable @cli @work @work-stream
    Scenario Outline: A normal comparison exposes drift without updating
      Given a scratch expected result with <change>
      When the selected case runs through normal comparison
      Then it fails and identifies <evidence>
      And the expected result retains the planted change

      Examples:
        | change | evidence |
        | an extra output newline | the output channel |
        | a removed empty directory | its directory entry |
        | a removed baseline for a declared case | the missing case baseline |

    @manual @cli @work @work-stream
    Scenario: Review a real terminal diff from a scratch baseline
      Given the registered fixture lane and an independent copy of its baselines
      When a maintainer changes one document line in the copy and runs the golden comparison against it
      Then the printed diff identifies the case, document and changed line
      And a second ordinary comparison still reports that change
