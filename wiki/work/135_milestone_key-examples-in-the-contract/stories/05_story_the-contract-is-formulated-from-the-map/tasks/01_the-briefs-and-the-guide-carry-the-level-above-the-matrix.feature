@executable @docs @work @planning
Feature: The PO and QA briefs and the acceptance-criteria guide carry the level above the matrix

  WHY. The refine passage (task 00) is read once per refine. The briefs are what a spawned PO or QA
  agent actually holds, and the guide is where a person learns the doctrine (ADR-006 §2, §3). Each
  gets only its own half: the PO the rules and headlines, QA the tables under them, and the guide
  the level above its three zoom levels, with one Gherkin specimen. None of them restates the map's
  grammar, which the `EXAMPLES.md` template keeps as its one teacher (134/05).

  Rule: R1 · Each brief carries its own half of map-driven formulation

    Scenario Outline: a brief carries its half and no other
      When the bundle source "<brief>" is read
      Then it says <its half>
      And it does not restate a line of the map's grammar

      Examples:
        | brief                                            | its half                                                                     |
        | packages/core/assets/agents/aof-product-owner.md | with an applicable map, it writes a Rule: per map rule and a headline per key example |
        | packages/core/assets/agents/aof-qa.md            | its tables sit inside the rule they test, with an example column on a row that restates a map example |

    Scenario Outline: each rendered brief matches a fresh render
      When "aof work update --dry-run --json" is run from the repository root
      Then "<copy>" is reported as "skip"

      Examples:
        | copy                                  |
        | .claude/agents/aof-product-owner.md   |
        | .codex/agents/aof-product-owner.md    |
        | .opencode/agents/aof-product-owner.md |
        | .claude/agents/aof-qa.md              |
        | .codex/agents/aof-qa.md               |
        | .opencode/agents/aof-qa.md            |

  Rule: R2 · The guide names the key examples as the level above the matrix

    Scenario: E2 · the guide makes a key example the headline and the matrix the edges
      When "wiki/acceptance-criteria.md" is read
      Then its section before the zoom levels says the map's key examples are the headline scenarios
      And it says the Examples tables cover the edges
      And it says a map row restated in a table stays the headline, and the table keeps only the edges

    Scenario: the guide shows a rule as a Rule: block in one specimen
      When "wiki/acceptance-criteria.md" is read
      Then it holds one Gherkin specimen with a "Rule:" titled by a rule id, a headline scenario titled by an example id, and an outline with an "example" column
      And the specimen parses with no structural finding
      And the package's id readers read the rule id and both example ids from it
