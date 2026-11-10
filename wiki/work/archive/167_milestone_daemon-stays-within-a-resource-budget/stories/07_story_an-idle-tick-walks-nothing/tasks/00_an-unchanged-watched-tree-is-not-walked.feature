@executable @cli @work @distribution
Feature: An unchanged watched tree is not walked
  As the operator, whose daemon stat-walks every registered work tree about three times a tick,
  I want a tree the daemon watches to be walked only when something in it has changed,
  so that an idle daemon spends almost none of its budget on a tree as large as aof's.

  The gate is inside the one walk (`statWorkTree`), so the stat gate, the backoff check and the
  presence read all answer through it. Every walk in a process that holds watches is counted as
  `stat-walk`, labelled with its reason.

  Background:
    Given a work tree of 1,800 record docs
    And the process holds a watch on it, armed and walked once

  Rule: R1 · A watched tree is walked only when it changed, or when its last walk is 5 minutes old

    Scenario: E1 · ten idle ticks walk nothing
      When the daemon runs ten ticks and nothing in the tree is edited
      Then no "stat-walk" is counted
      And the stat gate, the backoff check and the presence read each answer the tree's last digest

    Scenario: E2 · a backed-off workspace that moved and fails again walks once
      Given the tree's workspace is backed off for a permanent sync failure
      And a record doc in the tree is edited
      When the next tick tries the workspace and it fails again
      Then exactly one "stat-walk" is counted on that tick

    Scenario Outline: the safety walk's edge
      Given the last walk was <age> ago and no event has arrived since
      When the next ask is made
      Then <outcome>

      Examples:
        | example | age        | outcome                                       |
        |         | 4 min 59 s | no "stat-walk" is counted                     |
        | E7      | 5 min 0 s  | one "stat-walk" labelled "safety" is counted  |

  Rule: R2 · A change under a watched tree makes the next ask walk it once

    Scenario: E3 · an edited status is walked once and synced
      When a STORY.md's status is edited
      And the next tick runs
      Then one "stat-walk" labelled "changed" is counted
      And the sync pass publishes the change
      And the tick after that counts no "stat-walk"

    Scenario Outline: which events make the tree dirty
      When the watch reports <event>
      Then the next ask <walks>

      Examples:
        | example | event                                              | walks             |
        | E4      | a folder made with no record doc in it             | walks the tree    |
        | E5      | runs/node-7297/20261022T150000000Z-0000.json       | does not walk     |
        |         | a task .feature written                            | walks the tree    |
        |         | an event with no file name                         | walks the tree    |
        |         | logs/mesh-serve.log appended                       | does not walk     |

    Scenario: E6 · an event during a walk makes the next ask walk again
      Given a walk of the tree is in flight
      When the watch reports a STORY.md edited before the walk ends
      Then the next ask walks the tree

    Scenario: two asks while one walk is in flight share it
      Given the tree is dirty
      When two callers ask for its digest at the same moment
      Then one "stat-walk" is counted
      And both get the same digest
