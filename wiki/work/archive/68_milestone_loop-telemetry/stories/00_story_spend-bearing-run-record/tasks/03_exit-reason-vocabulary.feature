@executable @cli @work @work-stream
Feature: `exitReason` — a closed vocabulary that records how a run ended, and decides nothing

  Today a run record says whether it finished (`outcome`) and, on failure, why
  (`failureReason`) — but nothing distinguishes a run that produced its final answer from one that
  was cut off, and nothing will distinguish a run stopped by a bound from one that stopped itself.
  The evidence shows the difference is where the money is: runs 47/01 and 47/02 each burned
  **11h07m before failing**, then succeeded in **15.9 minutes** on retry
  (`RESEARCH-agent-loop-economics.md` §2.3).

  `exitReason` records that distinction at settle, from what already happened.

  **ADR-008 binds this task harder than any other in the milestone.** The vocabulary is fixed HERE
  so that milestone 69 has a stable thing to enforce against — but 68 introduces no bound, no
  timeout, no budget and no kill, and **nothing in this milestone branches on the value**. Several
  members of the vocabulary are therefore **unreachable until 69 lands**; that is expected, is
  stated in the ADR, and is not a defect. A reviewer should refuse any scenario here that asks the
  loop to *act* on an exit reason.

  Consequently the scenarios below assert what is RECORDED, never what is DONE about it.

  ADR-008; ADR-001 (the envelope this key belongs to).

  Scenario: a run that produced its final answer records that it did
    Given a run that completes normally and produces its final output
    When the run is settled
    Then `exitReason` reads `final_output`
    And the run's `outcome` is unchanged by the presence of the reason

  Scenario: the vocabulary is closed
    Given a run being settled
    When the settle is attempted with an exit reason outside the declared vocabulary
    Then the settle is refused with a typed error
    And the record's `spend` is left exactly as it was

  Scenario: an exit reason changes nothing about how the run is treated
    Given two runs identical but for their recorded exit reason
    When each is read back
    Then each reports its own `exitReason`
    And neither run's state, outcome, attempt or retry lineage differs because of it
    And no retry, kill or bound is triggered by either value

  Scenario Outline: the declared vocabulary, and what each member records
    Given a run that ended <how>
    When the run is settled
    Then `exitReason` reads <reason>
    And the value is recorded without any action being taken on it

    Examples: reachable in this milestone
      | how                                            | reason           |
      | by producing its final output                  | final_output     |
      | by being aborted before it could finish        | abort            |
      | by failing with an error                       | error            |

    Examples: declared for milestone 69, unreachable until its producer lands (ADR-008)
      | how                                            | reason           |
      | by exhausting a turn bound                     | max_turns        |
      | by exceeding a wall-clock deadline             | timeout          |
      | by making no progress within its attempt       | stall            |
      | by exceeding a cost ceiling                    | budget_exceeded  |
