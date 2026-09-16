@executable @cli @work @validate
Feature: Report-only is the answer by default, and running again never turns it into a commit

  Every measured harm in the prior art is a commit — a change applied on evidence that did not carry
  it. Report-only makes all of those zero, and it is the one answer that is correct at every sample
  size, including no evidence at all. So it is not a waiting room the machinery sits in until it has
  grown up; it is the steady state, and committing is the exception an operator asks for by name.

  A report-only answer is only honest if it shows its arithmetic, which is why both numbers travel
  together: what a commit needs, and the evidence standing against it today. "Report-only" on its own
  is indistinguishable from a command that does nothing; "report-only, four rulings against a
  threshold of eight" is a machine an operator can supervise.

  A proposal that has lost a pair is not dead, and the surface has to say so in numbers rather than in
  reassurance. Four quantities carry it: the record in wins and losses, the evidence attained against
  the level a commit needs, the next record that would cross and the pair count it falls at, and the
  pairs left in the budget. Every one is derived from the same crossing arithmetic the rule uses, so
  the face promises a recovery exactly when the rule could grant one — and none when it could not.

  The failure this task exists to prevent is a default that drifts. A command that reports today and
  commits once the evidence happens to cross has a commit path nobody chose, reached by waiting.
  Crossing changes what the report says about eligibility and changes nothing about what it does.

  ADR-010 §1, §2a, §3. ADR-001 §1a. FF-6112.

  Scenario: the default answer is report-only
    Given a work stream carrying proposals over several knobs
    When the acceptor is run with no options
    Then every proposal is reported rather than applied
    And no configuration value has changed

  Scenario: a proposal that has crossed still does not commit by default
    Given a proposal whose attained evidence has crossed the level a commit needs
    When the acceptor is run with no option asking it to commit
    Then the proposal is reported as eligible to commit
    And it has not been committed

  Scenario: eligibility reached on an earlier run does not commit on a later one
    Given a proposal already reported as eligible to commit
    When the acceptor is run again with no option asking it to commit
    Then it is reported as eligible again
    And no configuration value has changed

  Scenario Outline: both numbers are shown, whatever the state of the ledger
    Given a knob whose ledger holds <rulings> against a threshold of <threshold>
    When its line in the report is read
    Then it states both the evidence standing and the threshold
    And it states the distance between them

    Examples: a verdict without its arithmetic is a claim rather than a reading
      | rulings | threshold |
      | 0       | 8         |
      | 4       | 8         |
      | 7       | 8         |
      | 8       | 8         |

  Scenario: a knob with no evidence at all is reported rather than omitted
    Given a knob that has never produced a single ruling
    When the acceptor report is produced
    Then the knob appears with an evidence standing of none
    And its verdict is report-only

  Scenario Outline: what the face reports as eligible to commit
    Given a proposal whose record is <record> and whose attained evidence <standing>
    When its verdict is read
    Then it is reported as <eligibility>

    Examples: eligibility is one question — has the attained evidence crossed the level a commit needs
      | record   | standing              | eligibility  |
      | 8-0      | has crossed the level | eligible     |
      | 7-1      | is below the level    | not eligible |
      | 10-1     | has crossed the level | eligible     |
      | 5-2      | is below the level    | not eligible |
      | no pairs | is below the level    | not eligible |

  Scenario: a lost pair does not end a proposal
    Given a proposal that has lost a pair and still has budget left to cross in
    When its line in the report is read
    Then it is reported as live
    And it is not reported as failed

  Scenario: a live proposal that has lost a pair says what recovery would take
    Given a live proposal that has lost a pair
    When its line in the report is read
    Then it states its record as wins and losses
    And it states the evidence it has attained against the level a commit needs
    And it states the next record that would cross and the pair count it falls at
    And it states how many pairs remain in its budget

  Scenario Outline: the next crossing is computed for the record in hand
    Given a proposal whose record is <record>
    When its line in the report is read
    Then the next record it names as crossing is <crossing>, falling at <pairs> pairs

    Examples: a loss moves the crossing, so the crossing is derived rather than fixed
      | record | crossing | pairs |
      | 4-0    | 8-0      | 8     |
      | 7-1    | 10-1     | 11    |
      | 5-2    | 11-2     | 13    |

  Scenario: no recovery is promised that the remaining budget cannot reach
    Given a proposal whose next crossing record falls outside its remaining budget
    When its line in the report is read
    Then it does not state that the proposal can still cross
    And it names the record that would have crossed and the budget that ran out

  Scenario: committing is something the operator asks for
    Given a proposal reported as eligible to commit
    When the acceptor is asked explicitly to commit it
    Then the change is applied
    And the report says it was applied on request rather than by default

  Scenario: an explicit commit on an ineligible proposal is refused, with its reasons
    Given a proposal that is not eligible to commit
    When the acceptor is asked explicitly to commit it
    Then it is refused
    And the refusal names every reason the proposal is not eligible
    And no configuration value has changed

  Scenario: the report says committing takes a request
    Given any acceptor report
    When the standing of a report-only verdict is read
    Then it states that committing requires an explicit request
    And it does not state that the verdict becomes a commit once the evidence arrives
