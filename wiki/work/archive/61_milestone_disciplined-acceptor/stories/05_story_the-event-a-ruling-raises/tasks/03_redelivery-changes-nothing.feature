@executable @cli @work @work-stream
Feature: The same ruling delivered twice leaves one record

  Delivery here is at-least-once by design, not by accident: a process can stop between recording a
  fact and acting on it, and a fact can reach a second machine that has not yet acted on it. Every
  consequence in this family is written to tolerate arriving twice, and this one is no exception.

  What makes it worth its own task is what a second copy would mean *here*. The ledger is the evidence
  the acceptor weighs. A duplicated record is an extra ruling that never happened, and enough of them
  carry a proposal over a threshold that was set precisely so that noise could not. That is the same
  p-hack this whole milestone exists to prevent, arriving through the transport layer — the one door
  where nobody would think to look for it, because the arithmetic upstream is impeccable and the
  duplicate is not a bug in it.

  The rule is therefore identity, not resemblance. A record is deduplicated by the identity of the
  ruling that raised it, so a second delivery of one ruling changes nothing, while two genuinely
  separate rulings that happen to read identically are two rulings and both are kept. Getting that
  backwards in either direction is a defect: one loses evidence, the other manufactures it.

  ADR-007 §2. FF-6108.

  Scenario: a redelivered ruling does not append a second record
    Given a ruling already recorded in the ledger
    When the same ruling is delivered again
    Then the ledger still holds one record for it
    And the ledger is byte-identical to before the redelivery

  Scenario: redelivery cannot move the evidence
    Given an acceptor accruing evidence on a harness value
    When one of its rulings is delivered again
    Then the evidence it accrues is unchanged
    And no proposal moves closer to its threshold because of the redelivery

  Scenario Outline: at-least-once delivery, in the shapes it actually takes
    Given a ruling that arrived <arrival>
    When the ledger is read
    Then it holds <records>
    And the evidence accrued from it counts <evidence>

    Examples: every redelivery shape this transport produces, against the one that is genuinely new
      | arrival                                                      | records     | evidence    |
      | once                                                         | one record  | one ruling  |
      | twice in the same pass                                       | one record  | one ruling  |
      | again after the process stopped between recording and acting | one record  | one ruling  |
      | again from a second process working through the same fact    | one record  | one ruling  |
      | again much later, with other rulings recorded in between     | one record  | one ruling  |
      | as two separate rulings that happen to read identically      | two records | two rulings |

  Scenario: a second machine reproduces the line rather than adding one
    Given a ruling recorded on the machine that rendered it
    When another process works through the same ruling against the same ledger
    Then the line it would write is identical to the one already there
    And it does not append

  Scenario: the same identity carrying different contents is refused
    Given a ruling already recorded in the ledger
    When a ruling with the same identity but different contents is delivered
    Then it is refused as a conflict
    And the record already in the ledger is unchanged
    And neither version silently replaces the other

  Scenario: a redelivery is recognisable rather than inferred
    Given two records in the ledger
    When they are read
    Then each names the ruling that raised it
    And a reader can tell a redelivered ruling from a new one without comparing their contents

  Scenario: rulings that follow a redelivery are unaffected
    Given a ledger whose latest record was delivered twice
    When a further ruling is recorded
    Then it is appended after the existing records
    And the order of the ledger is the order the rulings were rendered in
