Feature: Run effects retain their narrower status preconditions

  Rule: R2 · Run effects retain their narrower status preconditions

    @executable @cli @work @work-stream
    Scenario: E3 · A stale expected status prevents a write
      Given a caller observed not-started and the item is now blocked
      When the caller requests in-progress expecting not-started
      Then the store refuses the stale move and the blocked record is unchanged

    @executable @cli @work @work-stream
    Scenario: E4 · Failure rollback preserves a later review decision
      Given a running story has already moved to in-review
      When its run closes with a failure
      Then the bounded rollback leaves the reviewed story in-review

    @executable @cli @work @work-stream
    Scenario Outline: The real run transition reaches the selected writer
      Given a fresh workspace and the fixture specified by the row
      When a run performs <action> on a story initially <initial>
      Then reading the item reports <final>

      Examples:
        | action | initial | final |
        | start | not-started | in-progress |
        | fail after start | in-progress | not-started |
        | complete successfully | in-review | in-review |
