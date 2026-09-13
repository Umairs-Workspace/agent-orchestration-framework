@executable @ui @work-stream
Feature: The fleet-face spawn route handler — POST /api/mesh/session

  The fleet face gains its SECOND named write route: POST /api/mesh/session.
  Same CSRF guard, same workspace resolution seam, same no-fs-write posture as
  the existing POST /api/mesh/assign. ADR-001.

  Scenario: a valid spawn request returns 200 with the minted sessionId
    Given a fleet face serving with a connected worker "n1" holding workspace "ws-aof"
    When I POST /api/mesh/session with { nodeId: "n1", workspaceId: "ws-aof" } from the same origin
    Then the response is 200 { ok: true, sessionId: <uuid>, nodeId: "n1", workspaceId: "ws-aof" }
    And a session-spawn directive was dispatched to "n1"
    And the dispatched frame's sessionId matches the response's sessionId

  Scenario: the optional assistant field is forwarded
    Given a fleet face serving with a connected worker "n1" holding workspace "ws-aof"
    When I POST /api/mesh/session with { nodeId: "n1", workspaceId: "ws-aof", assistant: "codex" }
    Then the dispatched frame's assistant is "codex"

  Scenario: the optional itemRef field is forwarded
    Given a fleet face serving with a connected worker "n1" holding workspace "ws-aof"
    When I POST /api/mesh/session with { nodeId: "n1", workspaceId: "ws-aof", itemRef: "50" }
    Then the dispatched frame's itemRef is "50"

  Scenario: absent assistant defaults to "claude"
    Given a fleet face serving with a connected worker "n1" holding workspace "ws-aof"
    When I POST /api/mesh/session with { nodeId: "n1", workspaceId: "ws-aof" }
    Then the dispatched frame's assistant is "claude"

  Scenario: GET on the spawn path returns 405
    Given a fleet face serving
    When I GET /api/mesh/session
    Then the response is 405 with Allow: POST

  Scenario: cross-origin POST is refused with 403
    Given a fleet face serving
    When I POST /api/mesh/session from a cross-origin
    Then the response is 403 with code "cross-origin-refused"

  Scenario: non-JSON content-type is refused with 400
    Given a fleet face serving
    When I POST /api/mesh/session with Content-Type: text/plain from the same origin
    Then the response is 400 with code "invalid-content-type"

  Examples:
    | nodeId | workspaceId | assistant | itemRef | expectedStatus |
    | n1     | ws-aof      | claude    | null    | 200            |
    | n1     | ws-aof      | codex     | "50"    | 200            |
    | n2     | ws-test     | claude    | null    | 200            |
