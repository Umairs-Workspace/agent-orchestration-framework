Feature: Recall shows a record's origin in every projection and never scores it

  WHY. An agent that recalls a lesson or an ADR should be able to open the PRD behind it without
  searching (178 SPEC). The block is pasted into agent context by the prompts, so a record with no
  origin must render exactly as before, and the source must stay the last field. `origin` is a new
  field in the frozen record shape, so the index version moves in lockstep on both backends, and a
  store built before it reports stale until an ingest (178/ADR-002).

  THE FIXTURE: as task 00. Milestone "178" declares "origin: wiki/planning/PRD-memory-engine.md"
  and holds ADR-001 "aof memory is the canonical route"; milestone "41" declares no origin and holds
  ADR-001 "pin line endings". Both are ingested before each scenario.

  Rule: R3 · Origin is shown and never scored

    @executable @cli @work @memory
    Scenario Outline: E10 · the block line carries origin before its source
      When "aof memory recall \"canonical route\" --item 178 --block" runs on the "<backend>" backend
      Then the line for ADR-001 reads "ADR-001 (m178) · adr · architecture · aof memory is the canonical route · origin wiki/planning/PRD-memory-engine.md · <its source>"

      Examples:
        | example | backend  |
        | E10     | local    |
        | E10     | graphify |

    @executable @cli @work @memory
    Scenario: two origins are joined in declared order, and tags stay before them
      Given milestone "62"'s lesson R1 carries tags ["recurring"] and origin ["wiki/planning/PRD-acd-loop-engineering.md", "wiki/planning/PRD-graph-engineering.md"]
      When its block line is rendered
      Then it ends " · [recurring] · origin wiki/planning/PRD-acd-loop-engineering.md; wiki/planning/PRD-graph-engineering.md · <its source>"

    @executable @cli @work @memory
    Scenario: E11 · a record with no origin renders byte for byte as before
      When "aof memory recall \"pin line endings\" --item 41 --block" runs
      Then the line for ADR-001 is byte-identical to the line the same record rendered before this story
      And it holds no " · origin "

    @executable @cli @work @memory
    Scenario: the text view adds one origin line after the source line
      When "aof memory recall \"canonical route\" --item 178" runs
      Then the line after ADR-001's "↳ <its source>" line reads "    ↳ origin wiki/planning/PRD-memory-engine.md"
      And ADR-001 of milestone "41" has no origin line

    @executable @cli @work @memory
    Scenario: the json projection carries origin as stored
      When "aof memory recall \"canonical route\" --item 178 --json" runs
      Then the ADR-001 record's "origin" is ["wiki/planning/PRD-memory-engine.md"]
      And every record in the array carries an "origin" array

    @executable @cli @work @memory
    Scenario: E12 · origin changes no ranking
      Given the ranked ids "aof memory recall \"memory\" --json --all" answered over the stream with every origin stripped
      When the same query runs over the stream with origins carried
      Then the ranked ids and scores are identical
      And a query naming only "PRD-memory-engine" matches no record by its origin

    @executable @cli @work @memory
    Scenario: no scope filters on origin
      When "aof memory recall x --origin wiki/planning/PRD-memory-engine.md" runs
      Then it is refused as an undeclared flag

  Rule: R4 · The record shape grows by one field under an index-version bump

    @executable @cli @work @memory
    Scenario: E13 · the versions move in lockstep
      Then the local INDEX_VERSION and GRAPHIFY_INDEX_VERSION are both 4
      And MEMORY_RECORD_FIELDS includes "origin"
      And every record the existing parsers emit carries exactly MEMORY_RECORD_FIELDS

    @executable @cli @work @memory
    Scenario Outline: E14 · a version-3 store is stale until an ingest, and its records read as having no origin
      Given a "<backend>" store written at version 3 whose records carry no "origin"
      When "aof memory status --json" runs
      Then "index" reports version 3, current 4, stale true
      And "aof memory recall \"pin line endings\" --block" renders the line it rendered before this story
      And after "aof memory ingest" status reports version 4 and not stale

      Examples:
        | backend  |
        | local    |
        | graphify |
