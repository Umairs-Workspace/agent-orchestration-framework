@executable @cli @work @work-stream
Feature: the router sends each frame to exactly one place

  WHY. Routing by node id is the whole of ADR-001 §2: a frame for the control goes to its local
  handler, and a frame for any other node goes down that node's stream. A frame delivered to both
  would open two sessions, and a frame delivered to neither would vanish.

  Scenario Outline: each lane routes by the frame's node id
    Given a router whose local handler port names node "ctl-1"
    When a `<kind>` frame for node "<node>" is routed
    Then the local handler receives it <local> times
    And `dispatchDirective` receives it <remote> times

    Examples:
      | kind           | node    | local | remote |
      | session-spawn  | ctl-1   | 1     | 0      |
      | session-spawn  | wsl-2   | 0     | 1      |
      | terminal-input | ctl-1   | 1     | 0      |
      | terminal-input | wsl-2   | 0     | 1      |

  Scenario: a router with no local handler port behaves exactly as before
    Given a router built with no local handler port
    When a `session-spawn` frame for node "ctl-1" is routed
    Then `dispatchDirective` receives it once
    And a not-sent answer is announced on the outcome lane as a refusal, as today

  Scenario: a local handler that throws is a degrade, never a router crash
    Given a router whose local handler throws on spawn
    When a `session-spawn` frame for its own node is routed
    Then a `mesh-terminal-input` degrade is reported
    And a refusal for that session is announced on the outcome lane
