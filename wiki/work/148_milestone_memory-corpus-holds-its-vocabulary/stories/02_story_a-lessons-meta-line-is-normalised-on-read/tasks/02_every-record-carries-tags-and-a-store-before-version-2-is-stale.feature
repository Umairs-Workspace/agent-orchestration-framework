@executable @cli @work @memory
Feature: Every record carries tags under index version 2, and a store built before it is read and reported stale

  WHY. ADR-003 adds "tags" to the frozen MemoryRecord as an array, present on every record and
  never omitted, and moves both index versions from 1 to 2. The index is derived, so there is no
  migration: an ingest rebuilds it. Until then, a version-1 store must still answer recall, and
  "status" must say an ingest is owed rather than report numbers from the old shape as if they were
  current.

  THE FIXTURE BELOW: a temp stream holding milestone "39" with an ARCHITECTURE.md ("## ADR-001:
  Delivery records reuse the frozen MemoryRecord"), an OUTCOME.md (one delivered capability, one gap
  "open") and a RETROSPECTIVE.md (R1 with Kind "near-miss (recurring)"), built under an isolated
  "AOF_GLOBAL_HOME".

  Rule: R4 · Every record carries tags, and a store built before index version 2 is reported stale

    Scenario: E12 · every record carries a tags array
      When the records are built
      Then every record carries the field "tags" as an array
      And the ADR, capability and gap records carry tags []
      And the lesson carries tags ["recurring"]
      And "MEMORY_RECORD_FIELDS" names "tags"

    Scenario: both index versions are 2
      When the local backend reindexes, and then the graphify backend
      Then each written store's "version" is 2
      And "INDEX_VERSION" and "GRAPHIFY_INDEX_VERSION" are both 2

    Scenario: E13 · a version-1 store whose records carry no tags still answers recall
      Given a graphify store written with "version" 1 whose records carry no "tags" field
      When "recall" runs the query "delivery records reuse" over it
      Then it returns the ADR record without failing

    Scenario Outline: E14 · each backend reports a version-1 store as stale
      Given a <backend> store written with "version" 1
      When "aof work memory status --json" runs with backend "<backend>"
      Then its "index" is {"version": 1, "current": 2, "stale": true}
      And "aof work memory status" prints a line naming "aof work memory ingest"

      Examples:
        | backend  |
        | local    |
        | graphify |

    Scenario Outline: E15 · each backend reports a version-2 store as current
      Given a <backend> store written by a reindex at version 2
      When "aof work memory status --json" runs with backend "<backend>"
      Then its "index" is {"version": 2, "current": 2, "stale": false}
      And "aof work memory status" prints no line naming "aof work memory ingest"

      Examples:
        | backend  |
        | local    |
        | graphify |

    Scenario: the stale block adds no top-level number to status
      Given a local store written by a reindex at version 2
      When "aof work memory status --json" runs
      Then the top-level numeric fields of the result are only "recordCount" and the per-type counts
      And those per-type counts sum to "recordCount"
