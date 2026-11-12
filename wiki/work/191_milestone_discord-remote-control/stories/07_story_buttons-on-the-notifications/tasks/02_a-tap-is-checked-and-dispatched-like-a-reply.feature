@executable @cli @work @work-stream
Feature: a tap is checked and dispatched like a reply

  WHY. A button is one more way to say what a reply or a command already says. It passes the same
  allowlist and reaches the same verbs, and its context comes from the index, never from the client
  (ADR-007 §4–§6).

  Background:
    Given the bot is running on the shared fake gateway
    And workspace "ws-a" ("aof") whose channel "c1" allows user "111111111111111111" (@sam)

  Scenario: tapping Resume hands the loop to the supervisor
    Given message "9001" indexed as `loop-halted` for scope "191"
    When @sam taps "aof:resume" on message "9001"
    Then the interaction is deferred ephemerally before anything else
    And `work:loop` is invoked with scope "191" and handOff true in workspace "ws-a"
    And the ephemeral reply says the supervisor relaunches 191 on its next poll

  Scenario Outline: a tap the index cannot place is expired and dispatches nothing
    Given <state>
    When @sam taps "<id>" on message "<message>"
    Then the ephemeral reply is refused "discord-button-expired"
    And no verb is invoked

    Examples:
      | state                                          | id           | message |
      | message "9002" indexed with choices ["A", "B"] | aof:answer:7 | 9002    |
      | message "9001" indexed as `loop-halted`        | aof:delete   | 9001    |

  Scenario: a tap from a direct message is refused
    When a button interaction with no member arrives
    Then the ephemeral reply is refused "discord-command-dm" and no verb is invoked

  Scenario: slash commands still reach the command handler
    When a type-2 interaction arrives
    Then `handleInteraction` receives it and `handleButton` does not

  Rule: R1 · A halt offers the two ways forward

    Scenario: E3 · Open a session here starts Claude at the halted item
      Given message "9001" indexed as `loop-halted` for scope "191", ref "191/02", node "node-6eb3"
      When @sam taps "aof:session" on message "9001"
      Then `mesh:session-start` is invoked with project "ws-a", item "191/02", node "node-6eb3" and waitMs 45000
      And the ephemeral reply carries the link, or the session's name and where to find it

  Rule: R2 · A fixed-choice question is answered with one tap

    Scenario: E4 · tapping a choice answers the ask with its label
      Given message "9002" indexed as `session-needs-input` for ref "191/02" with choices ["Yes, ship it", "No, hold"]
      When @sam taps "aof:answer:1" on message "9002"
      Then `work:answer` is invoked with ref "191/02", text "No, hold", as "@sam" and via "discord"
      And message "9002"'s buttons are edited to disabled

    Scenario: E6 · a second tap names who answered and disables the buttons
      Given the ask behind message "9002" was answered by "@kim" at 10:04
      When @sam taps "aof:answer:0" on message "9002"
      Then the ephemeral reply names "@kim" and 10:04
      And message "9002"'s buttons are edited to disabled
      And no second answer is recorded

  Rule: R3 · A tap is held to the same allowlist as a reply

    Scenario: E7 · a user not on the allowlist is refused
      Given message "9001" indexed as `loop-halted` for scope "191"
      When user "222222222222222222" taps "aof:resume" on message "9001"
      Then the ephemeral reply is refused "discord-button-not-allowed" and names the allowlist key
      And no verb is invoked

    Scenario: E8 · a tap on a pruned message is expired
      Given no index record for message "8000", whose record was pruned after 30 days
      When @sam taps "aof:resume" on message "8000"
      Then the ephemeral reply is refused "discord-button-expired"
      And no verb is invoked
