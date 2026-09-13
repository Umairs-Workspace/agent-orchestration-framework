@executable @cli @work @work-stream
Feature: The record answers, six months later, why the harness is the way it is

  Half of reversibility is already free: the configuration, the frozen set and every loop record are
  tracked, so undoing a harness change is one command. What is missing is the *why*, attached to it.
  This task is that half — a record that makes a revert a decision an operator can take from the page
  in front of them rather than an archaeology exercise across a year of run records.

  Twelve things have to be on it, and the honest test of the set is a reader who was not there: which
  value, what it held before, what it became, in which epoch, against which rule, on what evidence in
  what order, how decisive that evidence was, whether anything got worse while it got better, when it
  may be reverted, who rendered it, what was decided, and — for the overwhelmingly common case where
  nothing moved — what refused it.

  The distinction worth arguing about is what happens when one of the twelve is not available. The
  record is refused rather than written with the field left blank, because a blank is not read as
  "unknown" six months later; it is read as a measurement. A missing counter-metric reading rendered
  as an empty field says nothing got worse, which is the single most expensive lie this ledger could
  tell. A zero that was measured is a reading and lands; an absence is a refusal.

  ADR-006 §2, §3. ADR-010 §4. FF-6108.

  Scenario: the complete record needs no other source to be understood
    Given a ruling recorded some milestones ago
    When an operator reads that record alone
    Then it names the harness value ruled on, what it held before and what it became
    And it names the epoch, the rule in force, the evidence in order and how decisive it was
    And it names the counter-metric reading, when the change may be reverted and who rendered it
    And nothing about the decision has to be reconstructed from elsewhere

  Scenario Outline: a record missing any one of its fields is refused rather than written blank
    Given a ruling whose record omits <field>
    When the record is offered to the ledger
    Then it is refused, naming <field>
    And nothing is appended
    And no record lands that answers "<question>" with a blank

    Examples: the twelve fields, each paired with the question a blank would silently answer wrong
      | field                               | question                                          |
      | the harness value it ruled on       | which knob was this about                         |
      | the value held before               | what would a revert restore                       |
      | the value ruled for                 | what did it become                                |
      | the epoch it was rendered in        | when, in the system's own boundaries              |
      | the rule in force                   | against which criterion, unchanged since when     |
      | the evidence in the order it came   | on what, and did the order flatter it             |
      | how decisive the evidence was       | was this close or was it settled                  |
      | the counter-metric reading          | did anything get worse while this got better      |
      | when it may be reverted             | is it too soon to undo this                       |
      | who rendered it                     | whom do I ask about it                            |
      | the verdict                         | what was actually decided                         |
      | the refusals that applied           | why it was not taken                              |

  Scenario Outline: a measurement of zero is a reading; an absent measurement is a refusal
    Given a ruling whose record carries <carried>
    When the record is offered to the ledger
    Then it is <outcome>

    Examples: emptiness that was measured, against emptiness that was never measured
      | carried                                          | outcome  |
      | a counter-metric reading of zero                 | appended |
      | no counter-metric reading at all                 | refused  |
      | an evidence sequence that is empty so far        | appended |
      | no evidence sequence at all                      | refused  |
      | an empty list of refusals on a committing ruling | appended |
      | no list of refusals at all                       | refused  |

  Scenario: the evidence keeps the order it arrived in
    Given a ruling whose evidence arrived in a particular order
    When the record is read back
    Then the sequence is the one that arrived
    And it has not been sorted, grouped or reduced to totals
    And the same outcomes in a different order read as a different record

  Scenario: a record that becomes incomplete on the way in is still refused
    Given a record that was complete when rendered and lost a field before it landed
    When it is offered to the ledger
    Then it is refused
    And nothing is appended

  Scenario: an operator can revert from the record alone
    Given a committing ruling whose record is in the ledger
    When an operator decides to undo it from what the record says
    Then the value to restore is named on the record
    And the change and its record come back together in one revert

  Scenario: an earlier record is never rewritten by a later one
    Given a ledger holding a ruling on a harness value
    When a later ruling on the same value is recorded
    Then the earlier record is byte-identical to how it was written
    And both are readable, oldest first
