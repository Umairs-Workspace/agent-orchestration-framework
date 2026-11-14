@executable @cli @work @work-stream
Feature: the control opens a served project at its registered folder

  WHY. On the control, a project a channel serves is checked out where it was registered, not in a
  managed checkout and not behind a `mesh.repo.published` marker. The control's handler was given
  the worker's checkout seams, so every start for the control's own node refused
  `session-repo-unavailable` (F-03). The control now binds its own seams, built from the
  workspace's registered `project_root` (ADR-001 amendment 2026-11-14 §1).

  Background:
    Given a launcher started as the control node "ctl-1" with a relay
    And an injected PTY factory that records every spawn
    And the workspace "ws-a" registered on "ctl-1" with its project folder on disk
    And "ws-a" has no `mesh.repo.published` marker and no managed checkout

  Scenario: a spawn for the control's own node opens the PTY in the registered folder
    When a `session-spawn` envelope for node "ctl-1", session "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10", workspace "ws-a" arrives on the relay
    Then one PTY is spawned with its cwd at the registered project folder of "ws-a"
    And exactly one session record is written for workspace "ws-a" on "ctl-1"
    And an ok `session-spawn-ack` for session "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10" is pushed to the loopback relay

  Scenario: an item start opens in that item's worktree under the registered folder
    Given "ws-a" has the work item "07" in progress with a worktree
    When a `session-spawn` envelope for node "ctl-1", workspace "ws-a", item "07" arrives on the relay
    Then one PTY is spawned with its cwd at the worktree of item "07" under the registered project folder of "ws-a"

  Rule: a workspace the control cannot open is refused, and nothing is left behind

    Scenario Outline: a start for a workspace with no usable folder is refused
      Given the workspace "<workspace>" <state>
      When a `session-spawn` envelope for node "ctl-1", workspace "<workspace>" arrives on the relay
      Then a failed `session-spawn-ack` with code "session-repo-unavailable" is pushed to the loopback relay
      And no PTY is spawned and no session record is written

      Examples:
        | workspace | state                                                  |
        | ws-b      | is not registered on "ctl-1"                           |
        | ws-c      | is registered on "ctl-1" with a folder that is gone    |

  Rule: a worker is unchanged

    Scenario: a worker still opens a session in its managed checkout
      Given a launcher started as the worker node "wsl-2"
      And the workspace "ws-a" has a managed checkout on "wsl-2"
      When a `session-spawn` frame for node "wsl-2", workspace "ws-a" arrives on its stream
      Then one PTY is spawned with its cwd at the managed checkout of "ws-a"
