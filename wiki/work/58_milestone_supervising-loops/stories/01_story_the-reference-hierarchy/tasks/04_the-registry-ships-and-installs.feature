@executable @cli @assets @distribution
Feature: The records ship as assets and land in a project's own registry

  A record that exists only in the source tree is in nobody's registry. The validate run reads the
  copy installed under a project's own directory, so a hierarchy authored into the framework's
  sources and never registered as a shipped asset clears nothing — for any project, including this
  one. One milestone ago this was found the hard way, on records that shipped and never installed,
  which is why this task is not optional.

  Every record this story creates or edits is registered as a bundle asset, and the update verb
  writes the installed copy. Nobody types into the installed tree: the installed bytes equal the
  bytes the bundle ships, and that equality is the evidence the update wrote them.

  The restraint is that updating twice is the same as updating once. A project that has never seen
  these records receives them; a project that already has them sees them refreshed, not doubled, not
  reordered, not churned.

  ADR-006 §4, ADR-007 §4. FF-5806.

  Scenario: the new records are registered as shipped assets
    Given the shipped bundle
    When its loop assets are listed
    Then every record this story creates is among them, with the place it installs to

  Scenario: a project that has never seen them receives them on its first update
    Given a project whose registry predates this story
    When the work assets are updated
    Then its registry holds the new records alongside the ones it already had

  Scenario: a project that already has them sees them refreshed, not doubled
    Given a project whose registry already holds these records
    When the work assets are updated
    Then each record is present exactly once and carries the bytes the bundle ships

  Scenario: the installed registry is the one the validate run reads
    Given a project with an installed registry
    When the validate run completes
    Then it reports on the records installed in that project, not on the framework's sources

  Scenario: the installed registry is the one that reports the cleared findings
    Given a project that has taken this story's update
    When the validate run completes
    Then it reports no unowned-reference finding and no shared-actuator finding

  Scenario: the installed copies are written by the update, not typed
    Given the installed registry
    When each record this story ships is read
    Then it declares itself framework-owned, names the update as what installs it, and matches the shipped bytes

  Scenario: updating twice changes nothing the first update installed
    Given a project that has just taken this story's update
    When the work assets are updated again
    Then no installed record changes

  Scenario: the update adds nothing the bundle does not ship
    Given a project that has taken this story's update
    When its registry is listed
    Then it holds exactly the records the bundle ships and no duplicate of any of them

  Scenario Outline: every record this story puts into a project's registry
    Given a project that has taken this story's update
    When <node> is read from that project's registry
    Then it is present, it was <change> by this story, and it matches the record the bundle ships

    Examples: ten records — two this story creates and eight it edits — reaching a project by one path, taking the registry from fourteen records to sixteen with none dropped
      | node                                | change  |
      | anchor:run-lifecycle-policy         | created |
      | arbiter:speed-thoroughness-autonomy | created |
      | actor:operator                      | edited  |
      | loop:autonomous-cascade             | edited  |
      | loop:build-to-green                 | edited  |
      | loop:review-fix-rereview            | edited  |
      | loop:run-resilience                 | edited  |
      | loop:mesh-assignment-reclaim        | edited  |
      | loop:retrospective-memory-ingest    | edited  |
      | loop:verify-triage-accept           | edited  |
