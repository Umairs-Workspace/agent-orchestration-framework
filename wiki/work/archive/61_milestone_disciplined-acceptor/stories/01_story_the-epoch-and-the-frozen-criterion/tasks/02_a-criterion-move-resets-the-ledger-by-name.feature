@executable @cli @work @validate
Feature: Evidence gathered under a criterion that has since moved counts for nothing

  This is the layer that does the actual work, and it is arithmetic rather than permission. Every
  ruling records the criterion it was rendered under, and the evidence toward a proposal is the
  unbroken run of the most recent rulings sharing the criterion now in force. A criterion that moves
  therefore resets the count by construction: there is no path that adds a ruling rendered under a
  different one, so evidence straddling the change is not merely refused, it cannot be expressed.

  That is what makes it hold against an editor, a script, a merge and a bypassed guard alike — it does
  not depend on anything having observed the write. A reset that is a separate act somebody has to
  remember to perform is not a reset; here it is the definition of the sum.

  The half that is easy to lose is the reporting. When a criterion moves, the surface must say WHICH
  part moved, because "the count went to zero" and "the count is zero because nothing has happened
  yet" are the same number with opposite meanings. And when it did not move, the record must say so:
  an unchanged criterion that is assumed rather than stated renders identically to one nobody checked.

  ADR-005 §1, §4. ADR-006 §1. FF-6105.

  Scenario Outline: only the unbroken run of rulings sharing the criterion in force is counted
    Given a ledger holding <ledger>, oldest first
    When the evidence toward a proposal is counted
    Then <counted> of them count

    Examples: a ledger straddling a change totals its suffix and nothing earlier
      | ledger                                                               | counted |
      | five rulings under the criterion in force                            | five    |
      | five rulings under a criterion that has since moved                  | none    |
      | five under a superseded criterion, then one under the one in force   | one     |
      | three under the one in force, then two superseded, then one under it | one     |
      | no rulings at all                                                    | none    |

  Scenario: the superseded rulings stay in the ledger, they just stop counting
    Given a ledger whose earlier rulings were rendered under a criterion that has since moved
    When the ledger is read
    Then those rulings are still present
    And none of them contributes to the evidence toward a proposal

  Scenario Outline: how the criterion came to move makes no difference to the reset
    Given a ledger accruing under a criterion
    When the criterion is changed <route>
    Then the evidence toward a proposal is reset
    And no total spans the change

    Examples: the reset does not depend on the change having been observed
      | route                                |
      | by hand in an editor                 |
      | by a script writing the record       |
      | by a merge bringing it in            |
      | with every guard over it bypassed    |

  Scenario: the surface says which part of the criterion moved
    Given a ledger whose accrual was reset by a criterion move
    When the accrual is reported
    Then it reports the count as reset rather than as never having started
    And it names the part of the criterion that moved

  Scenario: an unchanged criterion is reported as unchanged rather than assumed
    Given a ledger accruing under a criterion that has not moved
    When the accrual is reported
    Then it states that the criterion is unchanged
    And it states that the count was carried forward

  Scenario: every report of accrued evidence answers the question either way
    Given any report of evidence accrued toward a proposal
    When it is read
    Then it says whether the criterion moved since the oldest ruling it counted
    And that answer is present whether or not it moved

  Scenario: a knob whose value changed under an accruing ledger is reported by name
    Given a ledger accruing on a knob whose value then changes outside the acceptor
    When the accrual is reported
    Then the knob is named
    And the change is reported rather than absorbed into the accrual
