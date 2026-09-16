@docs @work @round-trip
Feature: A granted second round re-reviews the delta it was granted for
  In order that a fix touching a handful of lines does not buy a second full structural, behavioural
  and design pass
  round two must re-spawn only the lens or lenses that raised a surviving Blocker, over the fix diff
  and the contract clauses those Blockers cite.

  # Contract, not restated: ADR-007. The round CAP, the Blocker classes and the stall stop are 83's
  # and are unchanged here; this feature is only about what a granted round covers.

  Background:
    Given a review round one that produced findings across several lenses
    And a second round that has been earned by a reproduced Blocker

  @executable
  Scenario Outline: which lenses re-spawn in round two
    Given round one's surviving Blockers were raised by <raised-by>
    When round two is spawned
    Then the lenses spawned are <spawned>
    And every other lens is left with its round-one verdict standing

    Examples:
      | raised-by                                     | spawned                     |
      | structural only                               | structural only             |
      | behavioural only                              | behavioural only            |
      | design conformance only                       | design conformance only     |
      | the automated craft pass only                 | the craft pass only         |
      | structural and behavioural                    | structural and behavioural  |
      | every lens                                    | every lens                  |
      | structural, whose Blocker did not reproduce   | none — nothing is re-spawned |

  @executable
  Scenario: a lens that reported clean in round one is not re-spawned
    Given a lens that raised no surviving Blocker in round one
    When round two is spawned
    Then that lens is not spawned
    And its round-one verdict stands

  @executable
  Scenario Outline: what each re-spawned lens is handed, and what it is not
    Given a lens re-spawned for round two
    When its brief is composed
    Then <material> is <handed>

    Examples:
      | material                                     | handed     |
      | the fix diff                                 | handed     |
      | the Blockers that lens itself raised         | handed     |
      | the contract clauses those Blockers cite     | handed     |
      | another lens's Blockers                      | not handed |
      | another lens's round-one clean verdict       | not handed |
      | the story's whole reads: set                 | not handed |
      | the round-one findings below Blocker         | not handed |

  @executable
  Scenario Outline: how much of the design lane re-runs
    Given a surviving design-gap Blocker naming <named>
    When the design lane is re-spawned
    Then <re-rendered> is re-rendered and re-judged

    Examples:
      | named                                  | re-rendered                          |
      | one surface of a story with several    | that surface only                    |
      | two surfaces of a story with several   | those two surfaces only              |
      | no surface                             | nothing — the claim did not name one |

  @executable
  Scenario Outline: one deduplicated Blocker re-spawns exactly one lens
    Given one Blocker raised by two lenses and deduplicated to a single claim of class <class>
    When round two is spawned
    Then exactly one lens is re-spawned
    And it is <lens>

    Examples:
      | class                     | lens          |
      | production-defect         | the architect |
      | locked-contract-violation | QA            |
      | a design gap              | the designer  |
      | ambiguous                 | the lens whose report survived reproduction |

  @executable
  Scenario: the delta is named by the reproduce-and-deduplicate step
    When round two is prepared
    Then every outstanding Blocker is reproduced against actual code first
    And overlapping lens reports are deduplicated
    And a claim that cannot be reproduced is discarded rather than carried into the round
    And a discarded claim does not earn its lens a re-spawn

  @manual
  Scenario: a real second round costs one lens over one diff
    When a story that earned a second round is driven through it
    Then the run record shows only the lens or lenses that raised the surviving Blocker
    And round two's cost is materially below round one's
    And no lens that reported clean in round one appears in the run record for round two
