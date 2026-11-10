@executable @docs @work @planning
Feature: The refine Contract stage formulates from the example map

  WHY. 134 gave each story an example map before any scenario is written, but the Contract stage
  still formulates as if there were none: the PO writes headlines, QA writes tables, and nothing ties
  either to the map's rules or to the examples a person agreed. ADR-006 §1 makes the map the
  starting point: one `Rule:` per map rule, the key examples as headline scenarios under it, and
  QA's tables beneath, carrying the ids that the doctor's trace (story 04) resolves. It applies only
  when discovery ran and the map is applicable, so every other story's formulation reads as today.
  The bundle sources are `packages/core/assets/`. Their rendered copies must match a fresh render.

  Rule: R1 · Each map rule becomes a Rule: block, and each key example a headline scenario under it

    Scenario: E1 · the Formulation passage tells the PO to write one Rule per map rule and one headline per key example
      When the story Contract's Formulation passage in "refine.md" is read
      Then it tells the PO to read the map first
      And to write one "Rule:" per map rule, titled with the rule's id and text
      And to write one headline scenario per key example under its rule, titled with the example's id and its outcome

    Scenario: E2 · the passage makes the map row the headline where a table row says the same thing
      When the story Contract's Formulation passage in "refine.md" is read
      Then it says a key example stays the headline scenario and the table keeps only the edges

    Scenario Outline: the id forms the passage teaches are the ones the trace reads
      When the Formulation passage's <form> specimen is read by the package's id reader
      Then the reader returns the id "<id>"

      Examples:
        | form                    | id |
        | rule title              | R1 |
        | headline scenario title | E2 |
        | example column cell     | E3 |

  Rule: R2 · QA's matrix sits under the rule it tests

    Scenario: E3 · QA's outlines go inside the rule, and a restating row carries the example's id
      When the story Contract's Formulation passage in "refine.md" is read
      Then it tells QA to write its outlines inside the rule they test
      And to put a map example's id in an "example" column on any row that restates it

    Scenario: an agreed example the contract leaves out is named by the doctor
      When the story Contract's Formulation passage in "refine.md" is read
      Then it says every confirmed or stated example must be carried
      And it names the doctor code "example-untraced" as what reports one that is not

  Rule: R3 · Without an applicable map, formulation reads as today

    Scenario Outline: E4 · the map-driven formulation applies only when discovery ran and the map is applicable
      Given <condition>
      When the story Contract's Formulation passage in "refine.md" is read for that story
      Then <outcome>

      Examples:
        | condition                                   | outcome                                                    |
        | the gate is off                             | it asks for no Rule: block and no example id               |
        | the story's map says "Not applicable"       | it asks for no Rule: block and no example id               |
        | the gate is on and the map is applicable    | it asks for Rule: blocks and headline scenarios by id      |

    Scenario: the passage names the fallback for a runner that cannot read Rule
      When the story Contract's Formulation passage in "refine.md" is read
      Then it names one feature per rule, titled with the rule's id, for a runner that does not bind "Rule:"

  Rule: R4 · Every rendered copy of refine matches its source

    Scenario Outline: each rendered refine copy carries the passage and matches a fresh render
      When "aof work update --dry-run --json" is run from the repository root
      Then "<copy>" is reported as "skip"
      And "<copy>" carries the map-driven Formulation passage

      Examples:
        | copy                                |
        | .claude/commands/aof/refine.md      |
        | .codex/skills/aof-refine/SKILL.md   |
        | .opencode/commands/aof/refine.md    |
