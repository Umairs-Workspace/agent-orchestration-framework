@executable @cli @work @work-stream
Feature: a spawn for the control's own node opens a local session

  WHY. Every project a Discord channel serves is checked out on the control node, and on a
  single-node mesh the control is the only node. A `session-spawn` frame for the control's own id
  used to be dropped as "not connected" (ADR-001 Context). The control now runs the worker's own
  handler for it, so the session is the same kind of session a worker opens: one record, one
  fleet tile, and reached by `stop()`.

  Background:
    Given a launcher started as the control node "ctl-1" with a configured relay
    And an injected PTY factory that records every spawn
    And the workspace "ws-a" checked out on "ctl-1"

  Scenario: a spawn for the control's own node opens a PTY and registers the session there
    When a `session-spawn` envelope for node "ctl-1", session "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10", workspace "ws-a" arrives on the relay
    Then one PTY is spawned with its cwd at the checkout of "ws-a"
    And a session record keyed `(ctl-1, ws-a, claude, 0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10)` is written
    And an ok `session-spawn-ack` for session "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10" is pushed to the loopback relay

  Scenario: the local session's output reaches the fleet view through the loopback push
    Given the local session "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10" is open
    When its PTY writes "hello"
    Then a terminal-frame envelope for node "ctl-1", session "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10" carrying "hello" is pushed to the loopback relay
    And when its PTY exits, a terminal-end envelope for that tuple is pushed and the session record is ended

  Scenario: keys typed into a local session reach its PTY
    Given the local session "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10" is open
    When a `terminal-input` envelope for node "ctl-1", session "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10" with bytes "ls\r" arrives on the relay
    Then the PTY of session "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10" receives "ls\r"

  Scenario: a control with no relay hosts nothing locally and refuses as before
    Given a launcher started as the control node "ctl-1" with no `mesh.relay.url`
    When a `session-spawn` frame for node "ctl-1" reaches the router
    Then no PTY is spawned
    And the spawn is reported refused for that session, as it was before this story

  Scenario: stopping the control daemon halts its local session
    Given the local session "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10" is open
    When the launcher's `stop()` resolves
    Then the PTY is killed, its ping interval is cleared and its session record is ended
