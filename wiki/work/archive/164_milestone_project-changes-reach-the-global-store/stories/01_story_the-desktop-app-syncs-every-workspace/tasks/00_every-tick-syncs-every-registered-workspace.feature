@executable @cli @work @distribution
Feature: Every tick syncs every registered workspace

  WHY. The daemon's propagation tick publishes only the workspace it was launched from, and the
  desktop app launches it from a folder with no aof config, so no project is ever re-read while
  the app runs. The tick now runs the one sync pass over every workspace registered on this node,
  skipping loudly what it cannot sync and carrying on.

  Background:
    Given an isolated global store on node "node-7297"
    And the mesh-propagating workspaces "aof" and "aof-test-repo" are registered on "node-7297"
    And the launcher is started from a folder with no aof config, with an injected propagation ticker

  Rule: R1 · While the app runs, every registered workspace is synced on every tick

    Scenario: E1 · a hand edit in a workspace the daemon was not launched from lands within one tick
      Given story "01/00" in "aof-test-repo" is "not-started" in the store
      And its STORY.md is hand-edited to "in-progress"
      When one propagation tick fires
      Then the store's row for "01/00" in "aof-test-repo" says "in-progress", reported by "node-7297"
      And the launch folder was not published

    Scenario: E2 · only a workspace that changed is marked
      Given both workspaces were synced on the previous tick
      And only "aof-test-repo" has changed since
      When one propagation tick fires
      Then the journal gains one "workspace.changed" event, for "aof-test-repo"
      And no "workspace.changed" event is appended for "aof"

    Scenario: E3 · a launch folder that is also registered is synced once
      Given the launcher is started from the "aof" workspace folder
      When one propagation tick fires
      Then the sync pass runs once for "aof" and once for "aof-test-repo"

  Rule: R2 · A workspace that cannot be synced is reported and skipped; the tick goes on

    Scenario Outline: a workspace that cannot be synced is skipped with a coded warning
      Given the registered workspace "aof-test-repo" <condition>
      When one propagation tick fires
      Then a warning names "aof-test-repo" with the code "<code>"
      And nothing is written to the store for "aof-test-repo"
      And "aof" is still synced on the same tick

      Examples:
        | example | condition                                   | code                        |
        | E4      | has had its folder deleted                  | workdir-missing             |
        | E5      | has no mesh.enabled and no mesh.repo.published | mesh-global-disabled     |

    Scenario: E6 · a store that cannot be opened on one tick does not stop the daemon
      Given the global store cannot be opened
      When one propagation tick fires
      Then a warning is emitted with the code "global-work-propagation-failed"
      And the launcher is still running
      And when the store opens again and the next tick fires, both workspaces are synced
