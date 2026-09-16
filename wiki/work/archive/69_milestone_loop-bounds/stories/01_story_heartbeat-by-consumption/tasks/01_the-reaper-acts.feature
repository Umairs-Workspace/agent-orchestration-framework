@executable @cli @work @work-stream
Feature: The reaper acts on silence — through the one reclaim edge, not a second copy of it

  A stamp nobody reads changes nothing. The consumer is the periodic scan that already runs every
  15 seconds on the control node and already calls the stale-assignment reclaim — it simply has
  never had a real liveness signal to read, because the producer was never wired.

  The reclaim edge itself is deliberately not rebuilt. "How a run is reclaimed" — the legal
  running→failed transition with a retryable infra reason and the reclaim stamp that distinguishes
  it from an operator-reported failure — had been written out twice, and m42 consolidated it into
  one home for exactly that reason. This story adds a caller.

  No vocabulary is invented either. `timeout` is already classified retryable ("no verdict in
  time"), and `timeout` and `stall` are already members of the exit vocabulary milestone 68 fixed
  *"precisely so that 69 has a stable thing to enforce against"*. This is the story that makes them
  reachable.

  ADR-003, ADR-004. FF-6903.

  Scenario: a run that has stopped producing tool results is reaped
    Given a running run whose last recorded liveness is older than the deadline
    When the scan runs
    Then that run is reclaimed
    And it is left retryable

  Scenario: a run inside the deadline is left byte-unchanged
    Given a running run whose last recorded liveness is inside the deadline
    When the scan runs
    Then the run is not touched
    And its record is byte-identical to before the scan

  Scenario Outline: which runs the scan considers at all
    Given a run in state <state>
    When the scan runs
    Then it is <treatment>

    Examples: only a live run can go stale
      | state     | treatment            |
      | running   | considered           |
      | queued    | left untouched       |
      | done      | left untouched       |
      | failed    | left untouched       |
      | cancelled | left untouched       |

  Scenario: the reclaim goes through the one edge, not a second copy
    Given a run about to be reclaimed for silence
    When the reclaim is applied
    Then it takes the same transition an orphan reclaim already takes
    And no parallel reclaim path exists for this cause

  Scenario: a reaped run is distinguishable from an operator-reported failure
    Given a run reclaimed for silence
    When its record is read
    Then it carries the reclaim stamp
    And its reason is one the retry classification already admits

  Scenario: the scan is failure-isolated
    Given a scan in which reading one run faults
    When the tick completes
    Then the other runs in scope are still evaluated
    And the fault is reported rather than crashing the daemon

  Scenario: a run whose supervisor died is still caught
    Given a running run with no live process supervising it
    And its liveness older than the deadline
    When the scan runs
    Then it is reclaimed
    And nothing about the reclaim depended on that supervisor being alive
