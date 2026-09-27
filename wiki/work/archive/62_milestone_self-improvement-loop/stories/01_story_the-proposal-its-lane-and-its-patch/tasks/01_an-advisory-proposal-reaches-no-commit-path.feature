@executable @cli @work @validate
Feature: An advisory proposal reaches no commit path, and the acceptor is never asked about one

  "No code path from the advisory lane to a commit" is easy to write and hard to check, because it is
  an assertion about an absence. It becomes checkable through the one act that stands between a
  proposal and a commit: the tunable lane's verdict is obtained by asking 61's acceptor, so a lane
  with nothing in it produces no question. Over a registry declaring no tunable key at all, the
  acceptor is not consulted once — and that silence is the observable, in place of a claim.

  The mixed case is what makes the criterion discriminating rather than decorative. Given a registry
  declaring exactly one key and a proposal set spanning all four classes, exactly one proposal is put
  to the acceptor and the rest are not touched. An implementation that asks about everything and
  discards the answers it does not like would satisfy any count of commits and fail here, and it is
  the likelier defect of the two: asking is cheap, it looks thorough, and its cost is a second lane
  quietly acquiring a route to the gate.

  The last claim is permanence, and it is a claim about the CLASS rather than about this quarter. A
  model map is not ordinal, so a step on it has no meaning under any quantity of evidence; a prompt
  revision and a sizing hint are not steps on an integer at all. The surface therefore states the
  ground as a property of the class and offers no amount of evidence as the thing that would move it.
  A report that says "not yet" about something that is never is worse than a report that says nothing:
  it invites a reader to go and gather the evidence that would close a door that does not exist.

  ADR-003 §1, §2. ADR-002 §1. 61/ADR-001 §5. FF-6202.

  Scenario Outline: what the tuning edge declares decides how many proposals are put to the acceptor
    Given a proposal set spanning all four classes
    And an arbiter record whose tuning edge <edge>
    When the proposals are laned
    Then the proposals put to the acceptor are <put>
    And every proposal not put to it is advisory

    Examples:
      | edge                                              | put                          |
      | declares no key at all                            | none — it is not asked       |
      | declares one key that one proposal targets        | that one proposal            |
      | declares one key that no proposal targets         | none — it is not asked       |
      | declares two keys that two proposals target       | those two proposals          |
      | declares one key that two proposals both target   | both of those proposals      |
      | declares two keys of which one proposal hits one  | that one proposal            |

  Scenario: over a registry declaring nothing tunable, the acceptor is not consulted at all
    Given an arbiter record whose tuning edge declares no key
    And proposals across all four classes
    When the proposals are laned
    Then the acceptor is asked nothing
    And no proposal carries a verdict, an evidence total or a refusal
    And the result reports the tunable lane as empty rather than omitting it

  Scenario: the proposals that were not routed carry no trace of an assessment
    Given an arbiter record declaring one tunable key
    And four proposals, exactly one of which targets that key
    When the proposals are laned
    Then one proposal is put to the acceptor
    And the other three carry nothing that an assessment would have produced
    And no observation is read on their behalf

  Scenario: an advisory proposal carries nothing that would let a reader think a decision is pending
    Given a proposal in the advisory lane
    When it is read
    Then it carries no verdict
    And it carries no accrued evidence and no quantity it is said to be short of
    And nothing about it is presented as awaiting a decision

  Scenario Outline: no quantity of evidence moves an advisory proposal
    Given an advisory-lane proposal on a role in the model map
    When <change>
    Then the proposal is still advisory
    And the ground it states is unchanged
    And no further evidence is offered as what would move it

    Examples:
      | change                                              |
      | more evidence is gathered for it                    |
      | every observation it rests on is favourable         |
      | the corpus it was drawn from doubles                |
      | the same proposal is emitted again in a later epoch |
      | it is emitted again after the acceptor has ruled    |

  Scenario: the ground an advisory proposal states is about its class, not about today
    Given advisory proposals for a role reallocation, a prompt revision and a story-sizing hint
    When each states why it is advisory
    Then each names a ground that holds of its class
    And none states a condition under which it would later be committed
    And the three grounds are distinguishable from one another

  Scenario: a lane a reader could confuse with a queue is named as the permanent one
    Given the advisory lane over a corpus spanning all four classes
    When the lane is read
    Then it is presented as the lane those classes are in permanently
    And it is not presented as a stage on the way to the tunable lane
