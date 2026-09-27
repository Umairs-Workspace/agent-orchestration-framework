@executable @cli @work-stream
Feature: Session registration lifecycle — start, ping, end

  The spawned session registers through the SAME m48 session API every other
  session uses. No second class of session — the presence ticker picks up the
  record within one cadence. ADR-004.

  Scenario: startSession is called immediately after successful PTY spawn
    Given a session-spawn directive { sessionId: "s1", workspaceId: "ws-aof", assistant: "claude" }
    And the PTY spawns successfully
    When the handler completes the spawn
    Then startSession is called with key { nodeId: <this-node>, workspaceId: "ws-aof", assistant: "claude", sessionId: "s1" }
    And the session record's repo field is derived from the workspace

  Scenario: pingSession fires on a 30-second cadence
    Given a spawned session "s1" with a live PTY
    When 30 seconds elapse
    Then pingSession is called with the same 4-part key
    And the same occurs every subsequent 30 seconds

  Scenario: endSession is called on PTY exit
    Given a spawned session "s1" with a live PTY
    When the PTY process exits
    Then endSession is called with the 4-part key
    And the ping interval is cleared

  Scenario: the session record has the standard 7-key schema
    Given a spawned session "s1"
    When startSession writes the record
    Then the record contains { nodeId, workspaceId, repo, assistant, sessionId, startedAt, lastPingAt }
    And sessionId is "s1" (the control-minted value, not null)

  Scenario: the session appears in the presence sessions[] array
    Given a spawned session "s1" registered and pinged
    When the presence ticker assembles the record
    Then the sessions[] array contains an entry with sessionId "s1"

  Scenario: TTL expiry is the backstop for a crashed handler
    Given a spawned session "s1" registered
    And the handler crashes without calling endSession
    When 120 seconds elapse without a ping
    Then the reaper removes the expired session record

  Examples:
    | sessionId | pingInterval | ttlWindow | reapAfter |
    | s1        | 30s          | 120s      | 120s      |
    | s2        | 30s          | 120s      | 120s      |
