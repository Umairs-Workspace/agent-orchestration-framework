@executable @cli @work @validate
Feature: A patch's `from` is the value in force when it is emitted, so a moved premise is refused

  Evidence is gathered at one moment and a proposal is read at another, and between the two somebody
  may have changed the very value the proposal proposes to change. A patch whose `from` was carried
  over from the evidence still renders and still looks complete, but describes a starting point that
  no longer exists — and the reader who applies it overwrites a deliberate change with a stale one.

  So the `from` is the target's value in force at emit time, at the layer the patch writes, and the
  proposal is refused when that reading disagrees with what the evidence assumed. Refusing is right
  rather than re-basing: the yield was measured against one starting value, and re-pointing the same
  argument at a different one keeps the sentence and loses the reasoning. Absent is one of the values
  a layer can be in — adding a key is a complete before-and-after, and is exactly what a `git diff`
  of the applied change shows — so a target the configuration does not hold is a patch, marked as
  having come from nowhere, and never a refusal on that ground alone.

  Where that reading comes from differs by lane, deliberately. For a tunable proposal the value in
  force arrives on the acceptor's own report and is taken from it unchanged — 61 already resolved it
  from the workspace configuration, and resolving it again here would mean this milestone naming a
  tuning key of its own. For an advisory proposal there is no acceptor to ask, so the value is read
  through the target's own accessor, the one the model map's render and its validation already share.
  Neither reading is taken twice, and neither reaches past the layer the patch writes.

  The criterion is written so a wrong implementation cannot slip through it. Copying the evidence's
  value into `from` is correct on every case where nothing moved — most cases, and all of the easy
  fixtures — and wrong in exactly the case this exists for. The unmoved row proves nothing on its
  own; the moved row is the whole check; and a change that makes the moved row pass by adopting the
  new value as the `from` has broken it rather than fixed it.

  A `from` that already equals the `to` is not a small change; it is no change, and it is a finding
  rather than a proposal. This milestone's non-vacuity condition counts EMITTED proposals, so a no-op
  admitted to that set would let the report pass its own honesty test while proposing nothing at all.

  ADR-004 §1, §2. ADR-012 §4, §8. ADR-013 §9, §9a. ADR-001 §4. FF-6203.

  Scenario Outline: the value in force at emit time decides whether the patch is rendered
    Given a candidate whose evidence was gathered under a known reading of its target
    And a target that, at emit time, <state>
    When the proposal is emitted
    Then <outcome>

    Examples:
      | state                                           | outcome                                           |
      | still reads as the evidence assumed             | the patch is rendered, its `from` that value      |
      | reads as some other value                       | no patch is rendered, and both readings are named |
      | already holds the value being proposed          | it is a finding, and not an emitted proposal      |
      | holds no value, as the evidence assumed         | the patch is rendered, its `from` absent          |
      | holds no value, where the evidence assumed one  | no patch is rendered, and both readings are named |
      | holds a value of a shape the change cannot step | no patch is rendered, the shape found named       |
      | cannot be read at all                           | no patch is rendered, what failed to read named   |

  Scenario Outline: each lane takes its `from` from one place, and only that place
    Given a proposal in the <lane> lane
    When the proposal is emitted
    Then its `from` is <reading>
    And no other reading of the target appears as its `from`

    Examples:
      | lane     | reading                                                         |
      | tunable  | the value the acceptor's own report carries for that key        |
      | advisory | the value the target's own accessor reports for it at emit time |

  Scenario: a tunable proposal's `from` is the acceptor's reading, not a second one taken here
    Given a tunable-lane proposal whose acceptor report carries a value for its key
    And a configuration that would give a different value if it were read again here
    When the proposal is emitted
    Then its `from` is the value the acceptor reported
    And the value a second reading would have given appears nowhere in the proposal

  Scenario: an advisory proposal's `from` is the value in force at the layer it writes
    Given a model reallocation over a role the configured model map holds
    When the proposal is emitted
    Then its `from` is the model that configuration holds for that role at emit time
    And its `from` is marked as having come from the configuration
    And no model the configuration does not hold is rendered as its `from`

  Scenario: a role the configuration does not hold is a complete patch that adds it
    Given a model reallocation over a role the configured model map does not hold
    When the proposal is emitted
    Then a patch is rendered whose `from` is absent
    And its `from` is marked as having come from nowhere rather than from the configuration
    And no model the configuration does not hold is rendered as its `from`

  Scenario: the `from` is read at emit time, never carried over from the evidence
    Given evidence gathered while the target held one value
    And a target that now holds a different one
    When the proposal is emitted
    Then no patch is rendered
    And the value the evidence assumed appears nowhere as a `from`
    And the same proposal over an unmoved target renders a `from` equal to the value in force

  Scenario: the refusal names what was assumed and what is in force
    Given a proposal refused because its premise moved
    When the refusal is read
    Then it names the value the evidence was gathered under
    And it names the value the target holds now
    And it names the target both readings were of

  Scenario: a change already in force is a finding, and counts as no proposal
    Given a candidate whose target already holds the value it would propose
    When the proposal set is produced
    Then it appears in the findings under a code naming the change as already in force
    And it is absent from the emitted proposals
    And it counts towards nothing that measures how many proposals were emitted

  Scenario: a proposal refused its base carries no applier either
    Given a proposal whose target has moved since its evidence was gathered
    When the proposal is emitted
    Then it carries no patch
    And it carries no applier
    And it appears in the emitted set as a finding rather than being dropped

  Scenario: a moved premise is told apart from a change that was never computable
    Given a cap adjustment whose target has moved since its evidence was gathered
    And a prompt revision that never had a computable patch
    When both reasons are read
    Then the two reasons are different
    And neither is reported with the other's

  Scenario: an absent target is a patch, and a value of an unexpected shape is not
    Given a proposal whose target the configuration does not hold
    And a proposal whose target holds a value of a shape the change cannot step
    When both are emitted
    Then the first renders a patch whose `from` is absent
    And the second renders no patch, naming the shape it found
    And an absent target is never reported as a value of an unexpected shape

  Scenario: every rendered patch agrees with the reading its own lane took
    Given the proposals emitted over a corpus spanning both lanes
    When each rendered patch's `from` is compared with its lane's reading of the target
    Then every one of them agrees
    And no rendered patch has a `from` drawn from anywhere else
