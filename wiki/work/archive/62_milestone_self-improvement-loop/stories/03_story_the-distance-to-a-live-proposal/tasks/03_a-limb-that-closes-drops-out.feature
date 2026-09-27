@executable @cli @work @validate
Feature: Closing a limb removes it from the report, so the ratchet points at fixing the tree

  A limb is reported because a measurement found it standing — the consumer limb from the grounds the
  acceptor's report carries, the attribution limb from the corpus. The consequence a reader is entitled
  to is the obvious one: do the work the limb names, and the limb goes. Give one admitted knob a value
  that reaches a decision and the next report names one knob fewer; give every one of them a consumer
  and the limb leaves entirely. Populate the session id the attribution join needs and the same thing
  happens to the other limb.

  What this prevents is a ratchet pointing the wrong way. A limb carried as a standing fact keeps
  reporting after the fact stops being true, and it does two kinds of damage: the operator who did the
  work sees no change, and the surface freezes this repository's current defect into a permanent
  feature of its own report. The measurement in the previous criterion is only worth taking if the
  answer is allowed to come back different, and this is where that is contracted.

  The guard runs on the other side too. A report that could show an empty limb set would pass this
  criterion trivially and say nothing, which is the vacuous control this milestone was sequenced to
  avoid being. Over this repository as it stands the set is non-empty today, and a run that found no
  limb at all must be distinguishable from a run that measured nothing.

  Shrink-only is the shape of the whole thing: an input improving never enlarges the reported set, and
  a limb that closes never comes back wearing a different name.

  ADR-001 §2a, §3, §4. ADR-012 §5, §6. ADR-013 §4. FF-6206.

  Scenario Outline: the consumer limb shrinks as knobs gain consumers, and goes when none is left
    Given an acceptor report whose grounds show <consumed> of the admitted knobs with a value reaching a decision
    When the reported limbs are read
    Then the decision-site-consumer limb is <presence>
    And the knobs it names are <named>

    Examples: driven from the report, so the answer changes when the tree behind it does
      | consumed          | presence     | named                                                     |
      | none of the three | reported     | all three                                                 |
      | one of the three  | reported     | the other two                                             |
      | two of the three  | reported     | the remaining one                                         |
      | all three         | not reported | none — it leaves the set rather than appearing as cleared |

  Scenario Outline: the attribution limb goes when the join can be made
    Given a corpus in which <attribution>
    When the reported limbs are read
    Then the run-attribution limb is <presence>
    And what it states about the corpus is <statement>

    Examples: the limb stands exactly while the rounds counter cannot answer with a number
      | attribution                                                         | presence     | statement                                          |
      | no record carries a session id                                      | reported     | every record examined, and none of them attributed |
      | some records carry one, and no item has all of its runs attributed  | reported     | the records still carrying none, counted           |
      | some records carry one, and one item has all of its runs attributed | not reported | nothing — the join can now be made                 |
      | every record carries one                                            | not reported | nothing — the join can now be made                 |

  Scenario: a knob that gains a consumer between two runs drops out, with nothing edited
    Given the consumer limb naming three knobs
    When a later acceptor report shows one of those knobs with a value reaching a decision
    And the limbs are read again
    Then the limb names two knobs
    And the knob that gained the consumer is not among them
    And no sentence was edited to make that happen

  Scenario: closing one limb leaves the other exactly as it was
    Given both limbs reported
    When a later acceptor report shows every admitted knob with a value reaching a decision
    And the limbs are read again
    Then the consumer limb is gone
    And the run-attribution limb is still reported, with the same reading as before

  Scenario: an input that improves never enlarges the reported set
    Given the reported limb set over one acceptor report and one corpus
    When a later report shows a knob with a consumer, or a record gains a session id
    And the limbs are read again
    Then every limb reported is one that was reported before
    And no limb appears that was not there before

  Scenario: a limb that closes does not return under another name
    Given both limbs closed
    When the distance for a tunable proposal is read
    Then neither closed limb is restated as anything else
    And what remains is the acceptor's own refusals, if any

  Scenario: the reported set is non-empty over the repository as it stands
    Given an acceptor report and a corpus over the repository as it stands
    When the limbs are read
    Then at least one limb is reported
    And the limbs reported carry the readings they were measured from

  Scenario: a run that found no limb is told apart from a run that measured nothing
    Given a reading over an acceptor report and a corpus in which both limbs are closed
    And a reading in which neither limb could be measured
    When both are read
    Then the first states that both limbs were measured and neither stands
    And the second states that nothing was measured
    And the second is not stated as nothing standing in the way
