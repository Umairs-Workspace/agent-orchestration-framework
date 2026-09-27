@executable @cli @work @work-stream
Feature: L3 becomes a level the loop can actually run, and the lock is removed rather than narrowed

  The previous milestone declared this rung and locked it structurally, and wrote down the exact
  diff that would open it: widen the executable levels, empty the locked ones, and delete the leg of
  the guard that asserts no module carries an executing branch for it. That leg becomes necessarily
  false the moment L3 executes.

  Deleting it is the point. A control kept alive by narrowing its search until it passes again is
  the "green for the wrong reason" failure a whole milestone was spent measuring — four of five
  audited guards were passing that way. A guard whose subject has legitimately gone away is retired
  with the change that retires it, in the same diff, where a reviewer can see both halves.

  ADR-006. FF-5508.

  Scenario: L3 is an executable level
    Given a workspace that passes the gate
    When a loop is requested at L3
    Then the level is admitted

  Scenario: no level is locked any longer
    Given the ladder after this change
    When its locked levels are read
    Then there are none

  Scenario: the previously locked refusal no longer fires for a workspace that qualifies
    Given a workspace that passes the gate
    When a loop is requested at L3
    Then it is not refused as locked

  Scenario: the levels below L3 are unchanged
    Given a loop requested at each level below L3
    When each runs
    Then each behaves exactly as it did before

  Scenario: a report-only loop still writes nothing
    Given a fixture tree and a loop requested at the report-only level
    When it runs to completion
    Then every file in the tree is unchanged
    And no file has been added or removed

  Scenario: an unrecognised level is still refused by name
    Given a loop requested at a level that does not exist
    When it is requested
    Then it is refused
    And the refusal lists the levels that do exist
