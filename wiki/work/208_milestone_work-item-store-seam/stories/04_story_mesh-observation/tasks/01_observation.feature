Feature: Observation works across change mechanisms and workspace lifetimes

  Rule: R2 · Observation works across change mechanisms and workspace lifetimes

    @executable @cli @work @work-stream
    Scenario: E3 · Polling discovers a change without a file event
      Given a test provider reports token A and later token B without an operating-system watcher
      When the normal launcher refreshes the workspace
      Then the changed row reaches the publication path

    @executable @cli @work @work-stream
    Scenario: E4 · Removing a workspace releases only its observation
      Given workspaces Orchard and Grove both have active observers
      When the launcher retains only Grove
      Then Orchard releases its handle and a later Grove change is still observed

    @executable @cli @work @work-stream
    Scenario Outline: File observation recovers and disposes cleanly
      Given a fresh workspace and the fixture specified by the row
      When the file observer encounters <event>
      Then the existing observable guarantee is <result>

      Examples:
        | event | result |
        | two notifications before a refresh | the next refresh sees the latest state |
        | a dropped notification | the safety scan eventually sees the edit |
        | watch setup failure | unwatched refresh can still detect a change |
        | launcher shutdown | all retained handles close |
