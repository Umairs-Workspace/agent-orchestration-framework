@executable @cli @work @work-stream
Feature: The rollup reports per phase — grouped by the phase the loop already declares

  A milestone-wide total says a milestone was expensive. It does not say whether the expense was
  refine, continue or verify — and the evidence says the answer is rarely the assumed one.
  Governance output beat build output in **four of six** instrumented milestones; in milestone 52,
  build was **7%** of active time and 93k tokens, against **38%** and 662k for re-applying contract
  deltas (`RESEARCH-agent-loop-economics.md` §2.1). A per-milestone average hides exactly the thing
  worth acting on.

  **Phase is read, never minted.** Milestone 53 is `done`, and its loop declaration already carries
  `phase` on the run's `brief.loop` envelope — so this rollup groups by a key that already has a
  producer and an owner (ADR-002). Minting a second `phase` here would create two copies of one
  fact, and the copy is the one readers would reach for; FF-6802 makes the single authority
  structural.

  A run not minted by the loop shell has no declared phase. It is reported as having none, rather
  than being folded into a phase it never ran in — the same posture ADR-006 takes on an
  unattributable run and ADR-004 takes on a cost nobody reported. A phase bucket must mean what it
  says or it is not worth grouping by.

  ADR-002; ADR-006.

  Scenario: the report breaks the total down by phase
    Given an item whose runs declared more than one phase
    When the item is observed
    Then the report states a per-phase breakdown
    And each phase's figures are drawn only from runs that declared that phase
    And the phases sum to the item's attributed total

  Scenario: the phase comes from the loop's own declaration
    Given a run whose loop declaration names its phase
    When the item is observed
    Then that run's figures appear under the phase the declaration names
    And no phase was derived from the run's prompt text, agent type or timing

  Scenario: runs with no declared phase are reported as such
    Given an item with some runs minted by the loop shell and some minted outside it
    When the item is observed
    Then the runs with no declared phase are reported under an explicit "no declared phase" grouping
    And they are not distributed across the declared phases
    And the grouping states how many runs it holds

  Scenario Outline: what each phase grouping reports
    Given an item observed with runs across several phases
    When the per-phase breakdown is read
    Then each phase row states <measure>

    Examples: the per-phase measures
      | measure                                   |
      | the number of runs in that phase          |
      | the active time attributed to that phase  |
      | the tokens attributed to that phase       |
      | the cost attributed to that phase         |

  Scenario: an item whose runs declared no phase at all still reports
    Given an item none of whose runs carry a loop declaration
    When the item is observed
    Then the report succeeds
    And every run appears under the "no declared phase" grouping
    And no empty phase rows are fabricated
