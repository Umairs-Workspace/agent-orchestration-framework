@executable @cli @work @distribution
Feature: The daemon holds one watch per tree it syncs, and walks as today where it cannot
  As the operator, whose daemon must never quietly stop seeing my edits,
  I want only the serving daemon to watch, only the trees its sync pass covers, and a tree it
  cannot watch to be walked exactly as before,
  so that a failed watch costs me the walk I paid before this change and one line saying so, never
  a missed edit or a line every tick.

  Rule: R3 · A tree that cannot be watched is walked on every ask, as today, and said once

    Scenario: E8 · a watch that cannot start falls back to the walk
      Given arming the watch on a registered work dir throws "EMFILE"
      When the daemon runs three ticks
      Then each tick walks that tree, counted "stat-walk" labelled "unwatched"
      And exactly one "work-tree-watch-unavailable" line names that work dir

    Scenario: E9 · a watch that errors later is closed and falls back
      Given the daemon holds a watch on a registered work dir
      When the watch emits an error
      Then the watch is closed
      And the next tick walks that tree
      And exactly one "work-tree-watch-unavailable" line names that work dir

  Rule: R4 · Only `mesh serve` watches, and only the trees its sync pass covers

    Scenario: E10 · a process that arms no watch walks on every read
      Given a CLI process that holds no watch
      When it reads an unchanged work tree twice
      Then the tree is walked twice
      And no "stat-walk" is counted

    Scenario: E11 · a workspace that does not propagate is not watched
      Given a registered dispatch lane that does not propagate
      When the daemon runs a tick
      Then no watch is held on the lane's work dir

    Scenario: E12 · a registration that leaves the tick set loses its watch
      Given the daemon holds a watch on a registered work dir
      When that registration is removed and the next tick runs
      Then the watch on that work dir is closed

    Scenario: the daemon's stop closes every watch
      Given the daemon holds watches on two registered work dirs
      When the daemon stops
      Then no watch is held

    Scenario: E13 · a tick that cannot read the registry changes no watch
      Given the daemon holds a watch on a registered work dir
      When a tick cannot read the registry
      Then the watch on that work dir is still held
