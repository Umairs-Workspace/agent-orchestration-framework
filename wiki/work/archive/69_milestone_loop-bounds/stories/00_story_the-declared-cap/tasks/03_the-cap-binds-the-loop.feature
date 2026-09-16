@executable @cli @work @work-stream @bug @finding-F-6900
Feature: The declared review cap binds the loop that re-reviews, not a leaf nobody calls

  The refusal shipped and nothing calls it. `decideReviewRound` — the cap, the three blocker
  classes, the exhausted-cap halt — has **zero production consumers**: the only importer in the tree
  is its own test. Meanwhile the path that actually re-reviews is untouched by any of it. After a
  `continue` phase the loop runs the `work:validate` gate and, on a non-empty findings list, drives
  `continue` again, bounded only by the ENGINE cycle cap. `work.loop.reviewRounds` is resolved, is
  pointed at by the `review-fix-rereview` record's `ceiling:`, and is read by nothing on that path.

  A declared bound with no consumer is strictly worse than `uncapped`, because it reads as answered.
  That is the same defect FF-6907 makes structural for its sibling — "`dispatchReadySet` has a
  production caller" — and it is this task's whole subject.

  Two facts about the seam shape this contract, and both were measured rather than assumed.

  **The round count is not the engine cycle.** The engine cap bounds phases driven for an item; the
  review cap bounds how many times a findings-bearing gate may re-drive the maker. Spending the
  second against the first is what let the review loop run unbounded while a cap sat declared.

  **A blocker is a CLAIM, never an inference.** The shipped classifier matches three exact prose
  phrases; the gate's real findings are `{ path, problem }` records that can never match one. So the
  loop must read an explicit, structured blocker claim carried alongside the findings — a reviewer's
  free prose does not become a blocker by being non-empty, which is the ADR's whole point about an
  LLM opinion not being an oracle.

  This task adds no bound and invents no value. It binds the one already declared to the one path
  that re-reviews.

  ADR-001.

  Scenario: the first findings-bearing gate re-drives without ceremony
    Given a story whose first review round has produced findings
    When the loop decides what to do next
    Then the maker is re-driven to fix them
    And no blocker needs to be claimed

  Scenario: a further round with no claimed blocker is refused by the production loop
    Given a story that has consumed its declared review rounds
    And a gate reporting findings that carry no blocker claim
    When the loop decides what to do next
    Then it halts with the exhausted-cap stop
    And the halt reports the round count and the cap it was measured against
    And the halt names the blocker classes that would admit a further round

  Scenario: a further round with a claimed blocker is admitted
    Given a story that has consumed its declared review rounds
    And a gate whose findings carry a blocker claim of an admitted class
    When the loop decides what to do next
    Then the maker is re-driven
    And the claimed blocker is carried on the decision

  Scenario: the refused findings survive the halt as work items
    Given a story halted for an exhausted review cap
    When the halt is read
    Then the findings that claimed no blocker are reported as work items
    And none of them is discarded

  Scenario Outline: the production decision, over rounds consumed and the claim carried
    Given a story with <consumed> review rounds already consumed against a cap of one
    And a gate reporting findings with <claim>
    When the loop decides what to do next
    Then the outcome is <outcome>

    Examples: the cap's own truth table, as the loop sees it
      | consumed | claim                                  | outcome                          |
      | 0        | no claim                               | re-drive the maker               |
      | 0        | a production defect                    | re-drive the maker               |
      | 1        | no claim                               | halt — cap exhausted             |
      | 1        | a production defect                    | re-drive the maker               |
      | 1        | a guard that protects nothing          | re-drive the maker               |
      | 1        | a violation of the locked contract     | re-drive the maker               |
      | 2        | no claim                               | halt — cap exhausted             |
      | 2        | a violation of the locked contract     | re-drive the maker               |

  Scenario Outline: what the loop will and will not read as a blocker claim
    Given a gate reporting findings alongside <carried>
    When the loop classifies the claim
    Then it is <verdict>

    Examples: a claim is explicit and closed; everything else is a work item
      | carried                                          | verdict                       |
      | an admitted class, declared as a claim           | a blocker                     |
      | a class outside the admitted set                 | not a blocker                 |
      | a finding record carrying a path and a problem   | not a blocker                 |
      | reviewer prose naming a class in passing         | not a blocker                 |
      | an empty claim                                   | not a blocker                 |
      | a malformed claim                                | not a blocker                 |
      | nothing at all                                   | not a blocker                 |

  Scenario: the engine's remaining cycles do not buy a further review round
    Given a story that has consumed its declared review rounds
    And an engine cap with cycles still remaining
    And a gate reporting findings that carry no blocker claim
    When the loop decides what to do next
    Then it halts with the exhausted-cap stop
    And the cap the halt reports is the review cap, not the engine cap

  Scenario: a workspace that declares its own round count changes what the loop does
    Given a workspace declaring a review round count higher than the default
    And a story that has consumed exactly the default number of rounds
    And a gate reporting findings that carry no blocker claim
    When the loop decides what to do next
    Then the maker is re-driven
    And the same story under the default configuration would have halted

  Scenario: the number reaches the loop from its declared home, once
    Given the production decision path that admits a review round
    When its sources for the round count are enumerated
    Then the value resolves through the declared bounds home
    And no literal round count appears anywhere on that path

  Scenario: the refusal is reachable from the command that drives the loop
    Given the loop command driving a story past its review cap with unclaimed findings
    When the run finishes
    Then the reported stop is the exhausted-cap stop
    And the decision that produced it consulted the review-round authority
