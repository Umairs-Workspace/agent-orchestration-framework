@cli @board
Feature: Record one verified run against a real Azure DevOps project
  Rule: R4 · One live Azure run is recorded with the environment it exercised
    @manual
    Scenario: E6 · A live run on a new test project is recorded without credentials
      Given a new test project on the AOF inherited process in the umair-butt organization
      And this MacBook's daemon passes board-access in its LaunchAgent environment
      When the work verbs publish a milestone with a story and a custom-type item, change a status, and resync after a board edit
      Then VERIFICATION.md records the platform, az version, process, work-item IDs and revisions
      And the custom-type item round-trips with its mapped type and state
      And the record names which spike 206 gaps the run exercised and contains no token

    @manual
    Scenario: The live run's stale write is refused by Azure
      Given an item from the live run at a known revision
      When the item is edited in the Azure web UI and AOF writes it at the earlier revision
      Then Azure refuses the write and AOF records the conflict for that item
