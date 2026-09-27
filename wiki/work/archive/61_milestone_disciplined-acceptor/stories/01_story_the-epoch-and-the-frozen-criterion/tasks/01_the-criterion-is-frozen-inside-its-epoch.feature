@executable @cli @work @validate
Feature: The yardstick is refused mid-epoch, and the refusal says which part was touched

  The criterion is everything the acceptor scores by: the outcome being measured, the paired
  counter-metric that must not degrade while it improves, the confidence and the bet fraction and the
  pair count they give, the number of pairs a run may take before it is truncated, the set of knobs in
  play with their floors and ceilings and the price a trial may not exceed, and the frozen set itself.
  A criterion that can move mid-span makes every number after it uninterpretable — not wrong, worse:
  honest arithmetic over a ruler that changed length halfway.

  A warning would only produce a record that it happened. So each of these is REFUSED inside an open
  epoch, and the refusal names the part that was touched rather than saying that something was: a
  refusal an operator cannot act on gets bypassed, and a bypassed guard is the state this story exists
  to leave.

  The distinction worth arguing is that the confidence, the bet fraction, the pair count and the pair
  budget are ONE thing, not four — and they are one thing for TWO different reasons, both of which have
  to be carried. The pair count is a function of the other two, so a criterion that froze the count
  alone would let it drift by re-choosing the fraction: the guard would report as held while the bar
  moved. The pair budget is derived from nothing — it is a choice — and lengthening a run mid-flight
  to reach for a crossing it has not made is the same p-hack one axis over: optional stopping in the
  budget dimension rather than in the yardstick. All four move together at a boundary or not at all.

  The knob VALUES are deliberately not on this list, and that is not an oversight. Moving a knob is
  what a commit is; what the machinery owes is that the move ends the accrual running on it, not that
  it be forbidden.

  ADR-004 §4, §5, §6. ADR-001 §2. ADR-005 §2, §4. FF-6105.

  Scenario Outline: what may be revised, and when
    Given an epoch that is <moment>
    When <quantity> is revised
    Then the revision is <outcome>

    Examples: inside an open epoch every frozen part is refused
      | moment | quantity                                   | outcome |
      | open   | the trial metric                           | refused |
      | open   | the paired counter-metric                  | refused |
      | open   | alpha                                      | refused |
      | open   | lambda                                     | refused |
      | open   | the pair count N those two give            | refused |
      | open   | the pair budget B a run is truncated at    | refused |
      | open   | the membership of the knob set             | refused |
      | open   | a knob's floor or ceiling                  | refused |
      | open   | the price ceiling a trial may not be above | refused |
      | open   | the frozen set                             | refused |

    Examples: at the boundary each of the same parts may be revised
      | moment        | quantity                                   | outcome  |
      | at a boundary | the trial metric                           | accepted |
      | at a boundary | the paired counter-metric                  | accepted |
      | at a boundary | alpha                                      | accepted |
      | at a boundary | lambda                                     | accepted |
      | at a boundary | the pair count N those two give            | accepted |
      | at a boundary | the pair budget B a run is truncated at    | accepted |
      | at a boundary | the membership of the knob set             | accepted |
      | at a boundary | a knob's floor or ceiling                  | accepted |
      | at a boundary | the price ceiling a trial may not be above | accepted |
      | at a boundary | the frozen set                             | accepted |

  Scenario: the refusal names what was touched, the epoch it was touched in, and where it may be made
    Given an open epoch
    When a frozen part of the criterion is revised
    Then the refusal names the part that was touched
    And it names the epoch that is open
    And it names the boundary at which the revision may be made
    And the refusal carries a code rather than only a sentence

  Scenario: a refusal is a refusal, not a warning
    Given an open epoch and the criterion in force
    When a frozen part of the criterion is revised
    Then the criterion in force afterwards is the one in force before
    And nothing about the attempt is reported as merely advisory

  Scenario: a derived quantity cannot be pinned while the quantities it comes from move
    Given a criterion at a boundary
    When lambda is revised and the pair count is left as it was
    Then the pair count in force is the one the revised lambda and alpha give
    And a criterion whose stated pair count disagrees with them is refused

  Scenario: the pair budget is frozen for the other reason, and a run cannot be lengthened
    Given a proposal accruing inside an open epoch that has not yet reached a commit
    When the pair budget is extended so that the proposal may run further
    Then the extension is refused
    And the proposal is still truncated at the budget in force when it began

  Scenario: a pair budget below the earliest crossing is refused when the criterion is made
    Given a criterion whose pair budget is below the pair count its confidence and bet fraction give
    When that criterion is constructed
    Then it is refused
    And the refusal names both the budget and the pair count it falls below

  Scenario: a knob's value may move mid-epoch, and is not treated as a criterion revision
    Given an open epoch
    When a tunable knob's value is changed
    Then the change is not refused
    And the criterion in force is unchanged

  Scenario: a project that has never revised the criterion still has one
    Given a project that has never revised the criterion
    When the criterion in force is read
    Then it is the framework's own
    And nothing had to be installed into the project for that to be true

  Scenario: a boundary revision survives a framework refresh and is not reported as drift
    Given a project whose criterion was revised at a boundary
    When the framework's installed files are refreshed
    Then the revised criterion is still in force
    And the revision is reported as neither drift nor tampering
