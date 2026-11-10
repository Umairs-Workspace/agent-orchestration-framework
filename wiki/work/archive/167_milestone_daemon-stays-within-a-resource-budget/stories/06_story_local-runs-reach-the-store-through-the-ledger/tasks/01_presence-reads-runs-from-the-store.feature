@executable @cli @work @distribution
Feature: The presence tick reads what is running from the store

  WHY. Every 15 s the daemon read a runs folder for each of 1,800 items, twice, to say what was
  running here, and that alone held it at 12% of a core while idle. It now reads the runs the
  workspaces put in the store, so a tick's cost no longer grows with the size of the trees it
  covers.

  Background:
    Given an isolated global home with this node "node-7297"
    And a launcher driven by an injected ticker
    And a mesh-enabled workspace "aof" registered on "node-7297"

  Rule: R2 · The presence tick reads what is running from the store, not from every item's runs folder

    Scenario: E6 · a large workspace costs no runs-folder read
      Given "aof" holds 1800 items and one running run on "01/00", started through "aof work run-start"
      When 1 tick runs
      Then no item's runs folder was read on that tick
      And the presence record's active runs are exactly that run

    Scenario: E7 · a running loop's last activity is its latest heartbeat
      Given a loop-driven run on "01/00" is running in "aof"
      And its record's heartbeat reads "2026-10-21T09:00:10.000Z"
      When 1 tick runs
      Then the presence record's loop entry for that loop carries last activity "2026-10-21T09:00:10.000Z"

    Scenario: E8 · another node's running row is not this node's active run
      Given the store holds a running row for "01/00" in "aof" reported by "node-2976"
      When 1 tick runs on "node-7297"
      Then that run is not in the presence record's active runs

    Scenario: E9 · a workspace that does not propagate is not in this node's presence
      Given a workspace "scratch" that does not propagate, with a running run on disk
      And the launcher is started from "scratch"
      When 1 tick runs
      Then that run is not in the presence record's active runs

    Scenario: a completed run leaves the presence record on the next tick
      Given a run on "01/00" is in the presence record's active runs
      When "aof work run-complete 01/00 --outcome done" runs in "aof"
      And 1 tick runs
      Then the presence record's active runs are empty
