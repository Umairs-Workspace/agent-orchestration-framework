@executable @cli @work-stream
Feature: The worker-stream-client session-spawn receive lane

  The worker-stream-client dispatches `kind:"session-spawn"` frames to a
  registered `onSessionSpawn` handler — the same one-kind-one-handler pattern
  as `onWithdraw` / `onTerminalInput` / `onTerminalResume`. ADR-002.

  Scenario: a session-spawn frame is dispatched to the registered handler
    Given a worker-stream-client with a registered onSessionSpawn handler
    And the transport receives { kind: "session-spawn", to: "n1", sessionId: "s1", workspaceId: "ws1", assistant: "claude", itemRef: null, at: "2026-08-14T00:00:00.000Z" }
    Then the onSessionSpawn handler is called with the frame

  Scenario: an unregistered handler drops the frame silently
    Given a worker-stream-client with NO registered onSessionSpawn handler
    And the transport receives { kind: "session-spawn", to: "n1", sessionId: "s1", workspaceId: "ws1", assistant: "claude", itemRef: null, at: "2026-08-14T00:00:00.000Z" }
    Then no error is thrown
    And the frame is silently discarded

  Scenario: a session-spawn frame does not interfere with the directive handler
    Given a worker-stream-client with both onDirective and onSessionSpawn registered
    And the transport receives { kind: "directive", to: "n1", assignmentId: "a1", itemRef: "42", workspaceId: "ws1", at: "2026-08-14T00:00:00.000Z" }
    Then the onDirective handler is called
    And the onSessionSpawn handler is NOT called

  Scenario: the session-spawn-ack up-frame is sent without error
    Given a connected worker-stream-client
    When the worker sends { kind: "session-spawn-ack", sessionId: "s1", nodeId: "n1", ok: true }
    Then the frame is serialized and sent on the transport

  Examples:
    | sessionId | workspaceId | assistant | itemRef |
    | uuid-1    | ws-aof      | claude    | null    |
    | uuid-2    | ws-test     | codex     | "50"    |
