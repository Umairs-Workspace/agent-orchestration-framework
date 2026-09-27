@manual @cli @work @work-stream
Feature: One staleness constant, and the gate that has been half-blind gets its second eye

  Three places in this repo already answer "how long is too quiet" with fifteen minutes: the
  assignment reclaim's run-heartbeat threshold, the driver's undeclared-completion idle window, and
  the loop shell's own default. They agree today by coincidence of authorship, not by construction.
  A fourth copy introduced by this milestone would be the same defect it exists to remove, one
  level down — a bound right at one door and silently wrong at the next.

  The second half matters more than the first. `dualStalenessDecision` ANDs node presence with the
  linked run's heartbeat, and it was built that way on purpose: a fresh node with a quiet run is
  the worker being alive while the run is merely silent. But `heartbeatAt` has always been null, so
  the run half of that AND has been reading `updatedAt` — a field that only moves on a state
  transition. The gate has been running on one signal since it was written. This story is the first
  time it gets the second.

  This is @manual because the property is a whole-system agreement across four modules and a
  daemon tick, judged by reading the resolved values at one moment, not by a unit assertion that
  would simply restate the constant it is checking.

  ADR-002, ADR-003. FF-6903.

  Scenario: every consumer resolves the same staleness value
    Given a workspace with no staleness value declared
    When the reclaim threshold, the driver's idle window and the loop shell's default are each resolved
    Then all three answer with the same value
    And each of them reached it through the declared bound rather than its own literal

  Scenario: overriding the value moves every consumer together
    Given a workspace declaring a staleness value of its own
    When the same three consumers are resolved
    Then all three answer with the declared value

  Scenario: the dual-staleness gate reads a real heartbeat for the first time
    Given a live assignment whose linked run is stamping liveness
    When the gate is evaluated
    Then the run half of the decision reads the liveness stamp
    And it no longer falls back to the state-transition timestamp

  Scenario: a fresh node with a silent run is still hands-off
    Given an assignment whose node presence is fresh
    And whose linked run has been silent past the deadline
    When the gate is evaluated
    Then the assignment is not reclaimed
    And the reason recorded is that presence takes precedence
