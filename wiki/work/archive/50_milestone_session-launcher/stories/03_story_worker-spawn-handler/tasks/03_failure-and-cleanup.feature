@executable @cli @work-stream
Feature: Spawn failure and cleanup

  Honest failure: "a node that cannot spawn, a repo that does not exist on the
  chosen node, a worktree that cannot be created — each fails with a stated
  reason, never a spinner that ends in an empty grid slot." ADR-003.

  Scenario: workspace not available — session-repo-unavailable
    Given a worker with NO workspace "ws-missing" registered
    And a session-spawn directive { sessionId: "s1", workspaceId: "ws-missing" }
    When the handler processes the directive
    Then no PTY is spawned
    And no session is registered (startSession is NOT called)
    And a session-spawn-ack { ok: false, code: "session-repo-unavailable" } is sent

  Scenario: the node-pty native module fails to load — session-spawn-failed
    Given a worker with workspace "ws-aof" available
    And the node-pty native module fails to load
    And a session-spawn directive { sessionId: "s1", workspaceId: "ws-aof" }
    When the handler processes the directive
    Then no session is registered
    And a session-spawn-ack { ok: false, code: "session-spawn-failed" } is sent

  Scenario: pty.spawn throws — session-spawn-failed
    Given a worker with workspace "ws-aof" available
    And the provider resolves but pty.spawn throws an error
    And a session-spawn directive { sessionId: "s1", workspaceId: "ws-aof" }
    When the handler processes the directive
    Then no session is registered
    And a session-spawn-ack { ok: false, code: "session-spawn-failed" } is sent

  Scenario: worktree creation fails for an itemRef — session-worktree-failed
    Given a worker with workspace "ws-aof" available
    And addWorktree(workspaceId, "50") throws
    And a session-spawn directive { sessionId: "s1", workspaceId: "ws-aof", itemRef: "50" }
    When the handler processes the directive
    Then no session is registered
    And a session-spawn-ack { ok: false, code: "session-worktree-failed" } is sent

  Scenario: PTY exit cleans up all state
    Given a spawned session "s1" with a live PTY
    When the PTY exits with code 0
    Then endSession is called
    And the ping interval is cleared
    And sendTerminalFrame with end:true is sent
    And the handler releases any references to the PTY

  Scenario: a second session-spawn for the same sessionId is idempotent
    Given a spawned session "s1" already running
    And a second session-spawn directive with the same sessionId "s1"
    When the handler processes the directive
    Then the second spawn is refused (no duplicate PTY)
    And a session-spawn-ack { ok: false, code: "session-already-active" } is sent

  # ADDED 2026-08-14 (developer, sanctioned by the orchestrator) — the scenario above
  # covers only the SEQUENTIAL arrival, which is the case that cannot happen: the
  # launcher dispatches this handler fire-and-forget, so two frames land in ONE tick and
  # both pass a check made before either has spawned anything. Measured on the shipped
  # code: 2 PTYs, 2 `ok` acks, 2 ping intervals armed and 0 cleared. The loser's PTY is
  # orphaned — unreachable for input, still bridging output onto the same sessionId — and
  # its interval keeps calling pingSession, which UPSERTS, resurrecting the record every
  # 30s forever after the reachable PTY exits. A permanent grid slot nobody can reach or
  # kill. The existing scenario is unchanged; this one covers the arrival that bites.
  Scenario: two session-spawns for the same sessionId arriving CONCURRENTLY are still idempotent
    Given a worker with workspace "ws-aof" available
    And two session-spawn directives with the same sessionId "s1" dispatched in the same tick
    When the handler processes both without awaiting the first
    Then exactly one PTY is spawned
    And exactly one session is registered
    And exactly one ping interval is armed
    And one session-spawn-ack { ok: true } and one { ok: false, code: "session-already-active" } are sent
    And the single live PTY is the one the input lane reaches

  Examples:
    | failure mode              | code                       | sessionRegistered |
    | workspace missing         | session-repo-unavailable   | no                |
    | node-pty load fails       | session-spawn-failed       | no                |
    | pty.spawn throws          | session-spawn-failed       | no                |
    | worktree fails            | session-worktree-failed    | no                |
    | duplicate sessionId       | session-already-active     | no (existing kept)|
    | duplicate, same tick      | session-already-active     | no (one kept)     |
