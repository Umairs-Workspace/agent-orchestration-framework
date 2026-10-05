@executable @cli @work @memory
Feature: Status reports blank and non-enum counts per field, and the block line shows a record's tags

  WHY. A vocabulary hold is a ratchet only if its count is visible. ADR-004 has status report, per
  field, how many lessons carry a blank or non-vocabulary value, and how many gaps carry a
  non-vocabulary status. ADR-003 has the "--block" line an agent reads carry a record's tags, with an
  untagged line byte-identical to today's, so the five-field shape every reader knows is unchanged
  for most records.

  Rule: R2 · Status reports blank and non-enum counts per field

    Scenario: E4 · Kind conformance counts the blank and the non-vocabulary
      Given an ingested store whose lessons carry Kind "near-miss", "blind spot" and ""
      When "aof work memory status --json" runs
      Then its "conformance.kind" is {"blank": 1, "nonEnum": 1}

    Scenario: E5 · gap status conformance counts the non-vocabulary
      Given an ingested store whose gaps carry status "open", "discharged" and "pending"
      When "aof work memory status --json" runs
      Then its "conformance.gapStatus" is {"nonEnum": 1}

    Scenario: E6 · Owner reports blanks only
      Given an ingested store whose lessons carry Owner "developer", "the operator" and ""
      When "aof work memory status --json" runs
      Then its "conformance.owner" is {"blank": 1}

    Scenario Outline: Area and Stage are counted the same way
      Given an ingested store whose lessons carry <field> values <values>
      When "aof work memory status --json" runs
      Then its "conformance.<key>" is <counts>

      Examples:
        | field | values                           | key   | counts                       |
        | Area  | "process", "testing", ""        | area  | {"blank": 1, "nonEnum": 1}   |
        | Stage | "build", "continue", "review"   | stage | {"blank": 0, "nonEnum": 2}   |

    Scenario: the text view adds one conformance line
      Given an ingested store whose lessons carry Kind "near-miss", "blind spot" and ""
      When "aof work memory status" runs
      Then a line begins "conformance:" and names kind blank 1 and non-enum 1

    Scenario: conformance adds no top-level number to status
      When "aof work memory status --json" runs over any ingested store
      Then "conformance", "types" and "layers" are objects
      And the top-level numeric fields still sum, less "recordCount", to "recordCount"

  Rule: R3 · The block shows a record's tags, and an untagged record's line does not change

    Scenario: E7 · a tagged lesson's line carries its tags before its source
      Given a recalled lesson m40/R3 with kind "near-miss", area "memory/accounting", title "Adding a new record KIND obliges updating every consumer that partitions records by kind — memory status was left counting only lessons+adrs", tags ["cross-milestone, discovered here"] and source "archive/40_milestone_work-item-versioning-upgrade/RETROSPECTIVE.md:28"
      When the recall is rendered with "--block"
      Then its line is "R3 (m40) · near-miss · memory/accounting · Adding a new record KIND obliges updating every consumer that partitions records by kind — memory status was left counting only lessons+adrs · [cross-milestone, discovered here] · archive/40_milestone_work-item-versioning-upgrade/RETROSPECTIVE.md:28"

    Scenario: E8 · an untagged record's line is unchanged, at five fields
      Given a recalled lesson m01/R2 with kind "near-miss", tags [] and source "archive/01_milestone_acd-asset-bundle/RETROSPECTIVE.md:27"
      When the recall is rendered with "--block"
      Then its line has exactly 5 " · "-separated fields
      And it is "R2 (m01) · near-miss · architecture · Content-addressed artifacts must pin line endings or cross-platform CI hashes diverge · archive/01_milestone_acd-asset-bundle/RETROSPECTIVE.md:27"

    Scenario: E9 · a gap's discharge tag reaches its line
      Given a recalled gap with tags ["by story 86, 2026-09-04"]
      When the recall is rendered with "--block"
      Then its line's second-to-last field is "[by story 86, 2026-09-04]"
      And its last field is its source

    Scenario: two tags are joined by a semicolon
      Given a recalled lesson with tags ["recurring", "caught at review"]
      When the recall is rendered with "--block"
      Then its line's second-to-last field is "[recurring; caught at review]"

    Scenario: a record from a store before version 2 renders untagged
      Given a recalled record that carries no "tags" field
      When the recall is rendered with "--block"
      Then its line has exactly 5 " · "-separated fields
