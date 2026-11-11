@executable @cli @work @validate
Feature: `aof mesh status` and `aof work doctor` say what each daemon costs

  WHY. Counts that only live in a daemon's memory help nobody. `aof mesh status --json` shows
  each daemon's cost, its budget and its top causes, and the desktop reads the budget from there.
  `aof work doctor` warns when a daemon is over budget, naming what it is spending its time on, and
  when a daemon has stopped reporting. The budget is 2% of a core idle and 10% with a view open,
  averaged over a minute.

  Background:
    Given an isolated global home with this node "node-7297"
    And the clock reads "2026-10-20T18:30:00Z"

  Rule: R2 · `aof mesh status --json` shows what each daemon costs

    Scenario: E4 · both daemons reporting are shown with their share, state, budget and causes
      Given a "serve" snapshot written at "18:29:50" at 1.5% of a core, "idle", top cause "sync-pass" for "aof"
      And a "ui" snapshot written at "18:29:52" at 6% of a core, "viewer-open", top cause "request" for "/api/work/list"
      When "aof mesh status --json" is run
      Then the cost block lists "serve" at 1.5% in state "idle" against a budget of 2%
      And it lists "ui" at 6% in state "viewer-open" against a budget of 10%
      And each lists its top three causes with their labels
      And the cost block states the budget as 2% idle and 10% viewer-open

    Scenario: E5 · a snapshot three writes late reads as not reporting
      Given a "serve" snapshot written at "18:29:10"
      And a "ui" snapshot written at "18:29:55"
      When "aof mesh status --json" is run
      Then "serve" reads "not-reporting", last reported 50 seconds ago
      And "ui" reads normally

    Scenario: E6 · a node where no daemon has run shows an empty cost block
      Given no cost snapshot exists
      When "aof mesh status --json" is run
      Then the result has a cost block with no daemons and the budget stated

    Scenario: the text report prints one cost line per daemon
      Given a "serve" snapshot written at "18:29:50" at 1.5% of a core, "idle", top cause "sync-pass" for "aof"
      When "aof mesh status" is run
      Then the report prints a line for "serve" naming "1.5%", "idle", "2%" and "sync-pass"

  Rule: R3 · `aof work doctor` warns when a daemon is over budget, naming what it is spending on

    Scenario: E7 · an idle daemon over budget is named with its top cause
      Given a "serve" snapshot written at "18:29:50" at 38% of a core, "idle", top cause "full-disk-read" for workspace "52294b307214c27d"
      When "aof work doctor --json" is run
      Then a "daemon-over-budget" warn names "serve", "38%", "2%", "full-disk-read" and "52294b307214c27d"

    Scenario: E8 · a daemon that stopped reporting is warned on
      Given a "ui" snapshot written at "18:28:00"
      When "aof work doctor --json" is run
      Then a "daemon-not-reporting" warn names "ui" and "2 minutes"

    Scenario: E9 · daemons under budget raise nothing
      Given a "serve" snapshot written at "18:29:50" at 1.5% of a core, "idle"
      And a "ui" snapshot written at "18:29:52" at 6% of a core, "viewer-open"
      When "aof work doctor --json" is run
      Then no "daemon-over-budget" or "daemon-not-reporting" finding is raised

    Scenario: a daemon warn never fails validate
      Given a "serve" snapshot written at "18:29:50" at 38% of a core, "idle"
      When "aof work validate" is run
      Then the exit code is 0

    Scenario Outline: the judgement holds at the budget's edges
      Given a "serve" snapshot written at "18:29:50" at <share> of a core, "<state>"
      When "aof work doctor --json" is run
      Then <finding>

      Examples:
        | share | state       | finding                                   |
        | 2%    | idle        | no "daemon-over-budget" finding is raised |
        | 2.1%  | idle        | a "daemon-over-budget" warn names "serve" |
        | 10%   | viewer-open | no "daemon-over-budget" finding is raised |
        | 11%   | viewer-open | a "daemon-over-budget" warn names "serve" |
