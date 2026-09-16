@executable @cli @work-stream
Feature: The worker-side spawn handler module

  A new `src/mesh-session-spawn-handler.mjs` — a SIBLING to
  `mesh-worker-execution.mjs`, NOT an extension. It opens a bare PTY in the
  workspace's checkout root when a session-spawn directive arrives. ADR-003.

  Scenario: a session-spawn directive opens a PTY in the workspace root
    Given a worker with workspace "ws-aof" available at "/home/user/source/aof"
    And a session-spawn directive { sessionId: "s1", workspaceId: "ws-aof", assistant: "claude", itemRef: null }
    When the handler processes the directive
    Then a PTY is spawned with cwd "/home/user/source/aof"
    And the PTY's shell is the system default (not a claude/codex CLI)

  Scenario: an itemRef resolves to or creates a worktree as cwd
    Given a worker with workspace "ws-aof" available at "/home/user/source/aof"
    And a session-spawn directive { sessionId: "s1", workspaceId: "ws-aof", assistant: "claude", itemRef: "50" }
    When the handler processes the directive
    Then a worktree is resolved or created for item "50" under the mesh worktree path
    And the PTY is spawned with cwd = that worktree path

  Scenario: the handler does NOT import or edit mesh-worker-execution.mjs
    Given the source of src/mesh-session-spawn-handler.mjs
    Then it does NOT import from "./mesh-worker-execution.mjs"

  Scenario: the handler is registered via client.onSessionSpawn in mesh-launcher.mjs
    Given the source of src/mesh-launcher.mjs
    Then it calls client.onSessionSpawn with the handler from mesh-session-spawn-handler.mjs

  Scenario: workspace not available on this node — spawn refused
    Given a worker with NO workspace "ws-unknown" registered
    And a session-spawn directive { sessionId: "s1", workspaceId: "ws-unknown", assistant: "claude", itemRef: null }
    When the handler processes the directive
    Then no PTY is spawned
    And a session-spawn-ack with { ok: false, code: "session-repo-unavailable" } is sent

  Examples:
    | workspaceId | itemRef | expectedCwd            |
    | ws-aof      | null    | /home/user/source/aof  |
    | ws-aof      | "50"    | <worktree for item 50> |
    | ws-unknown  | null    | <spawn refused>        |
