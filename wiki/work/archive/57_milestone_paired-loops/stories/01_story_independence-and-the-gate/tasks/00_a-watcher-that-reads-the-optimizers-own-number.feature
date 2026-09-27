@executable @cli @work @validate
Feature: A watcher reading the same artifact the optimizer optimises is reporting the optimizer's own number

  The cheapest way to satisfy a pairing requirement without being watched is to appoint a watcher
  that measures the same thing you do. The edge is there, the check that only looks for an edge is
  satisfied, and the number that comes back is the number the optimizer was already producing.

  Independence has to mean reading a different artifact, and that is checkable from the records
  alone: both a loop and a watcher declare a measurement, in the same field, with the same pointer
  vocabulary — deliberately, so the comparison is exact rather than approximate. Where the two sets
  intersect, the watcher is looking through the optimizer's eyes and the check says so by name.

  ADR-002. FF-5702.

  Scenario: a watcher whose measurement overlaps the loop it watches is named
    Given a loop and a watcher whose measurement pointers share an entry
    When the checks are run
    Then the shared-measurement finding names the watcher
    And it names the loop being watched

  Scenario: a watcher reading a different artifact is not flagged
    Given a loop and a watcher whose measurement pointers are disjoint
    When the checks are run
    Then no shared-measurement finding is raised

  Scenario: a single overlapping entry is enough to fire
    Given a watcher declaring several measurement pointers of which exactly one is also the loop's
    When the checks are run
    Then the shared-measurement finding is raised

  Scenario: duplicate pointer declarations do not duplicate the finding
    Given a loop and watcher that each repeat the same shared measurement pointer
    When the checks are run
    Then exactly one shared-measurement finding is raised for that watcher and loop

  Scenario: the overlap is judged per watched loop
    Given a watcher watching two loops whose measurement it shares with only one
    When the checks are run
    Then exactly one shared-measurement finding is raised
    And it names the loop whose measurement it shares

  Scenario: the finding is separate from the unpaired-optimizer finding
    Given a loop watched only by a watcher that shares its measurement
    When the checks are run
    Then the shared-measurement finding is raised
    And no unpaired-optimizer finding is raised for that loop

  Scenario: the check reads only the parsed records
    Given a registry whose measurement pointers name files that do not exist
    When the checks are run
    Then the shared-measurement answer is unchanged
    And nothing on disk is read to produce it
