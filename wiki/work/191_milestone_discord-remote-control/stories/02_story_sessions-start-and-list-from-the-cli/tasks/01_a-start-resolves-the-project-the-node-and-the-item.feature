@executable @cli @work @work-stream
Feature: a start resolves the project, the node and the item

  WHY. From a phone the operator names a project by its folder, not its workspace id, rarely names a
  node, and may name an item. Each must resolve to one thing or be refused by name, so a typo never
  starts the wrong session or mints a stray worktree (ADR-003 §2).

  Background:
    Given the control "ctl-1" with local workspaces "aof" (id "ws-a") and "notes" (id "ws-n")

  Scenario Outline: the project is found by id or by folder name
    When `mesh:session-start` runs with project <given>
    Then the frame is pushed for workspace <workspace>

    Examples:
      | given   | workspace |
      | "ws-a"  | "ws-a"    |
      | "aof"   | "ws-a"    |
      | "notes" | "ws-n"    |

  Scenario: an unknown project is refused naming the ones there are
    When `mesh:session-start` runs with project "aoff"
    Then it refuses `session-project-unknown` naming "aof" and "notes"
    And nothing is pushed to the relay

  Scenario: two projects with the same folder name are refused as ambiguous
    Given a third local workspace "ws-b" whose folder is also "aof"
    When `mesh:session-start` runs with project "aof"
    Then it refuses `session-project-ambiguous` naming "ws-a" and "ws-b"

  Scenario Outline: the node defaults to the control and can be named
    When `mesh:session-start` runs with project "aof" and node <node>
    Then the frame is pushed for node <target>

    Examples:
      | node    | target  |
      | absent  | "ctl-1" |
      | "wsl-2" | "wsl-2" |

  Scenario: every start asks for Claude with Remote Control
    When `mesh:session-start` runs with project "aof"
    Then the pushed frame carries launch "claude-remote-control"

  Scenario: an item that exists is carried to the node
    When `mesh:session-start` runs with project "aof" and item "191"
    Then the frame is pushed with itemRef "191"

  Scenario: the CLI face carries the verb
    When `aof mesh session start aof --item 191 --json` runs against the fixture
    Then it prints the verb's answer as JSON with `project`, `item`, `nodeId`, `sessionId` and `name`

  Rule: R2 · A start that cannot land says why, in the route's words

    Scenario: E4 · an offline node is refused with the fleet button's code
      Given node "wsl-2"'s presence is stale
      When `aof mesh session start aof --node wsl-2 --json` runs
      Then it refuses `session-target-not-connected`, the code the fleet route answers for the same state
      And nothing is pushed to the relay

    Scenario: E6 · a mistyped item is refused and makes no worktree
      When `aof mesh session start aof --item 19l --json` runs
      Then it refuses `session-item-unknown`
      And nothing is pushed to the relay, so no node is asked to make a worktree
