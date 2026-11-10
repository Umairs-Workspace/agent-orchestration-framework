@executable @cli @work @distribution
Feature: The daemon catches up when it starts

  WHY. A change made while the desktop app is off (a git pull, a hand edit, a scaffold) raises no
  event and has no daemon to notice it. The launcher runs the same sync pass over every registered
  workspace once when it starts, before the first tick, so everything made while it was off lands
  as soon as it is back.

  Background:
    Given an isolated global store on node "node-7297"
    And the mesh-propagating workspaces "aof" and "aof-test-repo" are registered on "node-7297"
    And both were synced before the launcher stopped

  Rule: R3 · A change made while the app was off lands when it starts

    Scenario: E7 · changes made while stopped are in the store before the first tick
      Given the launcher is stopped
      And story "01/00" in "aof-test-repo" is changed to "in-review" by a pulled commit
      And story "164/00" in "aof" is hand-edited to "in-progress"
      When the launcher starts, with an injected propagation ticker that has not fired
      Then the store's row for "01/00" in "aof-test-repo" says "in-review"
      And the store's row for "164/00" in "aof" says "in-progress"

    Scenario: E8 · a start with nothing changed marks nothing
      Given the launcher is stopped
      And no record in either workspace changes
      When the launcher starts
      Then no "workspace.changed" event is appended
