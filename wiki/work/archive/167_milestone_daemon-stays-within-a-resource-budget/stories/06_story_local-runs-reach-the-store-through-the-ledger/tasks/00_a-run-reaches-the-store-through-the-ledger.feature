@executable @cli @work @distribution
Feature: A run on this node reaches the store through the ledger

  WHY. The store has always held the runs a worker streams up, but never the runs that start on
  this machine, so the only way to know what was running here was to walk every item's runs
  folder. Each run transition already raises an event into the ledger, and that event's publish
  step now writes the run itself into the store. The workspace keeps the store up to date as its
  runs change.

  Background:
    Given an isolated global home with this node "node-7297"
    And a mesh-enabled workspace "aof" with item "01/00"

  Rule: R1 · A run on this node reaches the store when it starts and when it ends

    Scenario: E1 · a started run is in the store, running, reported by this node
      When "aof work run-start 01/00" runs in "aof"
      Then the store's run rows for "aof" hold that run with state "running"
      And the row is reported by "node-7297"

    Scenario: E2 · a completed run's row reads its outcome
      Given a run on "01/00" was started in "aof"
      When "aof work run-complete 01/00 --outcome done" runs in "aof"
      Then the store's row for that run reads state "done"

    Scenario: E3 · a reclaimed run's row is no longer running
      Given a run on "01/00" was started in "aof" and has been silent past the staleness threshold
      When the stale runs of "aof" are reclaimed
      Then the store's row for that run no longer reads "running"

    Scenario: E4 · a store that cannot be opened delays the row and never refuses the run
      Given the global store cannot be opened
      When "aof work run-start 01/00" runs in "aof"
      Then the run is started
      And its publish step is owed in the journal
      When the store can be opened again and the owed steps drain
      Then the store's run rows for "aof" hold that run with state "running"

    Scenario: E5 · a run recorded before the ledger carried runs reaches the store by reconciling
      Given "01/00" has a "running" run record on disk with no "run.started" event in the journal
      When the runs of "aof" are reconciled
      Then the store's run rows for "aof" hold that run with state "running"
