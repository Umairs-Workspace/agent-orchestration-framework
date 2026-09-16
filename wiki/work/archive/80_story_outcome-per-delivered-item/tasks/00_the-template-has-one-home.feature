@docs @assets @scaffold @distribution
Feature: The OUTCOME.md template ships once, filed under no type, and the milestone copy is deleted on update

  THE BOUNDARY IS THE FILING, AND NOTHING ELSE. `src/bundle/templates/milestone/OUTCOME.md` opens
  `# NN · <Item Title> — Outcome`, its own comment reads *"what this item now delivers"*, and it
  carries no identity frontmatter because it is never a record doc. Not one line of it is
  milestone-shaped. What scopes it to milestones is the directory it sits in — and that directory is
  load-bearing, because `templateOutputPath` (`src/work-bundle.mjs:195`) renders every template file
  to `.aof/templates/work/<member-id>/<file>`. Move the member, move the scope.

  ONE COPY, NEVER ONE PER TYPE. The grammar this file pins is read by exactly one parser
  (`parseOutcome`, `src/memory/local-indexing.mjs`) against exactly one pinned shape. Three per-type
  copies would be three sources for a single grammar, and the first one to gain a heading the parser
  does not know is a silent zero-record outcome for that type. So the member's id names the PROPERTY
  — type-agnostic — not a type: `shared`.

  NOTHING TREATS `.aof/templates/work/*` AS A TYPE LIST. Measured while authoring this contract: the
  only reader that joins a type onto that path is `insert-shared.mjs:183`, and it indexes BY type out
  of `DOCS_BY_TYPE` rather than listing the directory. `OUTCOME.md` is deliberately absent from
  `DOCS_BY_TYPE` (39/ADR-004 — authored at Accept, never at insert), so a member id that is not a
  type collides with nothing.

  THE OLD PATH IS DELETED, NOT ORPHANED — WHICH IS THE DIFFERENCE BETWEEN A MOVE AND A FORK. Every
  existing install carries `.aof/templates/work/milestone/OUTCOME.md` recorded in its lock.
  `planApplyActions` classifies `delete` by comparing the desired outputs against that prior lock
  (`src/work-update.mjs:103`), so a member that leaves the render is removed. Asserted here because a
  surviving copy would be a second, un-updated source of the grammar in every repo that ever ran
  `aof work init`.

  THE ARTIFACT STAYS UNBUDGETED — A DECISION, NOT AN OMISSION. `BUDGET_KEY`
  (`src/work-doctor-budget.mjs`) covers `SPEC.md`, `ARCHITECTURE.md`, `STORY.md` and `*.feature`.
  `OUTCOME.md` is in none of them and gains no budget kind here. A story's second Accept-time artifact
  therefore adds no `doc-over-budget` finding; it RELIEVES the one 73 and 74 already fire, by giving
  delivered-state somewhere to live other than `STORY.md`.

  @executable
  Scenario: the OUTCOME template is declared exactly once, under a member that is not a work-item type
    Given the bundle descriptor
    When I read its template members
    Then exactly one declared member's directory contains a file named "OUTCOME.md"
    And that member's id is not the id of any work-item type
    And no per-type template directory on disk contains an OUTCOME.md

  @executable
  Scenario: the rendered template lands at the type-agnostic path, marker-stamped
    Given the canonical bundle render
    When I read the output whose file is "OUTCOME.md"
    Then its path is ".aof/templates/work/shared/OUTCOME.md"
    And its content is the source bytes with the leading `<!-- aof-generated: bundle -->` marker prepended
    And stripping that marker yields the source bytes unchanged
    And no rendered output path is ".aof/templates/work/milestone/OUTCOME.md"

  # The move must not touch the grammar — parseOutcome and every fixture in the 39 suite read it.
  @executable
  Scenario Outline: the shipped grammar is byte-identical across the move
    Given the shipped OUTCOME template at its new home
    When I read <what>
    Then it is <expected>

    Examples:
      | what                                    | expected                                             |
      | its first content line                  | "# NN · <Item Title> — Outcome"                       |
      | its frontmatter                         | absent — the file opens on no `---` fence            |
      | its top-level headings in document order| "## Delivered", "## Assumptions", "## Gaps"          |
      | its Delivered placeholder heading       | "### <Capability name>"                              |
      | its Gaps entry fields                   | "- **Status:**" and "- **Discharge condition:**"     |

  # The type-agnostic claim made checkable: the template's own text names no work-item type.
  @executable
  Scenario: the template's prose names no work-item type
    Given the shipped OUTCOME template
    When I search its text for the work-item type names
    Then none of "milestone", "story", "chore", "spike" or "uat" appears
    And it refers to its subject as "this item"

  @executable
  Scenario: an existing install's milestone-filed copy is deleted rather than left beside the new one
    Given an initialised repo whose install lock records ".aof/templates/work/milestone/OUTCOME.md"
    When I run "aof work update"
    Then the plan carries a delete action for ".aof/templates/work/milestone/OUTCOME.md"
    And a create action for ".aof/templates/work/shared/OUTCOME.md"
    And after apply the milestone-filed copy is absent from disk
    And the rewritten lock records the new path and not the old
    And re-running "aof work update" reports skip for the new path and plans no further delete

  @executable
  Scenario: membership and the shipped manifest stay complete across the move
    Given the bundle root and the bundle descriptor
    When I compare the declared-member file set against the files on disk
    Then the two sets are equal — no undeclared file, no declared member missing
    And the shipped manifest carries exactly one entry whose path ends in "/OUTCOME.md"
    And regenerating the manifest reproduces the shipped file byte-for-byte

  # The doc-budget decision, stated as a check so a later reader cannot mistake it for an oversight.
  @executable
  Scenario Outline: an OUTCOME.md is unbudgeted, whatever type carries it
    Given a <type> whose OUTCOME.md is 400 lines
    When I run "aof work doctor" over it
    Then no "doc-over-budget" finding is anchored at that OUTCOME.md

    Examples:
      | type      |
      | milestone |
      | story     |
      | chore     |

  @executable
  Scenario: the budgeted artifact kinds are unchanged by this story
    Given the resolved doctor budgets
    When I read which artifact filenames map to a budget kind
    Then they are exactly "SPEC.md", "ARCHITECTURE.md", "STORY.md" and any "*.feature"
    And "OUTCOME.md" maps to no budget kind
