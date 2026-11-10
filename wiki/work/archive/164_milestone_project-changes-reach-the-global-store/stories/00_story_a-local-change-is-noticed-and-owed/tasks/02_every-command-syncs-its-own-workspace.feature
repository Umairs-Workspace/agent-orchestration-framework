@executable @cli @work @distribution
Feature: Every aof command syncs its own workspace

  WHY. With the desktop app off, nothing noticed a change no verb raised, and owed work drained
  only when a later command happened to run. Every aof command now runs the sync pass for the
  workspace it runs in, just before it drains what the journal owes. So the project the operator
  is working in syncs with no daemon at all, and the command's own result never depends on it.

  Background:
    Given an isolated global store and effects journal
    And no mesh daemon is running

  Rule: R4 · Every aof command syncs the workspace it runs in, and never fails because of it

    Scenario: E12 · a hand edit reaches the store on the next command, with no daemon
      Given a mesh-propagating workspace "aof" that has been published and observed once
      And the STORY.md of "164/00" is hand-edited to "in-progress"
      When "aof work list" is run in "aof"
      Then the list is printed and the exit code is 0
      And the store's row for "164/00" says "in-progress"

    Scenario Outline: E13 · no pass runs where the workspace does not propagate
      Given <workspace>
      And a record in it is hand-edited
      When "aof work list" is run in it
      Then no "workspace.changed" event is appended
      And nothing is written to the store for it

      Examples:
        | example | workspace                                                   |
        | E13     | a workspace with no mesh.enabled and no mesh.repo.published |
        | E13     | a dispatch lane worktree of a mesh-propagating workspace    |

    Scenario: E14 · a failing pass changes nothing about the command's own result
      Given a mesh-propagating workspace "aof"
      And the global store cannot be opened
      And the STORY.md of "164/00" is hand-edited to "in-progress"
      When "aof work list --json" is run in "aof"
      Then stdout is exactly the list's one JSON document
      And the exit code is 0
      And a degrade is reported for the sync pass
