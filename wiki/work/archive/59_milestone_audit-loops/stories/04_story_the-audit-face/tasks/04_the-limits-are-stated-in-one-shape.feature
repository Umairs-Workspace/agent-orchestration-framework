@executable @cli @work @validate @bug @finding-D-59-3
Feature: Every limit the audit declares is stated in the face, in one shape across all lanes

  A lane's LIMIT is the sentence that says what this run could not see. 59/01's own review promoted it
  from "quoted into findings" to "declared on every result", on the reasoning that a limit quoted only
  into findings says nothing in exactly the case a reader most needs it — a CLEAN lane.

  Found at `aof:verify 59` (VERIFICATION.md finding D-59-3). The face does not honour that. The census
  lane's limits are keyed `sweep` / `basis` / `claim` / `limit` / `authority` (59/01) and the evidence
  lane's `question` / `answeredBy` / `consequence` (59/02); the human renderer reads the second shape,
  so a bare `aof work audit` prints:

      limit (instrument-census): undefined — undefined
      limit (instrument-census): undefined — undefined

  Both lines are the census's, and one of them is `spreadClaimLimit()` — the disclosure that this
  milestone's text-level registration claim has two shapes that de-arm a suite while satisfying it.
  The `--json` envelope carries both shapes in full, so the information exists and only the operator's
  default face loses it.

  This is FF-5908's ruling one field over. That control made the READ record ONE shape across all three
  lanes, keyed `sweep`, on the reasoning that no lane's record may be substitutable-looking and
  unsubstitutable. The LIMIT record was left with two spellings, and the renderer picked one.

  ADR-004 §1, §1a. FF-5908.

  Scenario: every limit a lane declares is rendered with its own text
    Given an audit whose lanes each declare at least one limit
    When the human report is rendered
    Then each declared limit appears as a line naming the lane it belongs to
    And no rendered limit line contains "undefined"

  Scenario: the two faces carry the same limits
    Given an audit run whose lanes declare limits
    When both the human and the machine-readable faces are produced
    Then every limit in the machine-readable face is present in the human one
    And no limit is present in the human face that the machine-readable one omits

  Scenario: a limit is stated on a lane that found nothing
    Given a lane that read its population and produced no finding
    When the report is rendered
    Then that lane's limit is still stated
    And the statement carries the text the lane declared rather than an empty rendering

  Scenario: a lane whose limit cannot be rendered is refused rather than rendered blank
    Given a lane declaring a limit that does not carry the keys the face renders
    When the report is assembled
    Then the run is refused, naming the lane and the keys its limit is missing
    And no report is produced that renders that limit as an absent value
