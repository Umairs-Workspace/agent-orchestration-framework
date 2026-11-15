@executable @cli @work @work-stream
Feature: sessions are listed and ended from the channel

  WHY. A session started from a phone must be visible and endable from the same phone. The list is
  a view and stays private, while ending a session is an action the channel sees, on 131's rule
  (ADR-006 §4).

  Background:
    Given the bot on the shared fake gateway
    And a channel serving "aof" (id "ws-a") and "notes" (id "ws-n"), @sam allowed on "aof" only

  Scenario: a session in a project @sam may not address is not ended
    Given live session "notes-5d2a7f40" in "notes"
    When @sam runs `/session end session:notes-5d2a7f40`
    Then the reply is refused "discord-command-not-allowed"
    And `mesh:session-end` is never invoked

  Scenario: an end the verb cannot confirm says so
    Given `mesh:session-end` answers `ended: false` for "aof-0b9e6c1e"
    When @sam runs `/session end session:aof-0b9e6c1e`
    Then the channel sees that the end was sent and "aof-0b9e6c1e" is still listed

  Rule: R2 · A session can be seen and ended from the channel

    Scenario: E5 · the list is private and shows the kept projects only
      Given `mesh:session-list` answers "aof-0b9e6c1e" on "node-6eb3", started 40 minutes ago
      When @sam runs `/session list`
      Then the reply was deferred with flags 64
      And it lists "aof-0b9e6c1e" with "node-6eb3" and "40m"
      And `mesh:session-list` was asked only about "ws-a"

    Scenario: E6 · an end is attributed in the channel once it is confirmed
      Given `mesh:session-end` answers `ended: true` for "aof-0b9e6c1e" on "node-6eb3"
      When @sam runs `/session end session:aof-0b9e6c1e`
      Then the reply was deferred with no flags
      And the channel sees "@sam ended aof-0b9e6c1e on node-6eb3"
