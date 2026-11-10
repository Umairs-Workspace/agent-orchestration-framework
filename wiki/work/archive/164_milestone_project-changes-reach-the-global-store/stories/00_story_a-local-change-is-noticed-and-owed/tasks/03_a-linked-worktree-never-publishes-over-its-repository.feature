@executable @cli @work @distribution @bug @finding-F-06
Feature: A linked worktree never publishes over its repository's checkout

  WHY. A linked `git worktree` of a mesh-published repository carries the repository's committed
  config, and so its `workspaceId`. Since every command now syncs its own workspace, measured live at
  164's verify: a sibling worktree republished every row of the workspace, and the workspace's root,
  on each command run in it, and the primary checkout republished them back on its next command, so
  the store answered from whichever checkout ran last. A linked worktree is not the workspace: its
  work reaches the store through the repository's checkout, once it merges home.

  Background:
    Given an isolated global store on node "node-7297"
    And a mesh-published repository whose story "164/00" is "not-started"
    And a linked git worktree of it, in which "164/00" is "in-progress"

  Rule: R5 · Only the repository's own checkout publishes its workspace

    Scenario: E15 · a command in a linked worktree publishes nothing
      Given the repository's checkout has synced once
      When "aof work list" runs in the linked worktree
      Then the store's row for "164/00" still says "not-started"
      And the workspace's project root in the store is still the repository's checkout
      And no "workspace.changed" event names the linked worktree

    Scenario: E16 · the repository's own checkout still syncs
      Given the linked worktree has run a command
      When "164/00" is hand-edited to "in-review" in the repository's checkout and "aof work list" runs there
      Then the store's row for "164/00" says "in-review"
