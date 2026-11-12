@executable @cli @work @work-stream
Feature: one start core for the route and the verb

  WHY. The fleet's `New session ▾`, the terminal and Discord must refuse for the same reasons, in the
  same words. The checks have one home, `planSessionStart`, and both faces reach the dispatch only
  through it (ADR-003 §1).

  Scenario Outline: the plan refuses in the route's own order and codes
    Given a mesh status in which <state>
    When `planSessionStart` is asked for workspace "ws-a" on node "wsl-2"
    Then it refuses with code <code> and status <status>

    Examples:
      | state                                              | code                          | status |
      | no row is "ws-a"                                   | workspace-not-found           | 404    |
      | "ws-a"'s projectRoot does not exist on this machine | workspace-not-local          | 409    |
      | the control has no node identity                   | control-identity-unknown      | 409    |
      | "wsl-2"'s presence is stale                        | session-target-not-connected  | 503    |
      | no relay is configured                             | session-dispatch-unavailable  | 503    |

  Scenario: a plan that passes mints a session id
    Given a mesh status in which "ws-a" is local and "wsl-2" is live, with a relay
    When `planSessionStart` is asked for workspace "ws-a" on node "wsl-2"
    Then it answers a canonical UUID session id with node "wsl-2" and workspace "ws-a"

  Scenario: the fleet route answers through the plan, unchanged to its client
    When the route's existing scenarios in `mesh-ui-session-route.test.mjs` run
    Then every one is green with no edit to its expectations
    And a 409 `control-identity-unknown` from the route carries the plan's message verbatim

  Scenario: FF-19103 · neither face builds the frame itself
    When `test/arch/session/acd-launched-session-from-discord.test.mjs` runs
    Then it fails if `packages/mesh/src/ui-serve.mjs` or `packages/mesh/src/commands/session.mjs` calls `buildSessionSpawnFrame` or `buildSessionSpawnEnvelope` outside `planSessionStart`'s answer path
    And it fails unless both import `planSessionStart` from `session-start.mjs`
