@executable @cli @work-stream
Feature: The session-spawn frame builder

  The kind literal and frame builder live in ONE leaf module
  (`src/mesh-session-spawn-directive.mjs`), following the single-source discipline
  of `TERMINAL_INPUT_KIND` / `RECOVERY_PUSH_KIND`. ADR-002.

  Scenario: buildSessionSpawnFrame produces a well-formed down-frame
    Given a sessionId "abc-123", nodeId "n1", workspaceId "ws1", assistant "claude", at "2026-08-14T00:00:00.000Z"
    When I call buildSessionSpawnFrame("n1", { sessionId: "abc-123", workspaceId: "ws1", assistant: "claude", itemRef: null, at: "2026-08-14T00:00:00.000Z" })
    Then the frame is { kind: "session-spawn", to: "n1", sessionId: "abc-123", workspaceId: "ws1", assistant: "claude", itemRef: null, at: "2026-08-14T00:00:00.000Z" }

  Scenario: buildSessionSpawnFrame carries an itemRef when provided
    Given an itemRef "42"
    When I call buildSessionSpawnFrame("n1", { sessionId: "abc-123", workspaceId: "ws1", assistant: "claude", itemRef: "42", at: "2026-08-14T00:00:00.000Z" })
    Then the frame contains itemRef "42"

  Scenario: SESSION_SPAWN_KIND is a string constant exported from the module
    When I import SESSION_SPAWN_KIND from "src/mesh-session-spawn-directive.mjs"
    Then the value is "session-spawn"

  Scenario: SESSION_SPAWN_ACK_KIND is a string constant for the up-frame
    When I import SESSION_SPAWN_ACK_KIND from "src/mesh-session-spawn-directive.mjs"
    Then the value is "session-spawn-ack"

  Scenario: buildSessionSpawnAckFrame produces a well-formed up-frame
    Given a successful spawn
    When I call buildSessionSpawnAckFrame({ sessionId: "abc-123", nodeId: "n1", ok: true })
    Then the frame is { kind: "session-spawn-ack", sessionId: "abc-123", nodeId: "n1", ok: true }

  Scenario: buildSessionSpawnAckFrame carries a code on failure
    Given a failed spawn due to "session-repo-unavailable"
    When I call buildSessionSpawnAckFrame({ sessionId: "abc-123", nodeId: "n1", ok: false, code: "session-repo-unavailable" })
    Then the frame contains ok false and code "session-repo-unavailable"

  Examples:
    | sessionId | nodeId | workspaceId | assistant | itemRef | at                       |
    | uuid-1    | n1     | ws-aof      | claude    | null    | 2026-08-14T10:00:00.000Z |
    | uuid-2    | n2     | ws-test     | codex     | "50"    | 2026-08-14T10:01:00.000Z |
    | uuid-3    | n1     | ws-aof      | claude    | "50/01" | 2026-08-14T10:02:00.000Z |
