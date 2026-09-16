@executable @cli @work @work-stream
Feature: Stamped once at settle — and a missing transcript leaves `null`, never a fabricated zero

  ADR-004's rule is that `costUsd` is written once and never recomputed. This task makes the write
  side of that observable: spend is ingested as the run settles, while the evidence is still there,
  and a later read returns what was stamped rather than re-deriving it from a corpus that may since
  have been overwritten — which is exactly the failure story 68/05 exists to stop one layer up.

  **The degrade path is the substance of this task, not its edge case.** aof's transcripts are
  written by another system, on a machine that may not be this one, into a directory that may not
  exist. A run can settle with no readable transcript for entirely ordinary reasons. When it does,
  `spend` stays `null` — *not measured* — and is never fabricated as a zero. Task 68/00/00 makes
  `null` and `0` different answers; this task is where that difference is earned, because the
  cheapest wrong thing to do here is write zeros and produce a report that adds up.

  The same posture runs through the milestone: ADR-006 reports an unattributable run as
  unattributed, ADR-002 reports a run with no declared phase as having none. Report the absence,
  never infer a value.

  Ingest never blocks a settle. A run's state, outcome and retry lineage are decided by what the
  run did, not by whether its numbers could be read.

  ADR-004; ADR-001; ADR-008 (ingest records what happened; it bounds nothing).

  Scenario: spend is stamped as the run settles
    Given a run whose session has a readable transcript
    When the run settles
    Then the record carries a complete spend envelope
    And it was written as part of settling, not on a later read

  Scenario: a later read returns what was stamped
    Given a settled run carrying a stamped spend envelope
    When the record is read again
    Then the envelope is returned verbatim
    And no transcript is re-read to produce it

  Scenario Outline: a run whose numbers cannot be read stays honest
    Given a run settling with <situation>
    When the run settles
    Then the run settles successfully with its own state and outcome
    And `spend` reads `null`
    And no zero-valued envelope is written

    Examples: ordinary reasons a transcript is unavailable
      | situation                                                |
      | no session id recorded on the run                        |
      | a session id that matches no transcript on this machine  |
      | a transcript directory that does not exist               |
      | a transcript that cannot be parsed                       |
      | a transcript that reports no usage at all                |

  Scenario: ingest failure never changes what the run did
    Given a run that completed successfully
    And a transcript that cannot be read
    When the run settles
    Then the run's outcome is unchanged
    And its state, attempt and retry lineage are unchanged
    And the failure to ingest is reported rather than swallowed silently

  Scenario: settling a second time does not re-stamp
    Given a run already settled with a stamped spend envelope
    When settling is attempted again
    Then the stored envelope is unchanged
    And no second envelope is written
