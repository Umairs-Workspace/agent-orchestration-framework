@executable @cli @work @work-stream
Feature: Consecutive no-progress samples reset the attempt; repeated resets escalate

  A single no-progress sample is normal — an agent reading before it writes has touched nothing.
  Consecutive no-progress samples are the grind signature: `Build story 49/05` made 199 edits
  against 1 test run, one file edited 70 times, one command re-run 33 times, inside a 4h24m wall.

  The policy is Magentic-One's, with deterministic inputs: `maxStalls` consecutive no-progress
  samples end the attempt with a SUMMARY of what it did, and `maxResets` such resets escalate to a
  human rather than looping the reset. The summary matters — a reset that discards what was learned
  pays for the same rediscovery again, which is the cost this whole arc exists to remove.

  Both bounds resolve from the declared home rather than being literals here.

  ADR-001, ADR-005.

  Scenario: one no-progress sample is not a stall
    Given an attempt with a single no-progress sample
    When the policy is evaluated
    Then the attempt continues

  Scenario: consecutive no-progress samples reaching the stall bound reset the attempt
    Given an attempt whose consecutive no-progress samples reach the stall bound
    When the policy is evaluated
    Then the attempt is reset
    And the reset carries a summary of what the attempt did

  Scenario: progress clears the accumulated stalls
    Given an attempt one sample below the stall bound
    When a sample showing progress is taken
    Then the accumulated stall count returns to zero
    And the attempt continues

  Scenario: resets reaching the reset bound escalate instead of resetting again
    Given an attempt whose resets reach the reset bound
    When the policy is evaluated
    Then it escalates for a human
    And no further reset is performed

  Scenario Outline: the policy over a run of samples
    Given an attempt with <history>
    When the policy is evaluated
    Then the action is <action>

    Examples: at a stall bound of two and a reset bound of two
      | history                                      | action     |
      | one no-progress sample                       | continue   |
      | two consecutive no-progress samples          | reset      |
      | no-progress, progress, no-progress           | continue   |
      | two resets already taken, stall bound reached| escalate   |

  Scenario: the bounds are read from the declared home
    Given a workspace declaring stall and reset bounds of its own
    When the policy is evaluated
    Then the declared values are what bound it
    And neither number exists as a literal in the policy

  Scenario: an escalation preserves the attempt's work
    Given an attempt that has escalated
    When its lane is inspected
    Then the worktree is still present
    And the samples that justified the escalation are readable
