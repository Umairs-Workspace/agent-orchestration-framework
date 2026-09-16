@executable @cli @work @work-stream
Feature: The control tick consults the counted set before it dispatches

  On the mesh side there is no bound at all. Every 15 seconds the control tick scans for `assigned`
  rows whose target is connected and dispatches each one. Nothing counts what that target is
  already running.

  The branch that fixes this already exists in the same loop. A row whose target is not connected
  is LEFT `assigned` — dispatched on a later tick, never a silent drop and never a loud error here.
  "Over the bound" is the same branch with a different predicate, and reusing it is what keeps a
  bounded tick from becoming a queue with its own lifecycle to get wrong.

  There is no lease table and this task introduces none. The m26 leasing machinery was deleted in
  m34's "global mesh only" correction; its tests are parked, unrunnable, under milestone 35's
  reference folder precisely so its SEMANTICS could be mined without its MECHANISM. A slot here is
  a count over assignment rows.

  The counted set excludes rows already coded as waiting on a human. That code is written today by
  the worker, so this contract is correct before its sibling story lands — the sibling makes the
  park real; this one makes it count.

  One inherited lesson must survive: the dispatch RESULT gates the once-guard. A send that reported
  itself unsent was never retried, and a real assignment sat stuck for 24h+ despite a healthy,
  connected worker. Bounding the tick must not reintroduce that.

  ADR-006, ADR-007. FF-6907, FF-6908.

  Scenario: a target at its bound receives no further dispatch this tick
    Given a target already running as many assignments as its bound allows
    And a further assigned row targeting it
    When the tick runs
    Then that row is not dispatched

  Scenario: a row held back stays assigned and dispatches later
    Given a row held back because its target was at the bound
    When a running assignment on that target completes
    And the next tick runs
    Then the held row is dispatched

  Scenario: a target below its bound is dispatched normally
    Given a target running fewer assignments than its bound allows
    And an assigned row targeting it
    When the tick runs
    Then that row is dispatched

  Scenario: a row waiting on a human does not occupy a slot
    Given a target whose running assignments include one coded as waiting on a human
    When the counted set for that target is computed
    Then the waiting assignment is not counted
    And a further row targeting it is dispatched

  Scenario Outline: what the counted set includes
    Given an assignment in state <state> with code <code>
    When the counted set is computed
    Then it is <treatment>

    Examples: a slot is held by work in flight, not by work in the table
      | state     | code        | treatment    |
      | running   | none        | counted      |
      | running   | needs-input | not counted  |
      | assigned  | none        | not counted  |
      | reclaimed | none        | not counted  |
      | done      | none        | not counted  |

  Scenario: a send that did not go out is retried on a later tick
    Given a row whose dispatch reports itself unsent
    When the next tick runs
    Then that row is dispatched again
    And the bound was consulted before each attempt

  Scenario: no lease store is opened
    Given every module involved in dispatching work
    When their persisted surfaces are inspected
    Then none of them opens a lease table or claim file
    And the slot is derived from the assignment rows that already exist

  Scenario: bounding the tick leaves the reclaim half untouched
    Given a tick whose dispatch half is bounded
    When the tick completes
    Then the stale-assignment reclaim ran exactly as before
    And a fault in either half still leaves the other to the next tick
