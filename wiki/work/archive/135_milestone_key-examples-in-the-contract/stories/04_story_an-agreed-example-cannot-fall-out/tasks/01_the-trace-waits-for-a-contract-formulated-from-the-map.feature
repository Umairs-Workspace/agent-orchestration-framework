@executable @cli @work @validate
Feature: The trace judges only a contract formulated from the map

  WHY. The SPEC excludes contracts written before 135 ("nothing is back-filled") and stories
  without a map. The refine Contract stage stops on any error-severity example finding before the
  first scenario is written (134/ADR-005 §5), so a trace that fired with no tasks would block the
  stage that writes them. ADR-004 §4 therefore scopes the trace: the gate is on, the map is
  applicable, the story has at least one task feature, and at least one of them has a group titled
  with a rule id. 144, the only story with a map today, has tasks that name no rule id, so it lints
  as it does today.

  Rule: R3 · A contract not formulated from the map is held to nothing new

    Scenario: E6 · a story whose tasks name no rule id is not traced
      Given story "7/2"'s map holds the confirmed example "E2" of rule "R1"
      And its task features have no group titled with a rule id, and no scenario carries "E2"
      When "aof work doctor 7/2 --json" is run
      Then it reports no "example-untraced" finding

    Scenario: E7 · a story at discovery with no tasks is not traced, so its contract can be written
      Given story "7/2"'s map holds the confirmed example "E2", anchored, and every business question answered
      And the story has no "tasks/" folder
      When "aof work doctor 7/2 --json" is run
      Then it reports no error-severity finding whose code starts with "example-"

    Scenario Outline: the trace is silent wherever the map is
      Given story "7/2" has a task feature with "Rule: R1 · …" that carries no example id
      And <condition>
      When "aof work doctor 7/2 --json" is run
      Then it reports no "example-untraced" finding

      Examples:
        | condition                                                    |
        | "work.examples" is absent                                    |
        | "work.examples.enabled" is false                             |
        | the story has no "EXAMPLES.md"                               |
        | the story's "EXAMPLES.md" is "Not applicable: …"             |
        | the map's only examples are proposed                         |

    Scenario: one group titled with a rule id is enough to bring the whole contract under the trace
      Given story "7/2"'s map holds confirmed "E2" of rule "R1" and confirmed "E4" of rule "R2"
      And one task feature holds "Rule: R1 · …" carrying "E2", and nothing names "R2" or carries "E4"
      When "aof work doctor 7/2 --json" is run
      Then it reports "example-untraced" for "E4" only

    Scenario: the live stream gains no trace finding when this story lands
      Given the work stream as it stands, with 144 as the only story holding a map
      When "aof work doctor --json" is run from the repository root
      Then it reports no "example-untraced" finding
