@executable @ui @work-stream
Feature: Honest failure responses from the spawn route

  Every failure mode surfaces a coded, stated reason. No spinner that ends in an
  empty grid slot. SPEC: "a node that cannot spawn, a repo that does not exist on
  the chosen node, a worktree that cannot be created — each fails with a stated
  reason." ADR-001.

  Scenario: missing nodeId returns 400 invalid-body
    Given a fleet face serving
    When I POST /api/mesh/session with { workspaceId: "ws-aof" } (nodeId absent)
    Then the response is 400 with code "invalid-body"
    And the body contains error naming the missing field

  Scenario: missing workspaceId returns 400 invalid-body
    Given a fleet face serving
    When I POST /api/mesh/session with { nodeId: "n1" } (workspaceId absent)
    Then the response is 400 with code "invalid-body"

  Scenario: unknown workspace returns 404 workspace-not-found
    Given a fleet face with workspace "ws-aof" in the projection
    When I POST /api/mesh/session with { nodeId: "n1", workspaceId: "ws-unknown" }
    Then the response is 404 with code "workspace-not-found"

  Scenario: workspace not local returns 409 workspace-not-local
    Given a fleet face with workspace "ws-remote" published by another machine (projectRoot does not exist)
    When I POST /api/mesh/session with { nodeId: "n1", workspaceId: "ws-remote" }
    Then the response is 409 with code "workspace-not-local"

  Scenario: target node not connected returns 503 session-target-not-connected
    Given a fleet face with workspace "ws-aof" local
    And no worker "n2" has a live WebSocket connection
    When I POST /api/mesh/session with { nodeId: "n2", workspaceId: "ws-aof" }
    Then the response is 503 with code "session-target-not-connected"

  Scenario: control has no mesh identity returns 409 control-identity-unknown
    Given a fleet face whose control node has no mesh identity configured
    When I POST /api/mesh/session with { nodeId: "n1", workspaceId: "ws-aof" }
    Then the response is 409 with code "control-identity-unknown"

  Examples:
    | condition               | code                          | status |
    | nodeId missing          | invalid-body                  | 400    |
    | workspaceId missing     | invalid-body                  | 400    |
    | workspace not in store  | workspace-not-found           | 404    |
    | workspace not on disk   | workspace-not-local           | 409    |
    | target not connected    | session-target-not-connected  | 503    |
    | no control identity     | control-identity-unknown      | 409    |
