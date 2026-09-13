@executable @cli @work @validate
Feature: A proposal's lane is the arbiter's tuning edge answering, and nowhere else is asked

  A lane decides whether a proposal can ever reach a commit at all, so whoever owns the partition
  owns the gate. If that partition were a table kept here, "may this be committed?" would be answered
  out of a file this milestone is free to edit — which is the arrangement 61 spent a whole story
  dismantling, and copying it back one level up undoes it without touching a line of 61's code.

  The way to fail this while looking right is cheap and tempting: write the four proposal classes as
  rows and give the cap-adjustment row the tunable lane. Over today's registry every case passes,
  because today exactly one class happens to target a declared key. The defect shows only on the day
  the arbiter's edge changes, and on that day the two answers disagree with nobody watching. So the
  criterion is a MOVEMENT rather than a mapping: change the `parameter-tuning:` edge and every lane
  assignment moves with it, in both directions, with nothing else edited.

  The second half is that most proposals do not target a configuration key at all — a role in a model
  map, a prompt document, a sizing judgement about a story. Those are advisory, and the reason is not
  that a list here says so; it is that they are not on the edge. One question, one place it is asked,
  and the same answer for a key that was never declared and for one that stopped being.

  ADR-003 §1, §2. 61/ADR-008 §4. FF-6202.

  Scenario Outline: what the registry declares decides the lane, and nothing else does
    Given an arbiter record whose tuning edge <edge>
    And a proposal targeting <target>
    When the proposal's lane is computed
    Then it is <lane>

    Examples:
      | edge                                  | target                                       | lane     |
      | declares that key                     | that configuration key                       | tunable  |
      | declares other keys, but not that one | that configuration key                       | advisory |
      | declares no key at all                | a configuration key it declared before       | advisory |
      | newly declares a key it did not carry | that newly declared key                      | tunable  |
      | declares that key on a second record  | that configuration key                       | tunable  |
      | declares that key                     | the same key with a letter cased differently | advisory |
      | declares that key                     | the same key with surrounding space          | advisory |
      | declares that key                     | a role in the model map                      | advisory |
      | declares that key                     | a prompt document shipped with the harness   | advisory |
      | declares that key                     | a story-sizing judgement with no target file | advisory |

  Scenario: adding a key to the edge moves its proposal into the tunable lane
    Given a proposal on a configuration key the tuning edge does not declare, computed as advisory
    When the edge is changed to declare that key
    And the same proposal's lane is computed again
    Then it is tunable
    And the only thing that changed is the arbiter record's declaration

  Scenario: dropping a key from the edge moves its proposal out of the tunable lane
    Given a proposal on a configuration key the tuning edge declares, computed as tunable
    When the edge is changed to drop that key
    And the same proposal's lane is computed again
    Then it is advisory
    And nothing was edited here to bring that about

  Scenario: the tunable lane and the declared set are the same set
    Given one proposal for every key the tuning edge declares, and several on keys it does not
    When the lanes are computed
    Then the targets of the tunable-lane proposals are exactly the declared keys
    And no proposal is tunable whose target the edge does not carry

  Scenario: two proposals of the same class can land in different lanes
    Given two cap adjustments, one on a declared key and one on a key the edge does not carry
    When their lanes are computed
    Then the first is tunable and the second is advisory
    And the class the two share decided neither answer

  Scenario: every proposal carries exactly one lane
    Given a set of proposals spanning all four classes
    When the lanes are computed
    Then each proposal carries exactly one lane
    And none is left without one
    And the two lanes together account for every proposal emitted

  Scenario: an advisory proposal names the declaration its target is absent from
    Given a proposal whose target the tuning edge does not declare
    When its lane is read
    Then it names the arbiter record that was consulted
    And it names the edge on that record that was read
    And it states that the target is absent from that declaration
