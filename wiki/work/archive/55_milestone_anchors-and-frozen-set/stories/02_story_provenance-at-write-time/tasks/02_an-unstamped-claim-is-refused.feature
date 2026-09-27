@executable @cli @work @work-stream
Feature: An unstamped claim is refused, and is never completed by guesswork

  This is the half of the rule that gives the other half its value. A stamp the writer will invent
  when it is missing is not evidence — it is decoration shaped like evidence, which is worse than an
  unstamped record, because an unstamped record is honestly unusable and an invented one is
  confidently wrong.

  The temptation has a specific shape and it is worth naming so that the guard has something to
  guard. Transcripts exist on disk. Directory mtimes exist. A plausible producing node can be
  inferred from either. The milestone's objective calls this out by name as guesswork, and the
  reason is that the inference is unfalsifiable: nothing downstream can tell a reconstructed
  provenance from a recorded one, so a single back-fill quietly converts the whole envelope from
  evidence into convention.

  ADR-003. FF-5504.

  Scenario: a claim offered without a complete stamp is refused
    Given a claim record missing its producing node
    When it is written
    Then the write is refused with a code
    And no record appears on disk

  Scenario: the refusal names what was missing
    Given a claim record missing its instant
    When it is written
    Then the refusal names the missing key

  Scenario: the writer does not complete a partial stamp
    Given a claim record carrying only some of the required provenance
    When it is written
    Then no missing value is supplied by the writer

  Scenario: provenance is never derived from a transcript or a file time
    Given a workspace holding session transcripts and previously written records
    When a claim is recorded without a supplied producing node
    Then the write is refused
    And nothing in the workspace is read to infer one

  Scenario: a refused write leaves the previous record untouched
    Given an existing stamped record and a subsequent unstamped write to the same subject
    When the second write is refused
    Then the existing record is unchanged
