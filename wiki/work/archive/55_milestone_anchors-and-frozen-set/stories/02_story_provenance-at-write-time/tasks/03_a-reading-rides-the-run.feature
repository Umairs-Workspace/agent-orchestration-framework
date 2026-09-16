@executable @cli @work @work-stream
Feature: A reading is written where the work is committed, and never into the delivered registry

  There is one obviously wrong home for an anchor reading and it is the one that looks most natural:
  the registry directory the anchors themselves live in. That directory is delivered by the bundle
  from a single source, and a consumer's edit to it is drift-warned. A per-workspace reading written
  there survives exactly until the next update, and then either vanishes or starts producing a
  warning about a file the system itself wrote.

  Run records already sit inside the work item, are committed with the work, and are reviewed in the
  same diff as the change they describe — which is what the governance constraint asks of anything
  the loop records about itself. So the registry declares anchors, and the run record carries
  readings. No new store, no new directory, no second truth.

  ADR-003. FF-5504.

  Scenario: a reading is written with the work item it belongs to
    Given an anchor reading taken during a run against a work item
    When it is recorded
    Then it is stored with that item's run records

  Scenario: nothing writes a reading into the delivered registry
    Given an anchor reading
    When it is recorded
    Then no file under the registry directory is created or modified

  Scenario: updating the bundle does not disturb a recorded reading
    Given a workspace holding recorded anchor readings
    When the bundle is updated
    Then every recorded reading is unchanged
    And no drift warning is raised about them

  Scenario: a recorded reading carries its provenance
    Given a recorded anchor reading
    When it is read back
    Then it carries the producing node, run, commit and instant it was written with

  Scenario: readings accumulate rather than overwrite
    Given two readings of the same anchor taken at different instants
    When both are recorded
    Then both are readable
    And neither has replaced the other

  Scenario: no new store is introduced
    Given a workspace after readings have been recorded
    When its directories are compared with a workspace that has recorded none
    Then no directory exists in one that does not exist in the other
