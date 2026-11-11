@executable @cli @work @distribution
Feature: The real daemons hold the budget with the motivating faults planted

  WHY. The 17-hour burn came from cadence × tree size × three silent faults, which no unit test
  could see. The soak runs the real `mesh serve` and `mesh ui` over a tree as large as aof's, with
  those faults planted and a viewer polling, and judges each daemon against the budget. It also
  checks that each fault is named where the operator looks.

  Background:
    Given a generated project "soak" of 1800 record docs under an isolated global home
    And the cache holds no rows for "soak"
    And the sync of "soak" fails with "event-id-conflict"
    And 5 registered workspaces whose work dirs do not exist
    And "mesh serve --serve" and "mesh ui" are running on free ports, warmed up for 15 seconds

  Rule: R1 · The real daemons hold the budget over a tree as large as aof's, with the faults planted

    Scenario: E1 · with no viewer, each daemon is under the idle budget
      When 30 seconds pass with no viewer
      Then "serve" spent less CPU than the idle budget allows over the phase
      And "ui" spent less CPU than the idle budget allows over the phase

    Scenario: E2 · with a viewer polling, each daemon is under the viewer-open budget
      When a viewer polls the fleet and the board at the UI's cadence for 30 seconds
      Then "serve" spent less CPU than the viewer-open budget allows over the phase
      And "ui" spent less CPU than the viewer-open budget allows over the phase
      And both daemons' snapshots state "viewer-open" for the phase

    Scenario: E3 · a phase over budget fails the soak and says why
      Given a recorded "idle" phase in which "serve" spent 9 CPU-seconds in 30 seconds, mostly on "full-disk-read" for "soak"
      When the soak judges the phase
      Then the judgement fails
      And it names "serve", "idle", 30%, the idle budget, "full-disk-read" and the workspace id of "soak"

  Rule: R2 · The planted faults are named where the operator looks

    Scenario: E4 · mesh status names each planted fault with its workspace
      Given the idle and viewer phases have run
      When "aof mesh status --json" is run under the soak's global home
      Then its cost block counts "work-read-cache-unavailable" for the workspace id of "soak"
      And it counts a "sync-failure" with code "event-id-conflict" for the workspace id of "soak"
      And it counts a "sync-failure" with code "workdir-missing" for each of the 5 gone workspaces

    Scenario: E5 · each sync fault is logged once, not once per tick
      Given the idle and viewer phases have run
      Then the soak's degrade log holds 1 "event-id-conflict" line for "soak"
      And it holds 1 "workdir-missing" line for each of the 5 gone workspaces
