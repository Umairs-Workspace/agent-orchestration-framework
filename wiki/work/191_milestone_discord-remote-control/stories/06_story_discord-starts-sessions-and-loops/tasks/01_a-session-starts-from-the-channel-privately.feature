@executable @cli @work @work-stream
Feature: a session starts from the channel, privately

  WHY. This is the milestone's headline: from a phone, start Claude in a project and open it with one
  tap. The reply carries the link, so only the person who asked sees it (operator, 191/06 Q1). The
  verb, not the bot, does the starting (ADR-006 §4).

  Background:
    Given the bot on the shared fake gateway, on control node "node-6eb3"
    And a channel serving "aof" (id "ws-a"), whose allowlist holds "111111111111111111" (@sam)

  Scenario: the start is deferred privately, before anything else
    When @sam runs `/session start project:aof`
    Then the first request is the interaction callback of type 5 with flags 64
    And `mesh:session-start` is invoked after it with project "ws-a" and waitMs 45000

  Scenario: an item and a node are passed through
    When @sam runs `/session start project:aof node:wsl-2 item:191/02`
    Then `mesh:session-start` is invoked with project "ws-a", node "wsl-2" and item "191/02"

  Scenario: a verb that throws still edits the reply
    Given `mesh:session-start` throws a coded error "session-route-failed"
    When @sam runs `/session start project:aof`
    Then the original reply is edited to say the start failed (session-route-failed)

  Rule: R1 · A session start answers with where to open it

    Scenario: E1 · the link comes back, and only @sam sees it
      Given `mesh:session-start` answers outcome "started", node "node-6eb3", project "aof", link "https://claude.ai/code/session_01AbC-x_9"
      When @sam runs `/session start project:aof`
      Then the edited reply says Claude started on "node-6eb3" in "aof" and carries "https://claude.ai/code/session_01AbC-x_9"
      And the reply was deferred with flags 64, so only @sam sees it

    Scenario: E2 · with no link, the reply names the session and where to find it
      Given `mesh:session-start` answers outcome "no-link" with name "aof-0b9e6c1e"
      When @sam runs `/session start project:aof`
      Then the edited reply names "aof-0b9e6c1e" and says to open the Claude app, tap Code, and find it there

    Scenario: E3 · an offline node is refused in the verb's words
      Given `mesh:session-start` refuses "session-target-not-connected" for node "wsl-2"
      When @sam runs `/session start project:aof node:wsl-2`
      Then the edited reply says "wsl-2" has no live connection and carries "session-target-not-connected"

    Scenario: E4 · a user not on the allowlist starts nothing
      When user "222222222222222222" runs `/session start project:aof`
      Then the reply is refused "discord-command-not-allowed"
      And `mesh:session-start` is never invoked
