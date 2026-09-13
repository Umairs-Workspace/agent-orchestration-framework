@executable @cli @work-stream
Feature: PTY output bridging to the terminal mirror

  The spawned session's PTY output rides the SAME sendTerminalFrame wire the
  assignment driver already uses. On end, the end-of-stream marker fires.
  ADR-003.

  Scenario: PTY output bytes are sent via sendTerminalFrame
    Given a spawned session "s1" with a live PTY
    When the PTY produces output bytes "hello world"
    Then sendTerminalFrame is called with sessionId "s1" and bytes "hello world"
    And the frame reaches the control's terminal mirror under (nodeId, "s1")

  Scenario: multiple output chunks are sent in order
    Given a spawned session "s1" with a live PTY
    When the PTY produces chunks ["aaa", "bbb", "ccc"] in order
    Then sendTerminalFrame is called three times with bytes in that order

  Scenario: on PTY exit, sendTerminalFrame with end:true fires
    Given a spawned session "s1" with a live PTY
    When the PTY process exits
    Then sendTerminalFrame is called with { sessionId: "s1", end: true }
    And subsequent subscribers to (nodeId, "s1") receive the end signal

  Scenario: terminal input from the operator reaches the PTY
    Given a spawned session "s1" with a live PTY
    And the worker receives a terminal-input frame { sessionId: "s1", bytes: "ls\n" }
    When the input handler processes the frame
    Then pty.write is called with "ls\n"

  Scenario: terminal input for a different sessionId does NOT reach this PTY
    Given a spawned session "s1" with a live PTY
    And the worker receives a terminal-input frame { sessionId: "other", bytes: "x" }
    When the input handler processes the frame
    Then pty.write is NOT called on session "s1"

  Examples:
    | sessionId | outputBytes   | end   |
    | s1        | "hello"       | false |
    | s1        | ""            | true  |
    | s2        | "$ ls\n"      | false |
