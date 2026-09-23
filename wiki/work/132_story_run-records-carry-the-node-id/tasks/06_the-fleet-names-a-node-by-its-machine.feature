@executable @cli @work @distribution @bug @finding-F-5
Feature: the fleet titles a node with its machine name, and the id stays beside it

  F-5 (132/VERIFICATION), reported by the operator after accept on 2026-09-23. With every node
  re-identified, the desktop fleet listed `node-7297`, `node-2976` and `node-9549` and nothing a
  person recognises. Task 02 put the machine name on the node record as `hostname`, but the
  registry sync rewrites every `nodes/<id>.json` from a descriptor it assembles key by key, and
  that descriptor had no `hostname`. So the name was on the record for one sync interval and then
  gone, before either fleet face could read it.

  RULINGS (2026-09-23). (1) The id stays the identity everywhere — selection, assignment, stop,
  every key. Only the title a person reads changes. (2) The name is read from the record, which
  lives in the aof home; nothing here writes a machine name into a checkout. (3) A record with no
  `hostname` is titled with its id, exactly as before. (4) macOS's `.local` suffix is dropped from
  the title.

  Scenario: the registry sync keeps the machine name it rewrites
    Given a node record `{ nodeId: "node-a", host: "192.0.2.10", hostname: "Desk-Host" }` in the aof home
    When the registry descriptors are published to the global store
    Then the rewritten `nodes/node-a.json` still reads `hostname: "Desk-Host"`
    And `host` still reads `"192.0.2.10"`

  Scenario Outline: the web fleet titles a node with its machine name
    When `nodePanelFacts` is asked for a node with `nodeId` "<nodeId>" and `hostname` <hostname>
    Then `name` is "<name>"
    And `nodeId` is still "<nodeId>"

    Examples:
      | nodeId     | hostname          | name       |
      | node-7f3a  | "Desk-Host.local" | Desk-Host  |
      | local-node | absent            | local-node |

  Scenario Outline: the desktop row is titled with the machine name and keeps the id
    When `node_row` renders a node with `nodeId` "<nodeId>" and `hostname` <hostname>
    Then the row's `name` is "<name>" and its `node_id` is "<nodeId>"

    Examples:
      | nodeId    | hostname          | name      |
      | node-7f3a | "Desk-Host.local" | Desk-Host |
      | node-beef | absent            | node-beef |
