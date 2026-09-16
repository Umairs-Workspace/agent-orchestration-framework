@executable @cli @work @distribution
Feature: a node resolves its mesh role and, when a worker, the control node's fabric dial address for streaming
  In order to know whether to open a stream and where to point it, a node determines from config whether it is
  a worker (a control node is set and it is not that node) and resolves the control node's dial address from
  the fabric peer map, degrading cleanly to a stream retry state when the control node is not reachable on the fabric.

  # ARCHITECTURE ADR-007 (worker predicate = the inverse of the 33 control-node predicate; the
  # control-node dial address is resolved via the 33 fabric seam). The "resolved via mesh-fabric, never a
  # hand-derived URL" INVARIANT is structural -> the fitness acd-worker-stream-fabric-addressed, NOT a step
  # here; this feature asserts only the OBSERVABLE resolved role + address.

  Scenario Outline: a node's mesh role follows the control-node config
    Given this node's id is "<nodeId>" and config.mesh.relay.controlNode is <controlNode>
    Then this node's mesh role is "<role>"

    Examples:
      | nodeId          | controlNode      | role       |
      | umamis-mac-mini | "umamis-msi"     | worker     |
      | umamis-msi      | "umamis-msi"     | control    |
      | umamis-mac-mini | (absent)         | standalone |

  Scenario: a worker resolves the control node's dial address from the fabric peer map
    Given this node is a worker whose control node is "umamis-msi"
    And the fabric peer map lists "umamis-msi" with dial address "203.0.113.180"
    When the node resolves its stream target
    Then the resolved stream target is "203.0.113.180"

  Scenario: a worker whose control node is absent from the fabric enters stream retry
    Given this node is a worker whose control node is "umamis-msi"
    And the fabric peer map does NOT list "umamis-msi"
    When the node resolves its stream target
    Then no stream target is resolved
    And the node reports "control node not reachable on the fabric; stream sync will retry"
    And no connection attempt is made