@executable @cli @work @work-stream
Feature: FF-19108 and FF-19109 hold

  WHY. The two invariants the amendment adds are structural, so they are read at source: the control
  never binds the worker's checkout seams, and the relay's loopback endpoint has one derivation
  (ADR-001 amendment 2026-11-14, FF-19108, FF-19109).

  Scenario: FF-19108 — each branch binds its own checkout seams
    When the launcher's source is read
    Then the control branch's handler factory call binds `workerHasRepo` and `meshCheckoutPath` to the seams `createControlCheckoutSeams` returns
    And the worker branch's call binds the worker's `workerHasRepo` and `meshCheckoutPath`

  Scenario: FF-19109 — one loopback relay endpoint
    When the mesh package's source is read
    Then `DEFAULT_LOOPBACK_RELAY_PORT` is declared only in `terminal-relay-bridge.mjs`
    And the launcher's relay gate and broker port, and `meshUiProbe`'s relay check, read `loopbackRelayUrl`
    And neither reads `configuredRelayUrl` or the raw `mesh.relay.url` key for those decisions

  Scenario Outline: each control fails on its red probe
    Given the source is changed so that <change>
    When the control's leg runs
    Then it fails naming <names>

    Examples:
      | change                                                                 | names                                  |
      | the control branch passes the worker's `meshCheckoutPath`               | FF-19108 and the control branch        |
      | `launcher.mjs` declares its own `4183`                                  | FF-19109 and `launcher.mjs`            |
