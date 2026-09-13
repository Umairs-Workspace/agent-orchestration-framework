@docs @work @work-stream
Feature: Every finding the review pass declines to chase is routed by one ordered rule
  In order that capping the review rounds schedules the remaining work instead of dropping it
  the review close must put each surviving non-Blocker finding to four ordered questions, take the
  first answer, and report the routing it chose.

  # Contract, not restated: the four questions and their bounds are ADR-003. The structural claim —
  # that no module can emit a type other than chore, and that no bundled command instructs any other
  # creation — is FF-7103.

  Background:
    Given a review pass that has reached its round cap
    And the surviving findings it did not chase

  @executable
  Scenario: the routing happens once, at the close, never inside a round
    When the review pass closes
    Then each surviving non-Blocker finding is routed exactly once
    And no routing is taken while a round is still open

  @executable
  Scenario Outline: the first question that answers decides the routing
    Given a surviving non-Blocker finding that <character>
    When the four ordered questions are put to it
    Then it is routed to <routing>
    And no later question is asked of it

    Examples:
      | character                                                      | routing                                       |
      | requires a change to a delivered .feature                      | an amendment in the accepting item's contract |
      | requires a change to an ADR                                    | an amendment as a superseding ADR             |
      | requires an ADR change and is also checklist-dischargeable     | an amendment — question 1 answered first      |
      | is discharged by a checklist against existing code             | a top-level chore                             |
      | is checklist-dischargeable and also suggests new criteria      | a top-level chore — question 2 answered first |
      | needs new acceptance criteria a .feature must state            | a question handed to the operator             |
      | is a preference with no correctness consequence                | a recorded finding                            |
      | answers none of the first three questions                      | a recorded finding                            |

  @executable
  Scenario: an amendment creates no item and never edits a delivered contract
    Given a finding routed to an amendment
    When the routing is applied
    Then no work item is created
    And the delivered .feature it concerns is unchanged

  @executable
  Scenario Outline: which findings reach the questions at all
    Given <finding>
    When the review pass closes
    Then it <eligibility>

    Examples:
      | finding                                     | eligibility                                          |
      | a Blocker fixed inside a round              | is not routed here — it was chased                   |
      | a Blocker outstanding at the cap            | is not routed here — it is named in the bounded stop  |
      | an Important finding                        | may be routed to a chore                             |
      | a Nit                                       | is recorded, and is never promoted                   |
      | a claim that did not reproduce              | is not routed — it was discarded before the close    |
      | one finding raised by two lenses            | is routed once, after deduplication                  |

  @executable
  Scenario: a close with nothing surviving routes nothing and creates nothing
    Given a review pass that closed with no surviving non-Blocker finding
    When the close runs
    Then no work item is created
    And the hand-back records that there was nothing to route

  @executable
  Scenario: the close reports what it routed and where, and allocates no finding id
    When the review pass hands back
    Then it names each surviving finding with the routing it took
    And it names each chore it created by ref
    And it names each finding it handed to the operator as a story shape
    And it allocates no finding id and prints no "@finding-<id>" tag
