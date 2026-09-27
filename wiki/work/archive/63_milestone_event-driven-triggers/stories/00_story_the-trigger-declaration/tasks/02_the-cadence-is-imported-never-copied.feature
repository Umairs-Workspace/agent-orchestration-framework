@executable @cli @work @work-stream
Feature: A trigger's cadence answers exactly what the loop registry answers for the same string, boundary for boundary

  There is only one way to observe an import from outside the source: ask both readers the same
  question and require the same answer. A copy of the grammar and an import of it are
  indistinguishable on `periodic:1h` and `event:per-item`, which is precisely why the happy path proves
  nothing here and the table below is mostly boundaries.

  A second copy diverges in the places nobody types by hand. The amount must be above zero, so
  `periodic:0s` is a refusal rather than a cadence that fires continuously. The unit table has exactly
  five members, so `periodic:1w` is a refusal rather than a week nobody defined. The product must
  remain a safe integer, so a duration large enough to leave that range is refused rather than silently
  rounded. The sentinel is one exact token, so `Unknown` is not it, and the sentinels that belong to
  other fields are not it either. Each of those is one line in a validator, and a re-implementation that
  reproduces four of them and not the fifth reads as identical until the day the fifth one arrives.

  The two kinds also carry different operands, and neither is convertible into the other. A duration
  answers in milliseconds; an ordinal answers with a rank in a containment relation; the sentinel
  answers with neither. An implementation that invented a duration for an ordinal — a week for a
  milestone, an hour for an item — would make every pair comparable and every comparison fiction, which
  is why the operand a cadence carries is asserted here rather than assumed by whatever compares them.

  What the loop registry answers is not affected by there now being a second reader of the same
  grammar. That is the other half of "imported, never copied": the existing reader keeps its answers,
  and no record in the shipped registry acquires a finding it did not have.

  ADR-002 §3, §3a. FF-6302.

  Scenario Outline: the same cadence string, asked of a loop record and of a trigger member
    Given a loop registry entry declaring the cadence <cadence>
    And a trigger member declaring the cadence <cadence>
    When both are read
    Then what each answers is <answer>
    And the two answers agree on the kind and on the operand each carries
    And neither answer carries anything the other does not

    Examples: durations, and the boundaries a second copy of the grammar gets wrong
      | cadence                  | answer                                                     |
      | periodic:1ms             | a duration of 1 millisecond                                |
      | periodic:250ms           | a duration of 250 milliseconds                             |
      | periodic:30s             | a duration of 30 seconds                                   |
      | periodic:15m             | a duration of 15 minutes                                   |
      | periodic:1h              | a duration of 1 hour                                       |
      | periodic:7d              | a duration of 7 days                                       |
      | periodic:01h             | a duration of 1 hour — a leading zero is not a new spelling |
      | periodic:0s              | a refusal — the amount is not above zero                   |
      | periodic:0ms             | a refusal — the amount is not above zero                   |
      | periodic:1.5h            | a refusal                                                  |
      | periodic:-1h             | a refusal                                                  |
      | periodic:1w              | a refusal — the unit is not one that exists                |
      | periodic:1H              | a refusal — a unit in the wrong case is not that unit      |
      | periodic:h               | a refusal — an amount is not optional                      |
      | periodic:1 h             | a refusal                                                  |
      | periodic:                | a refusal                                                  |
      | periodic:99999999999999999d | a refusal — the duration leaves the safe integer range   |

    Examples: ordinals, the sentinel, and the tokens that are nearly one of them
      | cadence             | answer                                                        |
      | event:per-run-start | an ordinal                                                    |
      | event:per-phase     | an ordinal                                                    |
      | event:per-item      | an ordinal                                                    |
      | event:per-milestone | an ordinal                                                    |
      | event:per-sprint    | a refusal — the event is not one that exists                  |
      | event:              | a refusal                                                     |
      | event:per-item extra | a refusal                                                    |
      | event:Per-Item      | a refusal — an event in the wrong case is not that event      |
      | unknown             | the sentinel                                                  |
      | Unknown             | a refusal — the sentinel is one exact token                   |
      | none                | a refusal — a dwell's sentinel is not a cadence               |
      | uncapped            | a refusal — a ceiling's sentinel is not a cadence             |
      | an empty string     | a refusal                                                     |
      | a value that is not a string | a refusal                                            |

  Scenario: each kind carries the operand a comparison is handed, and nothing is converted between them
    Given a trigger member declaring a duration cadence
    And a trigger member declaring an ordinal cadence
    And a trigger member declaring the sentinel
    When the declaration is compiled
    Then the duration carries its length in milliseconds and no rank
    And the ordinal carries its rank and no length in milliseconds
    And the sentinel carries neither
    And no answer carries a duration derived from an ordinal, or a rank derived from a duration

  Scenario: a cadence the loop registry refuses is refused for a trigger, under every spelling
    Given a cadence string the loop registry does not admit
    When a trigger member declares it
    Then the compile is refused
    And the trigger does not admit it under a spelling of its own
    And no cadence is admitted for a trigger that a loop record could not declare

  Scenario: the loop registry's own answers are unchanged by there being a second reader
    Given the shipped loop registry
    When its records are read and validated
    Then every declared cadence reads as the registry already reports it
    And no record gains a cadence finding it did not have
    And this holds whether or not a trigger declaration has been compiled in the same run
