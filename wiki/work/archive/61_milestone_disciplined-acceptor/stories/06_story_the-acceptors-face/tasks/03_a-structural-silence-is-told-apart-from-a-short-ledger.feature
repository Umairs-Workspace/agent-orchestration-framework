@executable @cli @work @validate
Feature: A machine that will never fire reads differently from a machine that is still counting

  Two silences look identical from outside and mean opposite things. "Four rulings, threshold eight"
  is the machinery working: evidence is accruing and the answer will change. "This knob yields under
  one discordant pair per epoch; the floor is eight epochs away" is the machinery telling you it will
  never fire as configured. If those render as the same sentence, an operator watching a discipline
  and an operator watching an off switch see the same screen — and an off switch that blocks real
  improvements is routed around, which is the failure this whole arc exists to prevent.

  There is a second silence of the same species, one proposal down rather than one knob down. A
  proposal that has lost pairs is not killed by the loss, but it can be killed by arithmetic: once no
  record reachable inside the remaining budget would cross, nothing that happens next can commit it.
  Reporting that as a short ledger would be the machine lying about its own evidence — it would show a
  distance to a threshold that cannot be travelled. It is reported under its own name instead, with
  the record that would have crossed and the budget that ran out.

  Both readings are only trustworthy because their distances are computed. A fixed phrase about a knob
  being slow, or a proposal being unlikely, is an opinion; "at this knob's observed yield the floor is
  eight epochs away" and "this record needs eleven wins against two losses, at thirteen pairs, and
  four remain" are numbers derived from the ledger and the crossing arithmetic that move when the
  inputs move.

  The exclusions run in the direction that matters: a knob merely short of evidence is never described
  as structurally silent, and a proposal that has run out of budget is never described as merely short
  of evidence.

  ADR-010 §2, §2a. ADR-001 §1a, §3a. FF-6112.

  Scenario: a knob accruing toward its threshold reads as accruing
    Given a knob yielding several discordant pairs per epoch with four rulings against a threshold of eight
    When its line in the report is read
    Then it states that the ledger is short of the threshold
    And it states both the four and the eight
    And it does not state that the threshold is unreachable

  Scenario: a knob that cannot reach its threshold as configured reads as structurally silent
    Given a knob whose observed yield is under one discordant pair per epoch
    When its line in the report is read
    Then it states that the knob is yield-bound
    And it states the number of epochs the observed yield needs to reach the floor

  Scenario Outline: the two silences never render as the same sentence
    Given a knob yielding <yield> whose ledger holds <rulings> rulings toward a threshold of eight
    When its line in the report is read
    Then the reason it names is <reason>
    And the distance it states is measured in <distance>

    Examples: the machinery accruing, and the machinery declaring it cannot accrue
      | yield                     | rulings | reason         | distance                          |
      | three pairs per epoch     | 4       | evidence-short | rulings still needed              |
      | three pairs per epoch     | 0       | evidence-short | rulings still needed              |
      | one pair per epoch        | 1       | evidence-short | rulings still needed              |
      | under one pair per epoch  | 1       | yield-bound    | epochs at the observed yield      |
      | no pairs at all           | 0       | yield-bound    | unreachable at the observed yield |

  Scenario Outline: a proposal dead by arithmetic reads differently from one still able to cross
    Given a proposal whose record is <record> with <remaining> pairs left in its budget
    When its line in the report is read
    Then the reason it names is <reason>
    And it states <statement>

    Examples: the budget decides, and a loss alone never does
      | record | remaining | reason           | statement                                            |
      | 4-0    | 7         | evidence-short   | the record that would cross next and where it falls  |
      | 7-1    | 3         | evidence-short   | the record that would cross next and where it falls  |
      | 9-1    | 1         | evidence-short   | the record that would cross next and where it falls  |
      | 5-2    | 4         | budget-exhausted | the record that would have crossed and the budget    |
      | 8-2    | 1         | budget-exhausted | the record that would have crossed and the budget    |

  Scenario: a proposal out of budget is never reported as merely short of evidence
    Given a proposal that can reach no crossing record inside its remaining budget
    When its line in the report is read
    Then it is not described as accruing toward the threshold
    And no distance is offered that the remaining budget cannot cover

  Scenario: the crossing record follows the losses rather than a fixed number
    Given two proposals out of budget with different numbers of losses
    When both lines are read
    Then each names the crossing record its own losses required
    And the two records differ

  Scenario: the distance is computed from the observed yield rather than asserted
    Given two yield-bound knobs whose observed yields differ
    When both lines are read
    Then each states the epochs its own yield needs
    And the two numbers differ

  Scenario: the distance moves when the yield moves, with nothing edited
    Given a yield-bound knob reporting a distance in epochs
    When its observed yield rises and the report is produced again
    Then the distance it states is smaller
    And no message was edited to make that happen

  Scenario: a knob merely short of evidence is never called structurally silent
    Given a knob yielding at least one discordant pair per epoch with fewer rulings than the threshold
    When its line in the report is read
    Then it is not described as yield-bound

  Scenario: a knob that becomes reachable stops reading as structurally silent
    Given a knob reported as yield-bound
    When its observed yield rises above one discordant pair per epoch
    And the report is produced again
    Then it is no longer described as yield-bound
    And it is described as accruing toward its threshold

  Scenario: an acceptor that cannot fire at all says so
    Given a work stream in which every admitted knob is yield-bound
    When the report is read
    Then it states that no knob can reach the threshold as currently configured
    And it names each knob with the epochs its own yield would need
