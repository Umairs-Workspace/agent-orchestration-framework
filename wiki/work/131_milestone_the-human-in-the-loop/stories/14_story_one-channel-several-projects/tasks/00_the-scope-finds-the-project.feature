@executable @cli @work @work-stream
Feature: one Discord channel serves several projects, and `/loop` finds the project by the loop the scope names

  ADR-009 §3 kept, for a `/loop` command, the projects on the channel that allow the user, and
  refused `discord-scope-ambiguous` whenever more than one was kept and no `workspace:` was given.
  One channel for every repository made that the normal case (operator, 07's leg 7). The scope
  already names a loop, and only a project with a loop on it can mean it.

  RULINGS (PO, 2026-09-26). (1) With several kept projects and no `workspace:`, a project counts only
  when the scope carries a loop declaration in it, read through the stop core's own declaration
  read (`hasLoopOn`, `src/loop/stop.mjs`). (2) One such project is taken, and the verb runs there.
  (3) None is refused `discord-loop-not-found`, naming the projects on the channel. (4) Two or more
  are refused `discord-scope-ambiguous`, naming only those. (5) `workspace:` still picks by id or
  folder name, and a name that matches none is refused as before. (6) One kept project needs no
  lookup: the verb itself refuses a scope with no loop. (7) The served list folds every member
  through `foldDispatchWorktree`, so a dispatch lane's worktree is never served as a project.

  Scenario: the one project with a loop on the scope is taken, for stop and for resume
    Given two projects on the channel allow the user, and only "beta" has a loop on scope 131
    When `/loop stop scope:131` and then `/loop resume scope:131` are sent with no `workspace:`
    Then each dispatches `work:loop` in "beta" alone

  Scenario: no project with a loop on the scope says so
    Given two projects on the channel allow the user, and neither has a loop on scope 131
    When `/loop stop scope:131` is sent
    Then nothing is invoked, and the reply names `discord-loop-not-found` and the projects

  Scenario: a real tie still asks for workspace:, naming only the tied projects
    Given two projects on the channel allow the user, and both have a loop on scope 131
    When `/loop stop scope:131` is sent
    Then nothing is invoked, and the reply names `discord-scope-ambiguous`, "alpha" and "beta"
    When `/loop stop scope:131 workspace:beta` is sent
    Then `work:loop` is dispatched in "beta"

  Scenario: one project needs no lookup
    Given one project on the channel allows the user
    When `/loop stop scope:131` is sent
    Then `work:loop` is dispatched there without consulting `hasLoopOn`
