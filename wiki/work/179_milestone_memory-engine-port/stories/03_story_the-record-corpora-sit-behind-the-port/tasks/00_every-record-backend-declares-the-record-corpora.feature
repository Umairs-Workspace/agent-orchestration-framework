Feature: Every record backend declares the record corpora, and none of them declares code

  WHY. The work stream, imported milestones and operator auto-memory all live in the one derived
  index, built only from the parser leaves (05/ADR-001, ADR-005; 13/ADR-003; 159). A record backend
  says so through the port's declaration. Declaring `code` or `relations` would let the port route an
  edge question to a record store. And no backend that serves `code` may declare `recall`, because
  records never come from an engine. 05/ADR-003's frozen interface gains exactly one key for this,
  and its control is amended to say so (179/ADR-003, FF-17902).

  @executable @cli @adapter @memory
  Scenario: every backend the registry holds exports exactly the amended interface
    When each backend in the memory backend registry is loaded
    Then each default export's keys are exactly "name", "corpora", "recall", "reindex" and "status"
    And "recall", "reindex" and "status" are functions

  @executable @cli @adapter @memory
  Scenario: every registry backend declares the shared record corpora
    When each backend in the memory backend registry is loaded
    Then its "corpora" is the shared record declaration: "work", "operator" and "imports", each served with "ingest", "recall" and "status"
    And it declares neither the corpus "code" nor the verb "relations"

  @executable @cli @adapter @memory
  Scenario: each registry backend composes into a port without a construction error
    When a port is composed over each registry backend in turn
    Then every composition succeeds
    And each port answers relations of "a.mjs" with code "corpus-unserved"

  @executable @cli @adapter @memory
  Scenario: memory off is served and empty, never unserved
    Given a project whose config declares no "memory" object
    When "aof memory recall \"anything\" --json" runs
    Then it exits 0
    And stdout is "[]"

  @executable @cli @adapter @memory
  Scenario: FF-17902 fails when a registry backend drops its declaration
    Given the "none" backend's default export is edited to omit "corpora"
    When the amended "acd-memory-backend-interface" control runs
    Then it fails naming the "none" backend and "corpora"
