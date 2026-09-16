@executable @cli @work @distribution
Feature: The plan ships off by default and reaches the builder alone, and a deviation from it is not a finding

  The entire win of story 83 was stopping agents ingesting prose. `aof-qa` is now the most frequent
  agent in the stream and the cheapest per run — 458,249 cache-create, 82 turns, a 9.5-minute median,
  twelve runs a milestone. A per-story document that every spawn reads would re-create the cost story
  83 removed, at story scale, and land hardest on the agent that currently costs least. So the plan
  goes to the builder and to nobody else, and that is a design decision rather than an oversight in
  the wiring.

  It is also off by default. Authoring it costs refine, and refine is already the expensive phase —
  `aof-architect` is 793,788 cache-create per run. Whether the trade pays is a question for
  measurement on a real milestone, and story 00 is what makes that measurable. A default-on document
  would spend the budget before the measurement exists to justify it.

  The reviewer bar is the load-bearing sentence and it must be written down rather than assumed:
  **a deviation from the plan is not a finding; the task `.feature` is the contract.** Without it,
  reviewers will report "did not follow PLAN.md" as an Important finding and this milestone will have
  bought a third authority to argue with — which is a worse outcome than not shipping the document.

  The developer's escape is the same shape as the read-set escape the retrospectives show agents
  actually using: a builder that finds the plan wrong says so and continues. Advisory in force means
  a plan that blocks a lane because the architect misjudged is a defect in the plan, not in the lane.

  What would quietly undo this: a reviewer brief that mentions the plan at all; the flag defaulting on
  "since it is useful"; and a plan that is described as advisory in one document and as the contract
  in another.

  ADR-006 §4. FF-9603.

  Scenario Outline: the config gate, off unless a project turns it on
    Given `work.plan.enabled` is <configured>
    When the configuration is inspected
    Then the plan gate is <resolved>
    And <diagnostic>

    Examples: a boolean with a documented default and a validated shape
      | configured | resolved | diagnostic                             |
      | absent     | off      | no diagnostic is raised                |
      | false      | off      | no diagnostic is raised                |
      | true       | on       | no diagnostic is raised                |
      | a string   | off      | a diagnostic names `work.plan.enabled` |
      | a number   | off      | a diagnostic names `work.plan.enabled` |
      | null       | off      | a diagnostic names `work.plan.enabled` |

  Scenario: no module in `src/` reads the gate outside its validator
    Given the module set of this milestone
    When it is examined for reads of `work.plan.enabled`
    Then only the configuration validator names it

  Scenario: the developer's brief names the plan
    Given the shipped developer agent document
    When it is read
    Then it names the plan document as an input when one is present
    And it states that the plan is advisory
    And it states that a plan found wrong is reported and the build continues

  Scenario Outline: the reviewer briefs do not name the plan
    Given the shipped <role> agent document
    When it is read
    Then it does not instruct that role to read a plan document

    Examples: the two review lanes the read contract made cheap
      | role      |
      | qa        |
      | architect |

  Scenario: a deviation from the plan is not a finding
    Given a review brief in this milestone's bundle
    When its findings guidance is read
    Then it states that a deviation from the plan is not a finding
    And it states that the task feature is the contract

  Scenario: with the gate off, refine authors no plan
    Given a project whose `work.plan.enabled` is absent
    When a story is refined
    Then no plan document is written under that story
    And no finding reports its absence
