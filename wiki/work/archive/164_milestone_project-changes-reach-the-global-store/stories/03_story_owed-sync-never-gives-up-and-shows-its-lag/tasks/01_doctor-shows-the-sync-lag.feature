@executable @cli @work @validate
Feature: Doctor shows what is owed and how far behind each workspace is

  WHY. Nothing said whether the global store was current or quietly behind. The operator found out
  from a stale fleet card. `aof work doctor` now shows each workspace's sync state: what is owed,
  for how long, why it fails, and when each workspace last synced. It warns when a sync keeps
  failing, and when this workspace holds changes not yet synced.

  Background:
    Given an isolated global store and effects journal, with this node "node-7297"
    And the mesh-propagating workspaces "aof" and "aof-test-repo" are registered on "node-7297"

  Rule: R2 · `aof work doctor` shows what is owed and how far behind each workspace is

    Scenario: E4 · a failing owed sync is shown with its age, attempts and error, and warns
      Given the "workspace.changed" step for "aof" has failed 7 times over 40 minutes with "database is locked"
      When "aof work doctor --json" is run in "aof"
      Then the sync block for "aof" says its sync is owed, for 40 minutes, after 7 attempts, with the last error "database is locked"
      And a "sync-failing" warn finding names "aof"

    Scenario: E5 · with everything in sync, each workspace shows its last sync and no finding
      Given nothing is owed for either workspace
      And "aof" last synced at "2026-10-19T09:00:00Z" and "aof-test-repo" at "2026-10-19T08:30:00Z"
      When "aof work doctor --json" is run in "aof"
      Then the sync block lists "aof" last synced "2026-10-19T09:00:00Z" and "aof-test-repo" last synced "2026-10-19T08:30:00Z"
      And it says nothing is owed
      And no "sync-failing" or "sync-behind" finding is raised

    Scenario: E6 · records changed since the last sync are counted and warned on
      Given "aof-test-repo" last synced 2 hours ago
      And two of its records have been hand-edited since
      When "aof work doctor --json" is run in "aof-test-repo"
      Then the sync block for "aof-test-repo" counts 2 records changed and not yet synced, last synced 2 hours ago
      And a "sync-behind" warn finding names "aof-test-repo"

    Scenario: the text report prints one sync line per workspace
      Given the "workspace.changed" step for "aof" has failed 7 times over 40 minutes with "database is locked"
      When "aof work doctor" is run in "aof"
      Then the report prints one sync line for "aof" and one for "aof-test-repo"
      And the line for "aof" names "owed", "40m", "7 attempts" and "database is locked"

    Scenario: sync findings never fail validate
      Given the "workspace.changed" step for "aof" has failed 7 times
      When "aof work validate" is run in "aof"
      Then the exit code is 0
