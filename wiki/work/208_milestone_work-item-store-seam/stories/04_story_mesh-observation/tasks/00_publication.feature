Feature: Projection refresh uses the workspace tracking source

  Rule: R1 · Projection refresh uses the workspace tracking source

    @executable @cli @work @work-stream
    Scenario: E1 · A new token publishes the changed local status
      Given the projection says 11 is not-started and the selected store now says blocked
      When the publisher refreshes after its token changes
      Then the projected row for 11 says blocked and its source record is untouched

    @executable @cli @work @work-stream
    Scenario: E2 · An unchanged workspace reuses its snapshot
      Given a watched workspace has a complete remembered snapshot and the safety interval has not expired
      When the launcher performs another idle sweep
      Then the workspace has the same digest and no additional full item walk

    @executable @cli @work @work-stream
    Scenario Outline: The reader preserves authority during publication
      Given a fresh workspace and the fixture specified by the row
      When the publisher handles <input>
      Then the result is <result>

      Examples:
        | input | result |
        | an own row and stale remote copy | the existing own-row authority decision |
        | a permanent refusal with the same token | the existing suppression behavior |
        | a new token after that refusal | the workspace becomes eligible for retry |
