@executable @cli @work @work-stream
Feature: a loop starts from the channel

  WHY. `/loop start` sits beside `stop` and `resume`, attributed in the channel. The bot only asks:
  it invokes 04's start hand-off, and the supervisor starts the loop (ADR-005, ADR-006 §4).

  Background:
    Given the bot on the shared fake gateway
    And a channel serving "aof" (id "ws-a"), @sam allowed on it

  Scenario: the start is deferred in-channel
    When @sam runs `/loop start scope:191 project:aof`
    Then the first request is the interaction callback of type 5 with no flags

  Rule: R3 · A loop starts through the supervisor

    Scenario: E7 · the start is handed to the supervisor and attributed
      Given `work:loop` answers ok with `requested: true` for scope "191"
      When @sam runs `/loop start scope:191 project:aof`
      Then `work:loop` was invoked with scope "191" and startHandOff true in workspace "ws-a"
      And the channel sees "@sam asked the supervisor to start 191 — it starts on its next poll"

    Scenario: E8 · a halted supervised scope is pointed at resume
      Given `work:loop` refuses "loop-start-resumable" for scope "131"
      When @sam runs `/loop start scope:131 project:aof`
      Then the channel sees that `/loop start 131` was refused (loop-start-resumable) and names `/loop resume scope:131`
