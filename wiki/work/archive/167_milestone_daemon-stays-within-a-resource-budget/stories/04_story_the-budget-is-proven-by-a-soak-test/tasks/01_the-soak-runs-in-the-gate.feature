@executable @cli @work @distribution
Feature: The soak runs in the regression gate without touching the live node

  WHY. A budget test that only runs by hand stops being run. The soak is registered like any other
  suite, so `yarn test:sharded` runs it on every pull request. Because the gate also runs on the
  control node, the soak must never bind the live daemons' ports, write to the real global home,
  or leave a daemon behind.

  Rule: R3 · The soak runs in the regression gate without touching the live node

    Scenario: E6 · the soak passes while the live daemons hold the fleet and control ports
      Given processes are listening on ports 4181 and 4182
      When the soak suite runs
      Then neither daemon it starts binds port 4181 or 4182
      And the suite passes

    Scenario: E7 · the soak leaves the real global home and the process table as it found them
      Given a snapshot of the real global home's files and their contents
      When the soak suite runs, pass or fail
      Then the real global home is byte-unchanged
      And no daemon process the soak started is still running

    Scenario: the gate's plan carries the soak as one registered unit
      When the sharded gate's plan is printed
      Then it includes "test/mesh/budget/daemon-budget-soak.test.mjs"
      And no registered case maps to no file
