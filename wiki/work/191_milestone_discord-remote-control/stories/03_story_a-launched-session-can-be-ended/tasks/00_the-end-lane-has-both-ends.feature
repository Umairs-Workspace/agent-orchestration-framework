@executable @cli @work @work-stream
Feature: the end lane has both ends

  WHY. Ending a session is a new instruction to a node, so it is a new down-frame kind in the session
  lane's one home. Its reading end lands with it, or the wire-kind sweep reds (ADR-004 §1, FF-19104).

  Scenario: the frame and its envelope round trip
    When `buildSessionEndFrame("wsl-2", { sessionId: "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10", at: "2026-11-12T09:00:00.000Z" })` is built and wrapped in its relay envelope
    Then the router rebuilds a frame of kind "session-end" for node "wsl-2" and that session

  Scenario Outline: the router routes an end by node
    Given a router whose local handler port names node "ctl-1"
    When a `session-end` frame for node "<node>" is routed
    Then the local handler's end receives it <local> times
    And `dispatchDirective` receives it <remote> times

    Examples:
      | node  | local | remote |
      | ctl-1 | 1     | 0      |
      | wsl-2 | 0     | 1      |

  Scenario: a worker hands a received end to its handler
    Given a worker stream client with an `onSessionEnd` handler registered
    When a `session-end` frame arrives on its stream
    Then the handler receives that frame once

  Scenario: FF-19104 · the new kind is swept with both ends
    When `test/arch/mesh/acd-wire-kind-has-both-ends.test.mjs` runs
    Then `SESSION_END_KIND` is in its swept set, declared in `session-spawn-directive.mjs`
    And its reading ends include `worker-stream-client.mjs` and `terminal-input.mjs`
