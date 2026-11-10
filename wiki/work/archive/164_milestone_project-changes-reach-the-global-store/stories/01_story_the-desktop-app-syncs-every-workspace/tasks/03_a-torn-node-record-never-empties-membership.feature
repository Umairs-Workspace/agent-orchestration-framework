@executable @cli @work @distribution @bug @finding-F-02
Feature: A torn node record never empties a workspace's membership

  WHY. The tick syncs the workspaces this node is linked to in the store, and every publish
  rewrites a workspace's links from the node records under the global mesh root. Measured live at
  164's verify: all three node records were NUL-filled after a crash, the reader skipped them
  silently, and each command's publish then wrote the workspace with no members, so the daemon
  stopped syncing it. A roster with an unreadable record is partial, so the publish refuses to
  rewrite membership, says why, and the owed sync retries until the record is readable again.

  Background:
    Given an isolated global store on node "node-7297"
    And the mesh-propagating workspace "aof-test-repo" is linked to "node-7297" and "node-2976"

  Rule: R4 · A publish over an unreadable node record keeps the last membership and fails loud

    Scenario: E9 · a torn node record leaves the workspace's links and descriptor as they were
      Given the node record of "node-2976" is unreadable
      When a record in "aof-test-repo" changes and the sync pass runs
      Then "aof-test-repo" is still linked to "node-7297" and "node-2976"
      And its workspace descriptor still lists both members
      And the publish step is "failed" with the code "node-record-unreadable", naming the unreadable record
      And the changed record's row is not written, so the change is still owed

    Scenario: E10 · once the record is readable again, the next pass lands the owed change
      Given the node record of "node-2976" is unreadable
      And a record in "aof-test-repo" changed and its publish step failed
      When the node record of "node-2976" is restored and, after the failed step's backoff, the sync pass runs
      Then the publish step is "done"
      And the changed record's row is written
      And "aof-test-repo" is linked to "node-7297" and "node-2976"
