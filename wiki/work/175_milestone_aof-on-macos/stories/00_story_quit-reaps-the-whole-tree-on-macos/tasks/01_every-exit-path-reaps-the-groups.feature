@manual @cli @work @distribution
Feature: Every exit path reaps the supervised groups on a real Mac

  WHY. Quit, a terminate request and the OS's own quit all reach one exit, and the reap runs
  there; closing the window only hides it (ADR-001 §4). Only a running app on a Mac with a GUI
  login shows it. This task also measures RESEARCH Q1 — which `RunEvent` and `code` an OS quit
  arrives as — and records the answer in the story's Notes.

  Background:
    Given a Mac with a GUI login, the app built from this story, and both daemons up under it
    And "ps -o pid,pgid,comm -ax" shows each daemon leading its own process group

  Rule: R1 · Every kill the supervisor makes reaches the whole process group

    Scenario: E1 · Quit from the menu leaves no aof process
      When the operator chooses Quit from the menu-bar menu
      Then within 10 s "pgrep -fl 'aof mesh'" prints nothing

    Scenario: E7 · a declaration's Stop at its last rung takes its children too
      Given a supervised "work loop" declaration whose loop has a "claude" child running
      When its Stop reaches the tree-kill rung
      Then neither the loop nor that child appears in "pgrep -fl 'aof work loop'" or "ps -g <its pgid>"

  Rule: R2 · A terminate request, and the OS's own quit, are a Quit

    Scenario: E4 · SIGTERM to the app is a Quit
      When "kill -TERM <app pid>" is sent
      Then the app exits with status 0
      And within 10 s "pgrep -fl 'aof mesh'" prints nothing

    Scenario: E5 · logging out is not held up, and leaves nothing behind
      When the operator logs out
      Then macOS does not report that "aof mesh" cancelled or delayed the logout
      And after logging back in, "pgrep -fl 'aof mesh'" shows no process started before the logout

    Scenario: a quit Apple Event is a Quit
      When "osascript -e 'quit app id \"com.aof.mesh.desktop\"'" runs
      Then the app exits, and within 10 s "pgrep -fl 'aof mesh'" prints nothing
      And the story's Notes record which RunEvent and code the quit arrived as

  Rule: R3 · Closing the window still only hides it

    Scenario: E6 · the window's ✕ hides it and the daemons keep running
      Given the window is open
      When its "✕" is clicked
      Then the window hides and the menu-bar icon stays
      And "pgrep -fl 'aof mesh'" still shows "mesh serve --serve" and "mesh ui"
