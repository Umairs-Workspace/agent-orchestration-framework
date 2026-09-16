@executable @cli @work @validate
Feature: A loop may declare which timescale it runs at, and the record carries the ordinals rather than deriving them

  Six of the seven loops in this registry are cadenced by an event and one by a clock, so asking
  which loop is slow enough to supervise which cannot be answered by comparing durations — and
  inventing a duration for an event is the fabrication milestone 52 banned outright. The way through
  is that a duration and an ordinal are different things. A run-start happens inside a phase, a phase
  inside an item, an item inside a milestone: that containment is a structural fact about this
  system, and an ordinal over it can be computed where a duration cannot.

  So a second axis arrives. A loop may declare the layer it runs at, from three literals, and only a
  loop may — nothing without a cadence has a place on this axis. The declaration is optional, which
  is the load-bearing part: a loop that declares nothing must be read exactly as it is read today,
  because making the field required would turn every record in the registry red the instant the
  grammar landed, before a single one had been rewritten.

  Both ordinals ride on the parsed record — the rank of the declared layer, and the scope ordinal the
  cadence itself implies — so that whatever compares them is handed numbers instead of deriving them
  from a trigger. Nothing here compares them: whether a declared layer agrees with its cadence, and
  what a disagreement means, are a later story's questions. This one makes both facts visible in the
  same place and passes no judgment on either.

  ADR-002 §1, §2, §3. FF-5801, FF-5802.

  Scenario: a loop declares the layer it runs at
    Given a loop declaring a layer from the three literals
    When the registry is loaded
    Then it is parsed without a finding
    And the layer it declares is readable off the node

  Scenario: a loop that declares no layer is read clean
    Given a loop record declaring no layer
    When the registry is loaded
    Then it is parsed without a finding
    And no finding is raised for the absence
    And the parsed node carries no layer value

  Scenario: an arbiter declaring a layer is refused
    Given an arbiter record declaring a layer
    When the registry is loaded
    Then the existing key-not-admitted-for-kind finding names the layer key and the arbiter kind

  Scenario: the parsed record carries the ordinal a comparison will use
    Given loop records declaring the operational, management and governance layers
    When the registry is loaded
    Then each record reports an ordinal for the layer it declared
    And the governance record's ordinal is higher than the management record's
    And the management record's ordinal is higher than the operational record's
    And no duration accompanies any of them

  Scenario: a loop's cadence carries its own scope ordinal alongside the declared layer
    Given a loop declaring an event cadence and a layer
    When the registry is loaded
    Then the record reports the layer's ordinal and the cadence's scope ordinal side by side
    And the record reports no duration for that cadence

  Scenario: a clock says nothing about scope
    Given a loop declaring a periodic cadence
    When the registry is loaded
    Then the record reports the interval that cadence already reported
    And the record reports no scope ordinal

  Scenario: a layer its cadence contradicts is still parsed, and the disagreement is left visible
    Given a loop declaring the governance layer and a per-phase event cadence
    When the registry is loaded
    Then it is parsed without a finding
    And both ordinals are readable off the node
    And the loader passes no judgment on their disagreement

  Scenario Outline: which kinds admit a layer
    Given a record of kind <kind> declaring a layer
    When the registry is loaded
    Then the record <outcome>

    Examples: a node without a cadence has no place on this axis
      | kind    | outcome                             |
      | loop    | admits the key                      |
      | actor   | reports a key not admitted for kind |
      | anchor  | reports a key not admitted for kind |
      | watcher | reports a key not admitted for kind |
      | arbiter | reports a key not admitted for kind |

  Scenario Outline: what a layer admits
    Given a loop declaring layer as <value>
    When the registry is loaded
    Then the record <outcome>

    Examples: three literals ranked slower-is-higher, no sentinel, and no bare ordinal
      | value          | outcome                              |
      | operational    | parses, reporting the lowest ordinal |
      | management     | parses, reporting the middle ordinal |
      | governance     | parses, reporting the highest ordinal |
      | operations     | is refused as a bad value            |
      | tactical       | is refused as a bad value            |
      | strategic      | is refused as a bad value            |
      | unknown        | is refused as a bad value            |
      | none           | is refused as a bad value            |
      | 2              | is refused as a bad value            |
      | [operational]  | is refused as a non-scalar           |

  Scenario Outline: what scope ordinal each cadence carries
    Given a loop declaring cadence as <cadence>
    When the registry is loaded
    Then the record reports <carried>

    Examples: the closed trigger set stands in a containment relation; a clock does not
      | cadence               | carried                   |
      | event:per-run-start   | the lowest scope ordinal  |
      | event:per-phase       | the lowest scope ordinal  |
      | event:per-item        | the middle scope ordinal  |
      | event:per-milestone   | the highest scope ordinal |
      | periodic:15s          | no scope ordinal          |
      | periodic:45s          | no scope ordinal          |
      | unknown               | no scope ordinal          |
      | event:per-week        | a bad-value refusal       |
      | event:                | a bad-value refusal       |
