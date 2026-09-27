@executable @cli @work @work-stream
Feature: The compiler is handed its facts, and reads nothing for itself

  The grade record already sets the pattern and states it about itself: the timestamp is injected,
  and the module reads no clock. The impure edge gathers what happened; a pure function turns it
  into a record. That is why the verdict rules are auditable at all — you can hand them an
  observation and read off the answer without a filesystem, a git checkout or a wall clock in the
  way.

  Provenance is the case where the temptation to break that is strongest, because every one of the
  four values is trivially fetchable inside the function that needs it. One call to read the node
  id, one to shell out for the commit, one to the clock — and the record becomes untestable and
  non-deterministic in the same afternoon.

  ADR-003. FF-5504.

  Scenario: the same observation compiles to the same record
    Given an observation carrying a node, a run, a commit and an instant
    When it is compiled twice
    Then the two records are identical

  Scenario: the compiler reads no clock
    Given an observation whose instant is supplied
    When it is compiled
    Then the recorded instant is the supplied one
    And no other instant appears in the record

  Scenario: the compiler asks nothing of the filesystem or of git
    Given an observation compiled in a directory with no repository and no workspace store
    When it is compiled
    Then it succeeds
    And the record carries exactly the values it was handed

  Scenario: the impure edge is what gathers
    Given a command recording a claim
    When it runs
    Then the node, run, commit and instant are gathered before the record is compiled

  Scenario: a gathering failure is reported, not swallowed into a default
    Given a workspace where the producing node cannot be determined
    When a claim is recorded
    Then the failure is reported by name
    And no record is written
