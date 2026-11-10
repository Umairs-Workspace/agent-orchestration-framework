@manual @cli @work @distribution
Feature: The live desktop app syncs changes made while it was off

  WHY. Green tests over injected tickers do not prove the running system: the daemon the desktop
  app supervises is launched from a folder with no aof config, and that launch is exactly what made
  the old cwd-only publish a no-op. This is the milestone's outsider check, run on the control
  node against the real store after the payload is installed. The restart is the operator's act.

  Rule: R3 · A change made while the app was off lands when it starts

    Scenario: a hand edit and a pull made while the app is off appear in fleet after it starts
      Given the payload carrying this milestone is installed with "node scripts/install-local.mjs --skip-ui" and "aof --version" shows its build id
      And the operator has quit the desktop app from its own UI
      And a status is hand-edited in a record of the test-bed workspace "aof-test-repo"
      And a commit changing another record's status is pulled into "aof-test-repo"
      When the operator relaunches the app with "aof mesh desktop run"
      Then both daemons print "Build: payload <buildId>" with the installed build id
      And within one propagation tick both changes show in the fleet view at "http://127.0.0.1:4181/?mode=fleet"
      And the global store's rows for both refs carry the new statuses, authored by "node-7297"
      And "aof work doctor" in "aof-test-repo" raises no "sync-failing" or "sync-behind" finding
