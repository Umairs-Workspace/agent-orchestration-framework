@executable @cli @assets @distribution
Feature: A practice's prose lives with the practice

  WHY. A practice's code already lives in its own package and reaches core through neutral seams
  (135/ADR-001). Its prose did not, so every new practice made core's commands longer. After the
  move the prose has the same home as the code, and core names it nowhere (ADR-005 §1, §3).

  Rule: R3 · A practice's prose lives with the practice

    Scenario: E6 · discovery's prose is the specification-by-example package's
      When the bundle's descriptor is read
      Then it declares the practice "discovery", keyed on "work.examples.enabled", contributed by "@aof/specification-by-example"
      And each discovery fragment's body is a file under that package's "assets/fragments/discovery"
      And core's refine source holds the marker for "contract.discovery" where the beat stood

    Scenario: E7 · the build brief is declared by core's own bundle
      When the bundle's descriptor is read
      Then it declares the practice "build-brief", keyed on "work.plan.enabled", contributed by core
      And its one fragment fills "contract.brief" of the refine command

    Scenario Outline: each slot of the first move is in the Claude source and in the Codex text
      When the member "<member>" is loaded
      Then its common source and its Codex texts both carry the slot "<slot>"

      Examples:
        | member            | slot                 |
        | refine            | contract.discovery   |
        | refine            | contract.formulation |
        | refine            | contract.brief       |
        | refine            | autonomous.milestone |
        | refine            | output.autonomous    |
        | aof-product-owner | ownership.examples   |
        | aof-architect     | ownership.examples   |
        | aof-qa            | ownership.examples   |

    Scenario: the Codex entry carries one slot of its own
      When the member "refine" is loaded
      Then its Codex entry carries the slot "entry.rules"
      And its common source does not

    Scenario: every discovery fragment has a body for Claude and a body for Codex
      When the discovery fragments are listed
      Then each one that fills a slot of a common source has a common body and a Codex body
      And the one that fills "entry.rules" has a Codex body alone

    Scenario: the package is a registered practice
      When the practices registry is read
      Then it holds "@aof/learning" and then "@aof/specification-by-example"
      And "@aof/work" still imports nothing from either

    Scenario: the practice's assets ride the payload and the packaged binary
      When the package asset manifest is generated
      Then it lists the specification-by-example package's bundle fragment and each of its fragment files

    Scenario: the package's README says what it ships and what turns it on
      When "packages/specification-by-example/README.md" is read
      Then it names the practice "discovery" and its key
      And it says the prose is given only to a project that has turned the key on and run "aof work update"
      And it points at "wiki/reference/practice-prose.md" for how a fragment is written
