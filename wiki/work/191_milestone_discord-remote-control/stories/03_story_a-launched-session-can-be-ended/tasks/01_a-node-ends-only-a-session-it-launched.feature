@executable @cli @work @work-stream
Feature: a node ends only a session it launched

  WHY. The node that holds the PTY is the only thing that can end it, and only for a PTY it opened. A
  `claude` someone started in a terminal is out of reach by construction (ADR-004 §2).

  Background:
    Given a handler with launched sessions "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10" and "5d2a7f40-1c3e-4b6a-9e8d-0f1a2b3c4d5e"

  Scenario: ending one session ends only that one
    When the handler ends "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10"
    Then that session's PTY is killed, its ping interval cleared, its terminal end sent and `endSession` called once
    And "5d2a7f40-1c3e-4b6a-9e8d-0f1a2b3c4d5e" is still open and still pinging

  Scenario: a second end of the same session does nothing more
    Given the handler has ended "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10"
    When the handler ends it again
    Then `endSession` is still called only once, and `session-end-not-launched` is logged

  Rule: R1 · Only a session aof launched can be ended, and the answer is the truth

    Scenario: E4 · the id of a terminal-started Claude is not ended
      Given a session record "9f8e7d6c-5b4a-4321-8fed-cba987654321" written by `claude`'s own hooks, with no launcher PTY
      When the handler ends "9f8e7d6c-5b4a-4321-8fed-cba987654321"
      Then nothing is killed and no record is ended
      And `session-end-not-launched` is logged once
