@executable @cli @work @distribution @bug @finding-F-2
Feature: a rename with --name reports what the old id keyed, exactly as --reidentify does

  F-2 (132/VERIFICATION), read at the source on 2026-09-23. The control node was renamed with
  `aof mesh identity --name <id>` on 2026-09-22. The sidecar took the new id, but
  `~/.aof/aof.config.json` still named the OLD id as `mesh.relay.controlNode`, so `mesh status`
  answered `isControlNode: false`. The desktop supervisor starts `mesh serve --serve` only once
  that reads true, so the operator's next relaunch came up with no control daemon on `:4182`, and
  nothing said why. `--reidentify` would have named that key: it reports every setting keyed by
  the id it moves away from. `--name` moved the id just as far and reported nothing.

  So "re-identification is one deliberate edge that says what it broke" (task 01) held for one of
  the two verbs that change an id. The fix makes `--name` the same kind of edge: when it moves an
  EXISTING id, it answers the re-identification envelope `{ from, to, changed, invalidated,
  record }` with the same `invalidated` entries `--reidentify` computes, from one shared scan.

  RULINGS (2026-09-23). (1) Report, never repair — task 01's ruling (4) holds for both verbs:
  `--name` rewrites no config key and deletes no record; the operator re-points or re-joins
  deliberately. (2) The envelope is only for a MOVE. A first `--name` on a node with no id yet,
  and a `--name` that repeats the current id, still answer the bare node record — the delivered
  `--json` shape for a publish is unchanged. (3) There is ONE invalidation scan, shared by both
  verbs, so the two reports can never disagree about what an old id keyed.

  Background:
    Given a node whose sidecar holds the id `"old-node"`
    And its config carries `mesh.credential.nodeId` = `"old-node"` and `mesh.relay.controlNode` = `"old-node"`
    And a node record for `"old-node"` exists

  Scenario: renaming a control node names every setting keyed by the old id
    When `mesh:identity` runs with `{ name: "new-node" }`
    Then the result is `{ from: "old-node", to: "new-node", changed: true }`
    And `invalidated` names the `node-record` for `"old-node"`, the `enrollment-credential` in `mesh.credential`, and the `control-node-nomination` in `mesh.relay.controlNode`
    And `record` is this node's descriptor, published under `"new-node"`
    And the sidecar reads `nodeId: "new-node"` with `pinned: true`

  Scenario: the rename reports and repairs nothing
    When `mesh:identity` runs with `{ name: "new-node" }`
    Then `mesh.relay.controlNode` and `mesh.credential.nodeId` in config still read `"old-node"`
    And the node record for `"old-node"` still exists

  Scenario: both verbs compute the same report from the same scan
    Given the same node, fixture and old id
    When the rename's `invalidated` is compared with what `--reidentify` reports for a move away from `"old-node"`
    Then the two lists are equal, entry for entry

  Scenario Outline: a publish that moves no id keeps the bare node record
    Given a node whose sidecar holds <prior>
    When `mesh:identity` runs with `{ name: "<name>" }`
    Then the result is the bare node record with `nodeId` = `"<name>"`, carrying no `from`, `to` or `invalidated`

    Examples:
      | prior                    | name     |
      | no id at all             | aof-wsl  |
      | the id `"aof-wsl"`       | aof-wsl  |

  Scenario: the text face says what the rename stranded
    When `aof mesh identity --name new-node` renames a node from `"old-node"`
    Then stdout reads `Re-identified old-node → new-node.`
    And it lists each invalidated entry under `Keyed by the old id, now stale:`
