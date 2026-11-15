@executable @cli @work @work-stream
Feature: the launch field is a closed set on the wire

  WHY. A value carried from Discord to another machine must never become a command (SPEC: Discord
  never gives the operator a shell). `launch` names one of a closed set of programs the node knows
  how to start. It is not text the node runs (ADR-002 §1).

  Scenario: SESSION_LAUNCHES is exactly one value
    When `@aof/mesh/session-spawn-directive` is imported
    Then `SESSION_LAUNCHES` is frozen and is exactly ["claude-remote-control"]

  Scenario: the relay envelope and the router's rebuild carry launch through
    Given a session-spawn envelope built for node "wsl-2" with launch "claude-remote-control"
    When the router rebuilds the frame from the envelope's signal
    Then the frame dispatched to "wsl-2" carries launch "claude-remote-control"

  Rule: R1 · A session started this way is Claude with Remote Control, never a shell

    Scenario: E3 · a launch that names anything else opens a bare shell with nothing typed
      When a session-spawn frame with launch "bash -i" is handled
      Then the frame's `launch` is absent once built
      And the PTY opens the operator's shell and receives no write

    Scenario Outline: the builder keeps the one known launch and drops every other value
      When `buildSessionSpawnFrame` is called with launch <given>
      Then the frame's `launch` is <kept>

      Examples:
        | given                    | kept                    |
        | "claude-remote-control"  | "claude-remote-control" |
        | absent                   | absent                  |
        | "CLAUDE-REMOTE-CONTROL"  | absent                  |
        | 7                        | absent                  |
